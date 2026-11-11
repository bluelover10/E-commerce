import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import OrderTracking from "../components/order/OrderTracking";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { formatPrice } from "../utils/format";

const STATUS_FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"];

const STATUS_CHIP = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipped: "info",
  out_for_delivery: "info",
  delivered: "success",
  cancelled: "danger",
  returned: "neutral",
};

function OrderDetails() {
  const { orderId } = useParams();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let alive = true;
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/orders/${orderId}`);
        if (alive) setOrder(response.data.order || response.data);
      } catch (e) {
        if (alive) setError(e.response?.data?.message || "Failed to load this order");
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchOrder();
    return () => {
      alive = false;
    };
  }, [orderId]);

  const currentStepIndex = order ? STATUS_FLOW.indexOf(order.orderStatus) : -1;
  const isCancelled = order?.orderStatus === "cancelled";
  const isReturned = order?.orderStatus === "returned";

  const statusClass = STATUS_CHIP[order?.orderStatus] || "neutral";

  const handleCancel = async () => {
    setConfirmCancel(false);
    try {
      setCancelling(true);
      const response = await api.put(`/orders/${orderId}/cancel`);
      setOrder(response.data.order || response.data);
      showToast("Order cancelled", "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to cancel order", "error");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="gradient-mesh flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-3 border-transparent"
            style={{ borderTopColor: "var(--accent)", borderRightColor: "var(--accent)" }}
            role="status"
            aria-label="Loading order"
          />
          <p className="text-muted text-sm">Loading your order…</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="gradient-mesh flex min-h-[70vh] items-center justify-center px-4 py-16">
        <ErrorState
          message={error || "Order not found"}
          onRetry={() => navigate("/dashboard/orders")}
        />
      </div>
    );
  }

  return (
    <div className="gradient-mesh min-h-screen py-10 sm:py-14">
      <div className="container-narrow">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              to="/dashboard/orders"
              className="text-muted mb-2 inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
              My orders
            </Link>
            <h1 className="section-title">Order details</h1>
            <p className="text-muted mt-1.5 font-mono text-sm">
              #{order._id.slice(-12).toUpperCase()}
              <span className="mx-2 opacity-40">·</span>
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <span className={`status-chip ${statusClass}`}>{order.orderStatus.replace(/_/g, " ")}</span>
        </div>

        {/* ── Live tracking (socket-updated component) ───────────────────── */}
        <div className="mb-8">
          <OrderTracking orderId={orderId} />
        </div>

        {/* ── Status timeline unless it's a cancelled/returned one-shot ──── */}
        {!isCancelled && !isReturned ? (
          <div
            className="mb-10 rounded-2xl p-6 sm:p-8"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="mb-6 font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Progress
            </h2>
            <div className="relative flex items-center justify-between" aria-hidden="true">
              {/* connector line */}
              <div
                className="absolute left-5 right-5 top-5 h-0.5 -z-0"
                style={{ background: "var(--border)" }}
              />
              <div
                className="absolute left-5 top-5 h-0.5 -z-0 transition-all duration-700"
                style={{
                  background: "var(--accent)",
                  width: `calc(${(currentStepIndex / (STATUS_FLOW.length - 1)) * 100}% - ${
                    (currentStepIndex / (STATUS_FLOW.length - 1)) * 2.5
                  }rem)`,
                  minWidth: currentStepIndex > 0 ? "0" : "0%",
                }}
              />
              {STATUS_FLOW.map((step, idx) => {
                const done = idx <= currentStepIndex;
                return (
                  <div key={step} className="relative z-10 flex flex-col items-center">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all"
                      style={{
                        background: done ? "var(--accent)" : "var(--surface)",
                        color: done ? "var(--bg)" : "var(--muted)",
                        border: done ? "none" : "2px solid var(--border)",
                        boxShadow: done ? "0 4px 14px var(--glow)" : "none",
                      }}
                    >
                      {done ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`mt-2 whitespace-nowrap text-[11px] font-medium capitalize sm:text-xs ${
                        done ? "" : "text-muted"
                      }`}
                    >
                      {step.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          (isCancelled || isReturned) && (
            <div
              className="mb-10 rounded-2xl p-6 text-sm"
              style={{
                background: isCancelled ? "var(--danger-soft)" : "var(--info-soft)",
                border: `1px solid ${isCancelled ? "color-mix(in srgb, var(--danger) 25%, transparent)" : "color-mix(in srgb, var(--info) 25%, transparent)"}`,
                color: isCancelled ? "var(--danger-ink)" : "var(--info-ink)",
              }}
            >
              <p className="font-semibold capitalize">
                This order was {isCancelled ? "cancelled" : "returned"}.
              </p>
              <p className="mt-1 opacity-80">
                {isCancelled
                  ? order.cancelReason || "Cancelled by customer."
                  : order.returnReason || "Return requested."}{" "}
                {order.stockRestored && isCancelled && "Items are back in stock."}
              </p>
            </div>
          )
        )}

        {/* ── Items ──────────────────────────────────────────────────────── */}
        <div
          className="mb-8 rounded-2xl p-6 sm:p-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="mb-5 font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Items ({order.items.length})
          </h2>
          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 rounded-xl p-4"
                style={{ background: "color-mix(in srgb, var(--accent) 4%, transparent)" }}
              >
                {item.image ? (
                  <img
                    src={item.image?.url || item.image}
                    alt={item.name}
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-xl opacity-40"
                    style={{ background: "var(--border)" }}
                    aria-hidden="true"
                  >
                    🎁
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{item.name}</h3>
                  <p className="text-muted text-sm">
                    Qty {item.quantity}
                    {item.variant?.name ? ` · ${item.variant.name}` : ""}
                  </p>
                </div>
                <p className="font-bold">{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Address & Payment ───────────────────────────────────────────── */}
        <div className="mb-8 grid gap-8 md:grid-cols-2">
          <div
            className="rounded-2xl p-6 sm:p-8"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="mb-4 font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Shipping address
            </h2>
            <div className="text-muted space-y-1 text-sm">
              <p className="font-semibold" style={{ color: "var(--ink)" }}>
                {order.shippingAddress?.name}
              </p>
              <p>{order.shippingAddress?.street}</p>
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state}
              </p>
              <p>
                {order.shippingAddress?.zipCode}, {order.shippingAddress?.country}
              </p>
              <p className="mt-2">{order.shippingAddress?.phone}</p>
            </div>
          </div>

          <div
            className="rounded-2xl p-6 sm:p-8"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="mb-4 font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Payment
            </h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              {order.discount > 0 && (
                <div
                  className="flex justify-between font-medium"
                  style={{ color: "var(--success-ink)" }}
                >
                  <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                  <span>−{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>
                <span>{order.shippingCost === 0 ? "Free" : formatPrice(order.shippingCost)}</span>
              </div>
              <div
                className="flex justify-between border-t pt-2.5 text-base font-bold"
                style={{ borderColor: "var(--border)" }}
              >
                <span>Total</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
              <div
                className="border-t pt-3 text-xs"
                style={{ borderColor: "var(--border)" }}
              >
                <p className="flex items-center justify-between gap-2">
                  <span className="text-muted capitalize">
                    Method: {order.paymentMethod?.replace("_", " ")}
                  </span>
                  <span
                    className={`status-chip ${STATUS_CHIP[order.paymentStatus] || "neutral"} !px-2 !py-0.5`}
                    style={{ fontSize: "10px" }}
                  >
                    {order.paymentStatus}
                  </span>
                </p>
                {order.paymentDetails?.transactionId && (
                  <p className="mt-2 break-all">
                    <span className="text-muted font-semibold">Transaction:</span>{" "}
                    <span className="font-mono text-[11px]">
                      {order.paymentDetails.transactionId}
                    </span>
                  </p>
                )}
                {order.paymentDetails?.refundStatus && (
                  <p
                    className="mt-1.5"
                    style={{ color: "var(--warning-ink)" }}
                  >
                    Refund status:{" "}
                    <span className="font-semibold capitalize">
                      {order.paymentDetails.refundStatus}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tracking id ────────────────────────────────────────────────── */}
        {order.trackingId && (
          <div
            className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5"
            style={{
              background: "var(--info-soft)",
              border: "1px solid color-mix(in srgb, var(--info) 25%, transparent)",
            }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--info-ink)" }}>
                Courier tracking ID
              </p>
              <p className="mt-0.5 font-mono text-base font-bold">{order.trackingId}</p>
            </div>
          </div>
        )}

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate("/dashboard/orders")} className="btn-ghost btn-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to orders
          </button>
          <button onClick={() => navigate(`/order/${order._id}/invoice`)} className="btn-outline btn-sm icon-nudge">
            View invoice
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </button>
          {/* Only ever show the button for states the server allows cancelling:
              pending / confirmed / processing — shipped+ orders can't be cancelled */}
          {["pending", "confirmed", "processing"].includes(order.orderStatus) && (
            <button
              onClick={() => setConfirmCancel(true)}
              disabled={cancelling}
              className="btn-danger btn-sm disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel order"}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this order?"
        message="Your items will be returned to stock and any online payment will be refunded. This can't be undone."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}

export default OrderDetails;
