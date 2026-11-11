const crypto = require("crypto");
const Order = require("../models/Order");
const Product = require("../models/Product");
const PaymentDraft = require("../models/PaymentDraft");
const { getProvider } = require("../services/payment/paymentFactory");
const { sendEmail, emailTemplates } = require("../config/email");
// computeDiscountOf delegates to the coupon service — the single source of
// truth for discount rules (min order, max cap, subtotal clamp) so the
// gateway path can never drift from COD/legacy/validate behaviour.
const { consumeCoupon, releaseCoupon, computeDiscount: computeDiscountOf } = require("../services/couponService");
const { decrementStock, restoreStock } = require("../services/stockService");

// Fire-and-forget order email (never blocks order creation)
const notifyOrderPlaced = async (userId, order) => {
  try {
    const User = require("../models/User");
    const u = await User.findById(userId).select("name email");
    if (!u?.email) return;
    await sendEmail({ to: u.email, ...emailTemplates.orderPlaced(u.name || "Customer", order) });
  } catch (e) {
    console.error("Order-placed email failed:", e.message);
  }
};

// Client-input problems (bad payload, unknown product, stock shortfall) are
// 4xx — without an explicit statusCode the outer catch surfaced them as 500.
const clientInputError = (message) => {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
};

// ─── Helper: Resolve secure items with DB prices (prevents price tampering) ──
const resolveSecureItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw clientInputError("Cart is empty");
  }
  const secure = [];
  for (const item of items) {
    const productId = item.product || item._id;
    if (!productId) throw clientInputError(`Invalid item: ${item.name || "unknown"}`);
    const qty = Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1));
    const product = await Product.findById(productId).select("name price image stock vendor");
    if (!product) throw clientInputError(`Product not found: ${item.name || productId}`);
    secure.push({
      product: product._id,
      vendor: product.vendor || null,
      name: product.name,
      price: product.price, // always DB price
      quantity: qty,
      image: product.image || item.image,
      variant: item.variant || undefined,
    });
  }
  return secure;
};

// ─── Helper: Compute order totals ────────────────────────────────────────────
const computeTotals = (items, couponDiscount = 0) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = Math.round(subtotal * 0.18);
  const shippingCost = subtotal > 500 ? 0 : 50;
  const discount = Math.min(couponDiscount, subtotal); // cannot discount more than subtotal
  const totalAmount = subtotal + tax + shippingCost - discount;
  return { subtotal, tax, shippingCost, discount, totalAmount };
};

// ─── Helper: Validate stock (pre-check before payment) ──────────────────────
const validateStock = async (items) => {
  for (const item of items) {
    if (!item.product) continue;
    const product = await Product.findById(item.product).select("stock name");
    if (!product) throw clientInputError(`Product not found: ${item.name}`);
    if (product.stock < item.quantity) {
      throw clientInputError(
        `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`
      );
    }
  }
};

