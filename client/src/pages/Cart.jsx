import { useContext, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatPrice } from "../utils/format";
import api from "../services/api";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";

/**
 * Load the Razorpay Checkout script once (cached promise).
 */
let razorpayPromise = null;
const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (!razorpayPromise) {
    razorpayPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Razorpay failed to load"));
      document.body.appendChild(script);
    });
  }
  return razorpayPromise;
};

function Cart() {
  const { cart, removeFromCart, updateQuantity, clearCart, getCartTotal } =
    useContext(CartContext);
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [orderLoading, setOrderLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    name: user?.name || "",
    street: "",
    city: "",
    state: "",
    country: "India",
    zipCode: "",
    phone: user?.phone || "",
  });
  const [paymentMethod, setPaymentMethod] = useState("online");

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Simulated (demo) checkout modal — shown only when the server has no
  // payment gateway configured (503 from /payment/create-order).
  const [demoModal, setDemoModal] = useState(null); // null | { total, stage: "confirm" | "processing" }

  // Pre-payment confirmation — no gateway is opened until the user confirms
  // here (same pattern as the Cancel-order dialog on OrderDetails).
  const [confirmPayOpen, setConfirmPayOpen] = useState(false);

  const subtotal = getCartTotal();
  const tax = Math.round(subtotal * 0.18);
  const shipping = subtotal > 500 ? 0 : 50;
  // Server now embeds discountAmount in the coupon (and clamps it to the
  // subtotal); Number()||0 keeps this resilient to any legacy/absent shape.
  const discountAmount = appliedCoupon
    ? Math.min(Number(appliedCoupon.discountAmount) || 0, subtotal)
    : 0;
  const total = Math.max(0, subtotal + tax + shipping - discountAmount);

  // Pre-fill the default saved address if there is one
  useEffect(() => {
    if (!user?.addresses?.length) return;
    const def = user.addresses.find((a) => a.isDefault) || user.addresses[0];
    setShippingAddress((prev) => ({
      ...prev,
      name: def.name || prev.name,
      street: def.street || prev.street,
      city: def.city || prev.city,
      state: def.state || prev.state,
      country: def.country || prev.country,
      zipCode: def.zipCode || prev.zipCode,
      phone: def.phone || prev.phone,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  if (cart.length === 0) {
    return (
      <div className="gradient-mesh flex min-h-[70vh] items-center justify-center px-4 py-20">
        <EmptyState
          icon="🛍"
          title="Your bag is empty"
          message="Discover something extraordinary — curated finds are waiting."
          action={
            <Link to="/products" className="btn-primary btn-sm">
              Start shopping
            </Link>
          }
        />
      </div>
    );
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setCouponLoading(true);
      const res = await api.post("/coupons/validate", {
        code: couponCode,
        orderAmount: subtotal,
      });
      setAppliedCoupon(res.data.coupon);
      showToast("Coupon applied successfully!", "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Invalid coupon", "error");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = ({ silentOnSuccess = true } = {}) => {
    const required = {
      name: "Full name",
      street: "Street address",
      city: "City",
      state: "State",
      zipCode: "PIN code",
      phone: "Phone number",
    };
    for (const key in required) {
      if (!shippingAddress[key]?.trim()) {
        showToast(`Please enter your ${required[key]}`, "error");
        return false;
      }
    }
    if (!/^\d{6}$/.test(shippingAddress.zipCode.trim())) {
      showToast("Please enter a valid 6-digit PIN code", "error");
      return false;
    }
    if (!/^\+?\d{10,12}$/.test(shippingAddress.phone.trim().replace(/\s/g, ""))) {
      showToast("Please enter a valid phone number", "error");
      return false;
    }
    return true;
  };

  const normalizedItems = cart.map((item) => ({
    product: item._id,
    quantity: item.quantity,
  }));
  const payloadBase = () => ({
    items: normalizedItems,
    shippingAddress,
    billingAddress: shippingAddress,
    couponCode: appliedCoupon ? appliedCoupon.code : undefined,
  });

  // ── Simulated demo checkout (fallback when no gateway is configured) ───────
  // The server generates its own SIM- transaction id; nothing fake is trusted.
  const runSimulatedCheckout = async () => {
    try {
      setDemoModal((m) => ({ ...m, stage: "processing" }));
      const response = await api.post("/orders", {
        ...payloadBase(),
        paymentMethod: "upi",
      });
      setDemoModal(null);
      showToast("Demo order placed — no real money charged!", "success");
      clearCart();
      navigate(`/order/${response.data.order._id}`);
    } catch (error) {
      setDemoModal(null);
      showToast(error.response?.data?.message || "Order failed", "error");
    } finally {
      setOrderLoading(false);
    }
  };

  // ── Online payment: Razorpay first, simulated fallback ─────────────────────
  const handleOnlineCheckout = async () => {
    setOrderLoading(true);
    try {
      // Server re-prices everything and holds the coupon atomically.
      const res = await api.post("/payment/create-order", payloadBase());
      const { razorpayOrderId, amount, currency, keyId } = res.data;
      if (!razorpayOrderId || !keyId) throw Object.assign(new Error("not-configured"), { notConfigured: true });

      await loadRazorpay();

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "Ghost Panda",
        description: `Order · ${cart.length} item${cart.length !== 1 ? "s" : ""}`,
        order_id: razorpayOrderId,
        prefill: {
          name: shippingAddress.name,
          email: user?.email,
          contact: shippingAddress.phone.replace(/\s/g, ""),
        },
        theme: { color: "#c9a962" },
        modal: {
          ondismiss: () => {
            api.post("/payment/failure", { razorpayOrderId }).catch(() => {});
            setOrderLoading(false);
            showToast("Payment window closed — your cart is intact", "info");
          },
        },
        handler: async (response) => {
          try {
            const verify = await api.post("/payment/verify", {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            const orderId = verify.data?.order?._id;
            clearCart();
            if (verify.data?.refundInitiated) {
              showToast("Item went out of stock — a refund has been initiated", "warning");
              navigate(`/order/${orderId}`);
            } else {
              showToast("Payment successful — thank you!", "success");
              navigate(`/order/${orderId}`);
            }
          } catch (e) {
            setOrderLoading(false);
            if (e.response?.status === 409) {
              showToast("This payment was already processed — check your orders", "info");
              navigate("/dashboard/orders");
            } else {
              showToast(e.response?.data?.message || "Payment verification failed", "error");
            }
          }
        },
      });
      rzp.open();
    } catch (error) {
      // Server flags an unusable/unconfigured gateway with this code on a 503;
      // transient upstream outages arrive without it and stay a plain error.
      const isNotConfigured =
        error.response?.data?.code === "PAYMENTS_NOT_CONFIGURED";
      if (isNotConfigured) {
        // Demo fallback — clearly-labelled simulated checkout, real server order
        setDemoModal({ total, stage: "confirm" });
        return;
      }
      showToast(error.response?.data?.message || "Could not start payment", "error");
      setOrderLoading(false);
    }
  };

  // ── COD ───────────────────────────────────────────────────────────────────
  const handleCodCheckout = async () => {
    setOrderLoading(true);
    try {
      const response = await api.post("/payment/cod", payloadBase());
      showToast("Order placed! Pay on delivery.", "success");
      clearCart();
      navigate(`/order/${response.data.order._id}`);
    } catch (error) {
      showToast(error.response?.data?.message || "Order failed", "error");
      setOrderLoading(false);
    }
  };

  const handleCheckoutClick = () => {
    if (!user) {
      showToast("Please sign in to checkout", "info");
      navigate("/login");
      return;
    }
    if (!validate()) return;
    if (paymentMethod === "cod") {
      handleCodCheckout();
      return;
    }
    // Online payment starts ONLY after the confirmation dialog is accepted —
    // clicking the button merely opens the centered confirmation.
    setConfirmPayOpen(true);
  };

  const itemLabel = `${cart.length} item${cart.length !== 1 ? "s" : ""}`;

  return (
    <div className="gradient-mesh min-h-screen py-10 sm:py-16">
      <div className="container-narrow">
        <h1 className="section-title mb-2">Your bag</h1>
        <p className="text-muted mb-10">{itemLabel}</p>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* ── Items ──────────────────────────────────────────────────── */}
          <div className="space-y-4 lg:col-span-2">
            {cart.map((item, idx) => (
              <div
                key={item._id}
                className="hover-lift flex gap-4 rounded-2xl p-4 sm:p-6"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  animationDelay: `${idx * 0.05}s`,
                }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  className="h-24 w-24 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28"
                />
                <div className="flex flex-1 flex-col justify-between sm:flex-row sm:items-center">
                  <div>
                    <h3
                      className="font-semibold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {item.name}
                    </h3>
                    <p className="text-muted mt-1 text-sm">
                      {formatPrice(item.price)} each
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-4 sm:mt-0">
                    <div
                      className="flex items-center rounded-full"
                      style={{ border: "1px solid var(--border)" }}
                      role="group"
                      aria-label={`Change quantity of ${item.name}`}
                    >
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="micro-press px-3 py-2 text-lg"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span
                        className="min-w-[2rem] text-center text-sm font-medium"
                        aria-live="polite"
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="micro-press px-3 py-2 text-lg"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <p className="min-w-[80px] text-right font-bold">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                    <button
                      onClick={() => {
                        removeFromCart(item._id);
                        showToast("Item removed", "info");
                      }}
                      className="text-muted text-sm transition-colors hover:opacity-70"
                      style={{ color: "var(--danger)" }}
                      aria-label={`Remove ${item.name} from bag`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Coupon */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <h2 className="mb-3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                Apply coupon
              </h2>
              {!appliedCoupon ? (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleApplyCoupon();
                  }}
                >
                  <input
                    type="text"
                    placeholder="Coupon code"
                    aria-label="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="input-field flex-1"
                  />
                  <button
                    type="submit"
                    disabled={couponLoading || !couponCode}
                    className="btn-accent btn-sm px-6 disabled:opacity-50"
                  >
                    {couponLoading ? "Applying…" : "Apply"}
                  </button>
                </form>
              ) : (
                <div
                  className="flex items-center justify-between rounded-lg p-3"
                  style={{
                    background: "var(--success-soft)",
                    border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)",
                  }}
                >
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--success-ink)" }}
                    >
                      {appliedCoupon.code}
                    </p>
                    <p className="text-xs" style={{ color: "var(--success-ink)" }}>
                      −{formatPrice(discountAmount)} discount applied
                    </p>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs hover:underline"
                    style={{ color: "var(--danger)" }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Summary */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <h2
                className="mb-4 font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Order summary
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Tax (18%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Shipping</span>
                  <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
                </div>
                {appliedCoupon && (
                  <div
                    className="flex justify-between font-medium"
                    style={{ color: "var(--success-ink)" }}
                  >
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>−{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div
                  className="flex justify-between border-t pt-3 text-lg font-bold"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
              {subtotal < 500 && subtotal > 0 && (
                <p className="text-muted mt-3 text-xs">
                  Add {formatPrice(500 - subtotal)} more for free shipping
                </p>
              )}
            </div>

            {/* Delivery */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <h2
                className="mb-4 font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Delivery
              </h2>
              <div className="space-y-3">
                {[
                  { key: "name", placeholder: "Full name", autoComplete: "name" },
                  { key: "street", placeholder: "Street address", autoComplete: "street-address" },
                  { key: "city", placeholder: "City", autoComplete: "address-level2" },
                  { key: "state", placeholder: "State", autoComplete: "address-level1" },
                  { key: "zipCode", placeholder: "PIN code", autoComplete: "postal-code" },
                  { key: "phone", placeholder: "Phone", type: "tel", autoComplete: "tel" },
                ].map((f) => (
                  <div key={f.key}>
                    <label
                      htmlFor={`addr-${f.key}`}
                      className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted"
                    >
                      {f.placeholder}
                    </label>
                    <input
                      id={`addr-${f.key}`}
                      type={f.type || "text"}
                      placeholder={f.placeholder}
                      autoComplete={f.autoComplete}
                      value={shippingAddress[f.key]}
                      onChange={(e) =>
                        setShippingAddress({
                          ...shippingAddress,
                          [f.key]: e.target.value,
                        })
                      }
                      className="input-field"
                    />
                  </div>
                ))}
                {user?.addresses?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const def = user.addresses.find((a) => a.isDefault) || user.addresses[0];
                      setShippingAddress((prev) => ({ ...prev, ...def }));
                      showToast("Saved address applied", "info");
                    }}
                    className="btn-ghost btn-sm w-full"
                  >
                    Use a saved address
                  </button>
                )}
              </div>
            </div>

            {/* Payment method */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <h2
                className="mb-4 font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Payment
              </h2>
              <div className="space-y-3" role="radiogroup" aria-label="Payment method">
                {[
                  {
                    id: "online",
                    title: "Pay online",
                    desc: "UPI, cards & more via secure checkout",
                    icon: "⚡",
                  },
                  {
                    id: "cod",
                    title: "Cash on delivery",
                    desc: "Pay in cash when your order arrives",
                    icon: "💵",
                  },
                ].map((opt) => {
                  const active = paymentMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setPaymentMethod(opt.id)}
                      className="micro-press flex w-full items-center gap-3 rounded-xl p-3.5 text-left transition-all"
                      style={{
                        border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        background: active
                          ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                          : "transparent",
                      }}
                    >
                      <span className="text-xl" aria-hidden="true">{opt.icon}</span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold">{opt.title}</span>
                        <span className="block text-xs text-muted">{opt.desc}</span>
                      </span>
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                        style={{
                          border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        }}
                        aria-hidden="true"
                      >
                        {active && (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: "var(--accent)" }}
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleCheckoutClick}
              disabled={orderLoading}
              className="btn-accent w-full py-4 text-base disabled:opacity-60"
            >
              {orderLoading
                ? "Processing…"
                : `Checkout · ${formatPrice(total)}`}
            </button>
            <Link to="/products" className="btn-outline block w-full text-center">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>

      {/* ── Pre-payment confirmation (payment starts only on confirm) ─────── */}
      <ConfirmDialog
        open={confirmPayOpen}
        title="Confirm your payment"
        message={`You're about to pay ${formatPrice(total)} for ${itemLabel} via secure online checkout. You can still cancel from the payment window.`}
        confirmLabel={`Pay ${formatPrice(total)} now`}
        cancelLabel="Go back"
        onConfirm={() => {
          setConfirmPayOpen(false);
          handleOnlineCheckout();
        }}
        onCancel={() => setConfirmPayOpen(false)}
      />

      {/* ── Simulated demo checkout modal (fallback only) ─────────────────── */}
      {demoModal && (
        <div
          className="payment-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Demo checkout"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && demoModal.stage === "confirm") {
              setDemoModal(null);
              setOrderLoading(false);
            }
          }}
        >
          <div className="payment-modal-container !max-w-md relative p-7 text-center">
            <span
              className="status-chip warning absolute right-6 top-6"
              title="Simulated payment — no real money"
            >
              demo
            </span>

            <p
              className="text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: "var(--accent-hover)" }}
            >
              Demo checkout
            </p>
            <h3
              className="mt-1.5 text-xl font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {demoModal.stage === "confirm"
                ? "Simulated payment"
                : "Processing your order…"}
            </h3>
            <p className="text-muted mx-auto mt-2 max-w-xs text-sm leading-relaxed">
              {demoModal.stage === "confirm"
                ? "Online payments aren't configured on this server, so this checkout runs in demo mode — no real money is charged, but the order is real."
                : "Confirming inventory and placing your order securely."}
            </p>

            {demoModal.stage === "processing" ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="relative mb-6 h-20 w-20">
                  <div
                    className="absolute inset-0 rounded-full border-4 opacity-20"
                    style={{ borderColor: "var(--accent)" }}
                  />
                  <div
                    className="absolute inset-0 animate-spin rounded-full border-4 border-transparent"
                    style={{ borderTopColor: "var(--accent)", borderRightColor: "var(--accent)" }}
                  />
                </div>
                <p className="text-muted animate-pulse text-sm">
                  Placing order for {itemLabel}…
                </p>
              </div>
            ) : (
              <>
                <div
                  className="mt-6 flex items-center justify-between rounded-xl px-5 py-4"
                  style={{
                    background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                  }}
                >
                  <span className="text-sm text-muted">Amount (demo)</span>
                  <span className="text-lg font-bold">{formatPrice(demoModal.total)}</span>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setDemoModal(null);
                      setOrderLoading(false);
                    }}
                    className="btn-outline flex-1 py-3"
                  >
                    Go back
                  </button>
                  <button
                    onClick={runSimulatedCheckout}
                    className="btn-accent flex-1 py-3"
                  >
                    Pay now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;