// ─── Helper: Group items into per-vendor sub-orders ──────────────────────────
const buildSubOrders = (items) => {
  const byV = {};
  for (const it of items) {
    const k = (it.vendor || "platform").toString();
    if (!byV[k]) byV[k] = [];
    byV[k].push(it);
  }
  return Object.entries(byV)
    .filter(([k]) => k !== "platform" && k !== "null")
    .map(([vendorId, vItems]) => ({
      vendor: vendorId,
      items: vItems.map((i) => ({ product: i.product, name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
      subtotal: vItems.reduce((s, i) => s + i.price * i.quantity, 0),
      status: "confirmed",
    }));
};

// ─── 1. Create Razorpay Order ─────────────────────────────────────────────────
// Called before opening Razorpay Checkout. Creates the gateway order AND a
// server-side draft carrying the exact totals/items the client is paying for.
// The coupon is consumed (reserved) here; /payment/verify later builds the DB
// order strictly from this draft — client inputs are never re-trusted.
const createRazorpayOrder = async (req, res) => {
  try {
    const { items, shippingAddress, billingAddress, couponCode } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Use DB prices — never trust client price
    const normalizedItems = await resolveSecureItems(items);

    // Validate stock before creating order
    await validateStock(normalizedItems);

    // Compute totals BEFORE consuming the coupon (min-order check)
    const preSubtotal = normalizedItems.reduce((s, i) => s + i.price * i.quantity, 0);

    // Atomically reserve the coupon so concurrent checkouts can't over-use it
    let coupon = null;
    if (couponCode) {
      coupon = await consumeCoupon(couponCode, req.user.id, preSubtotal);
      if (!coupon) {
        return res.status(400).json({ message: "Coupon is invalid, expired, or already used" });
      }
    }

    const totals = computeTotals(normalizedItems, coupon ? computeDiscountOf(coupon, preSubtotal) : 0);

    // Amount in paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(totals.totalAmount * 100);

    if (amountInPaise < 100) {
      if (coupon) await releaseCoupon(coupon.code, req.user.id);
      return res.status(400).json({ message: "Order amount is too small" });
    }

    let razorpayOrder;
    try {
      const provider = getProvider(process.env.PAYMENT_PROVIDER || "razorpay");
      const created = await provider.createOrder({
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: { userId: req.user.id, itemCount: normalizedItems.length },
      });
      razorpayOrder = { id: created.providerOrderId, amount: created.amount, currency: created.currency };
      if (created.clientSecret) razorpayOrder.clientSecret = created.clientSecret;
    } catch (e) {
      if (coupon) await releaseCoupon(coupon.code, req.user.id);
      // SECURITY/UX: never forward the gateway's own HTTP status. Razorpay
      // answers 401 for invalid keys — if we passed that through, the client's
      // axios interceptor treats 401 as "session expired" and logs the user
      // out in the middle of checkout. All gateway failures normalize to 503.
      console.error(
        "Gateway createOrder failed:",
        e.statusCode || e.name || "",
        e.message || e.error?.description || e
      );
      const deliberate = e.statusCode === 503; // thrown by the provider itself
      const isKeyLevel = e.statusCode === 401 || e.statusCode === 403;
      if (deliberate || isKeyLevel) {
        // Machine-readable flag the client keys its demo fallback off of.
        return res.status(503).json({
          code: "PAYMENTS_NOT_CONFIGURED",
          message: "Online payments are not configured on this server. Please use Cash on Delivery.",
        });
      }
      // Transient upstream outage — genuine gateway error, no demo fallback.
      return res.status(503).json({
        message: "Payment gateway is temporarily unavailable. Please try again or use Cash on Delivery.",
      });
    }

    // Persist the draft — verifyPayment binds the order to it
    const draft = await PaymentDraft.create({
      user: req.user.id,
      providerOrderId: razorpayOrder.id,
      amountInPaise,
      items: normalizedItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      couponCode: coupon?.code,
      couponDiscount: coupon ? computeDiscountOf(coupon, preSubtotal) : 0,
      totals,
      status: "created",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      totals,
      couponDiscount: draft.couponDiscount,
      couponCode: coupon ? coupon.code : null,
      draftId: draft._id,
    });
  } catch (error) {
    // Input problems throw 400s (clientInputError); anything else is a real
    // server fault — but never leak raw driver/SDK messages to the client.
    const status = error.statusCode || 500;
    const message =
      status === 500
        ? "Failed to create payment order. Please try again."
        : error.message;
    res.status(status).json({ message });
  }
};

// ─── 2. Verify Payment & Create DB Order ──────────────────────────────────────
// Called AFTER Razorpay Checkout succeeds on the frontend.
// The order is built ONLY from the server-side draft, never from the body.
const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: "Missing payment verification fields" });
    }

    // ── Locate the server-side draft (totals/items/coupon live here) ────────
    const draft = await PaymentDraft.findOne({ providerOrderId: razorpayOrderId });
    if (!draft) {
      return res.status(404).json({ success: false, message: "No matching order draft found" });
    }
    if (String(draft.user) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Not authorized for this payment" });
    }
    if (draft.status === "used") {
      return res.status(409).json({ success: false, message: "This payment was already processed" });
    }
    if (draft.status !== "created" || new Date(draft.expiresAt).getTime() < Date.now()) {
      draft.status = "expired";
      await draft.save().catch(() => {});
      return res.status(400).json({ success: false, message: "Order draft expired. Please retry checkout." });
    }

    // ── Signature Verification ──────────────────────────────────────────────
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature.",
      });
    }

    // Amount actually charged must equal the drafted total
    if (draft.amountInPaise !== Math.round(draft.totals.totalAmount * 100)) {
      return res.status(400).json({ success: false, message: "Amount mismatch — order draft corrupted" });
    }

    // Reserve the draft so this payment can only ever create one order
    draft.status = "used";
    await draft.save({ validateBeforeSave: false });

    const normalizedItems = draft.items;
    const totals = draft.totals;

    // Create the DB order from the DRAFT — never from client input
    const order = new Order({
      user: req.user.id,
      items: normalizedItems,
      subOrders: buildSubOrders(normalizedItems),
      statusHistory: [{ status: "confirmed", note: "Payment verified", by: req.user.id }],
      shippingAddress: draft.shippingAddress,
      billingAddress: draft.billingAddress || draft.shippingAddress,
      paymentMethod: "upi",
      paymentStatus: "completed",
      paymentDetails: {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      },
      orderStatus: "confirmed",
      subtotal: totals.subtotal,
      tax: totals.tax,
      shippingCost: totals.shippingCost,
      discount: totals.discount,
      totalAmount: totals.totalAmount,
      couponCode: draft.couponCode,
      couponDiscount: draft.couponDiscount,
    });

    try {
      await order.save();
    } catch (saveError) {
      // Payment captured but order row failed — this must never be silent
      console.error("Order save failed after payment:", saveError.message);
      return res.status(500).json({
        success: false,
        message: "Payment captured but order could not be saved. Our team has been notified to refund this payment.",
      });
    }

    // Atomic stock decrement (prevents oversell). Failure AFTER a captured
    // payment surfaces a refund flow instead of silently losing the order.
    try {
      await decrementStock(normalizedItems);
    } catch (stockError) {
      order.orderStatus = "cancelled";
      order.cancelledAt = new Date();
      order.cancelReason = "Out of stock after payment — refund initiated";
      order.paymentDetails = { ...order.paymentDetails, refundStatus: "initiated" };
      order.statusHistory.push({
        status: "cancelled",
        note: `Payment captured but stock unavailable — refund initiated to customer`,
        by: null,
      });
      await order.save().catch(() => {});
      await releaseCoupon(draft.couponCode, req.user.id).catch(() => {});

      try {
        const { pushNotification } = require("../services/socketService");
        await pushNotification({
          user: req.user.id,
          type: "payment",
          title: "Refund initiated",
          message: `We couldn't fulfil order ${order._id} — your payment will be refunded.`,
          link: `/order/${order._id}`,
        });
      } catch { /* best-effort */ }

      return res.status(200).json({
        success: false,
        order,
        refundInitiated: true,
        message: "Payment captured, but the item went out of stock. A refund has been initiated.",
      });
    }

    notifyOrderPlaced(req.user.id, order);

    try {
      const { pushNotification, emitToAdmins, emitToVendor } = require("../services/socketService");
      await pushNotification({ user: req.user.id, type: "payment", title: "Payment successful", message: `Order ${order._id} confirmed.`, link: `/order/${order._id}` });
      emitToAdmins("order:created", { orderId: order._id, total: order.totalAmount });
      const vendorIds = [...new Set(normalizedItems.map((i) => i.vendor?.toString()).filter(Boolean))];
      for (const vid of vendorIds) {
        emitToVendor(vid, "order:created", { orderId: order._id });
        const Vendor = require("../models/Vendor");
        const v = await Vendor.findById(vid).select("user");
        if (v?.user) await pushNotification({ user: v.user, type: "order", title: "New order received", message: `Order ${order._id} includes your products.`, link: `/vendor/orders` });
      }
    } catch { /* best-effort */ }

    res.status(201).json({ success: true, order });
  } catch (error) {
    const status = error.statusCode || 500;
    const message =
      status === 500
        ? "Payment verification failed. Please try again."
        : error.message;
    res.status(status).json({ success: false, message });
  }
};

// ─── 3. Cash On Delivery Order ───────────────────────────────────────────────
// COD orders bypass the gateway entirely. Payment is "pending" until delivery.
const createCODOrder = async (req, res) => {
  try {
    const { items, shippingAddress, billingAddress, couponCode } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Use DB prices — never trust client price
    const normalizedItems = await resolveSecureItems(items);
    await validateStock(normalizedItems);

    const preSubtotal = normalizedItems.reduce((s, i) => s + i.price * i.quantity, 0);

    // Atomically reserve the coupon
    let coupon = null;
    if (couponCode) {
      coupon = await consumeCoupon(couponCode, req.user.id, preSubtotal);
      if (!coupon) {
        return res.status(400).json({ message: "Coupon is invalid, expired, or already used" });
      }
    }

    const totals = computeTotals(normalizedItems, coupon ? computeDiscountOf(coupon, preSubtotal) : 0);

    // Stock first, order second; roll back stock if the save fails
    try {
      await decrementStock(normalizedItems);
    } catch (stockError) {
      if (coupon) await releaseCoupon(coupon.code, req.user.id);
      return res.status(400).json({ success: false, message: stockError.message });
    }

    const order = new Order({
      user: req.user.id,
      items: normalizedItems,
      subOrders: buildSubOrders(normalizedItems),
      statusHistory: [{ status: "confirmed", note: "COD order placed", by: req.user.id }],
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod: "cod",
      paymentStatus: "pending",
      orderStatus: "confirmed",
      subtotal: totals.subtotal,
      tax: totals.tax,
      shippingCost: totals.shippingCost,
      discount: totals.discount,
      totalAmount: totals.totalAmount,
      couponCode: coupon ? coupon.code : null,
      couponDiscount: coupon ? computeDiscountOf(coupon, preSubtotal) : 0,
    });

    try {
      await order.save();
    } catch (saveError) {
      await restoreStock(normalizedItems);
      if (coupon) await releaseCoupon(coupon.code, req.user.id);
      return res.status(500).json({ success: false, message: "Failed to save COD order" });
    }

    notifyOrderPlaced(req.user.id, order);

    try {
      const { emitToAdmins, emitToVendor, pushNotification } = require("../services/socketService");
      emitToAdmins("order:created", { orderId: order._id, total: order.totalAmount });
      const vendorIds = [...new Set(normalizedItems.map((i) => i.vendor?.toString()).filter(Boolean))];
      for (const vid of vendorIds) {
        emitToVendor(vid, "order:created", { orderId: order._id });
        const Vendor = require("../models/Vendor");
        const v = await Vendor.findById(vid).select("user");
        if (v?.user) await pushNotification({ user: v.user, type: "order", title: "New order received", message: `Order ${order._id} includes your products.`, link: `/vendor/orders` });
      }
      await pushNotification({ user: req.user.id, type: "order", title: "Order confirmed", message: `Order ${order._id} placed successfully.`, link: `/order/${order._id}` });
    } catch { /* realtime is best-effort */ }

    res.status(201).json({ success: true, order });
  } catch (error) {
    const status = error.statusCode || 500;
    const message =
      status === 500
        ? "Failed to create COD order. Please try again."
        : error.message;
    res.status(status).json({ success: false, message });
  }
};

// ─── 4. Razorpay Payment Failure Handler ─────────────────────────────────────
// Checkout dismissed or payment failed: release the reserved coupon and cancel
// the draft so it can't be verified later.
const handlePaymentFailure = async (req, res) => {
  try {
    const { razorpayOrderId } = req.body;
    if (razorpayOrderId) {
      const draft = await PaymentDraft.findOne({ providerOrderId: razorpayOrderId });
      if (draft && draft.status === "created") {
        draft.status = "cancelled";
        await draft.save().catch(() => {});
        if (draft.couponCode) {
          await releaseCoupon(draft.couponCode, draft.user).catch(() => {});
        }
      }
    }
    console.warn(`Payment failed for Razorpay order: ${razorpayOrderId}`);
    res.json({ success: false, message: "Payment failed. No order was created." });
  } catch (err) {
    res.status(500).json({ message: "Failed to process payment failure" });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  createCODOrder,
  handlePaymentFailure,
};
