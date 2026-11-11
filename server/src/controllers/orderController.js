const crypto = require("crypto");
const logger = require("../config/logger");
const Order = require("../models/Order");
const Product = require("../models/Product");
const PDFDocument = require("pdfkit");
const { sendEmail, emailTemplates } = require("../config/email");
const { consumeCoupon, computeDiscount, releaseCoupon } = require("../services/couponService");
const { decrementStock, restoreStock } = require("../services/stockService");

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

const notifyStatusUpdated = async (order) => {
  try {
    const User = require("../models/User");
    const u = await User.findById(order.user).select("name email");
    if (!u?.email) return;
    await sendEmail({ to: u.email, ...emailTemplates.orderStatusUpdated(u.name || "Customer", order) });
  } catch (e) {
    console.error("Status-update email failed:", e.message);
  }
};

// ─── Helper: Resolve secure items with DB prices (prevents price tampering) ──
const resolveSecureItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cart is empty");
  }
  const secure = [];
  for (const item of items) {
    const productId = item.product || item._id;
    if (!productId) throw new Error(`Invalid item: ${item.name || "unknown"}`);
    const qty = Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1));
    const product = await Product.findById(productId).select("name price image stock vendor");
    if (!product) throw new Error(`Product not found: ${item.name || productId}`);
    secure.push({
      product: product._id,
      vendor: product.vendor || null,
      name: product.name,
      price: product.price,
      quantity: qty,
      image: product.image || item.image,
      variant: item.variant || undefined,
    });
  }
  return secure;
};

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

// ─── Create Order (legacy / simulated-demo path) ──────────────────────────────
// NOTE: Real online payments go through /api/payment (Razorpay). This endpoint
// serves COD + the simulated "demo gateway" checkout used when Razorpay keys
// are not configured. SECURITY: client `paymentDetails` are ignored — the
// server generates its own transaction id, prices come from the DB.
const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, billingAddress, paymentMethod, paymentDetails, couponCode: bodyCouponCode } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const method = paymentMethod === "cod" ? "cod" : paymentMethod || "upi";

    const normalizedItems = [];
    for (const item of items) {
      const productId = item.product || item._id;
      if (!productId) {
        return res.status(400).json({ message: `Invalid item: ${item.name || "unknown"}` });
      }
      const qty = Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1));
      const dbProduct = await Product.findById(productId).select("name price image stock vendor");
      if (!dbProduct) {
        return res.status(404).json({ message: `Product not found: ${item.name || productId}` });
      }
      if (dbProduct.stock < qty) {
        return res.status(400).json({
          message: `Insufficient stock for "${dbProduct.name}". Available: ${dbProduct.stock}, Requested: ${qty}`
        });
      }
      normalizedItems.push({
        product: dbProduct._id,
        vendor: dbProduct.vendor || null,
        name: dbProduct.name,
        price: dbProduct.price,
        quantity: qty,
        image: dbProduct.image || item.image,
        variant: item.variant || undefined
      });
    }

    const subtotal = normalizedItems.reduce((s, i) => s + i.price * i.quantity, 0);

    // Coupon support (legacy path used by Cart) — atomic consumption
    let appliedCoupon = null;
    if (bodyCouponCode) {
      appliedCoupon = await consumeCoupon(bodyCouponCode, req.user.id, subtotal);
      if (!appliedCoupon) {
        return res.status(400).json({ message: "Coupon is invalid, expired, or already used" });
      }
    }

    const couponDiscount = appliedCoupon ? Math.min(computeDiscount(appliedCoupon, subtotal), subtotal) : 0;
    const tax = Math.round(subtotal * 0.18);
    const shippingCost = subtotal > 500 ? 0 : 50;
    const discount = couponDiscount;
    const totalAmount = subtotal + tax + shippingCost - discount;

    const isCOD = method === "cod";
    // Simulated online payments (no gateway configured on this server) are
    // marked completed with a server-generated transaction id so demo
    // checkouts behave like real ones end-to-end without faking COD.
    const isSimulated = !isCOD;
    const transactionId = isSimulated
      ? `SIM-${crypto.randomBytes(6).toString("hex").toUpperCase()}`
      : undefined;

    // Stock first, then order; roll back on save failure
    try {
      await decrementStock(normalizedItems);
    } catch (stockError) {
      if (appliedCoupon) await releaseCoupon(appliedCoupon.code, req.user.id);
      return res.status(400).json({ success: false, message: stockError.message });
    }

    const order = new Order({
      user: req.user.id,
      items: normalizedItems,
      subOrders: buildSubOrders(normalizedItems),
      statusHistory: [{ status: "confirmed", note: "Order placed", by: req.user.id }],
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod: method,
      paymentStatus: isCOD ? "pending" : "completed",
      // Legacy "card"/"upi" forms still push into paymentDetails — sanitize to
      // only the fields the schema knows; client-supplied transactionIds are
      // dropped and replaced by our SIM- id.
      paymentDetails: {
        transactionId,
        cardBrand: paymentDetails?.cardBrand,
        last4: paymentDetails?.last4,
        upiId: paymentDetails?.upiId,
        walletProvider: paymentDetails?.walletProvider,
        bankCode: paymentDetails?.bankCode,
      },
      subtotal,
      tax,
      shippingCost,
      discount,
      couponCode: appliedCoupon?.code || null,
      couponDiscount,
      totalAmount,
      orderStatus: "confirmed"
    });

    try {
      await order.save();
    } catch (saveError) {
      await restoreStock(normalizedItems);
      if (appliedCoupon) await releaseCoupon(appliedCoupon.code, req.user.id);
      return res.status(500).json({ success: false, message: "Order creation failed" });
    }

    notifyOrderPlaced(req.user.id, order);

    // Realtime: notify admins + each vendor with items in this order
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
    res.status(500).json({ message: "Order creation failed", error: error.message });
  }
};

// ─── Get User Orders ──────────────────────────────────────────────────────────
// Default shape is a plain array (backwards compatible). Optional ?page&limit
// returns a paginated envelope { orders, total, page, pages }.
const getUserOrders = async (req, res) => {
  try {
    const paginated = req.query.page || req.query.limit;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const skip = (page - 1) * limit;

    const baseQuery = Order.find({ user: req.user.id })
      .populate("items.product", "name image price")
      .sort({ createdAt: -1 });

    if (!paginated) {
      const orders = await baseQuery.limit(200); // hard cap guards memory
      return res.json(orders);
    }

    const [orders, total] = await Promise.all([
      baseQuery.skip(skip).limit(limit),
      Order.countDocuments({ user: req.user.id })
    ]);
    res.json({ orders, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
};

// ─── Get Order Details ────────────────────────────────────────────────────────
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate("user", "name email phone role")
      .populate("items.product", "name image price category");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Owner or admin can view
    const User = require("../models/User");
    const requester = await User.findById(req.user.id).select("role");
    const isAdmin = requester?.role === "admin";
    const ownerId = order.user?._id?.toString() || order.user?.toString();
    if (!isAdmin && ownerId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch order", error: error.message });
  }
};

// ─── Update Order Status (Admin) ──────────────────────────────────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, trackingId, estimatedDelivery } = req.body;

    const validStatuses = [
      "pending", "confirmed", "processing", "shipped",
      "out_for_delivery", "delivered", "cancelled", "returned"
    ];

    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.orderStatus === orderStatus) {
      return res.status(400).json({ message: `Order is already ${orderStatus}` });
    }

    const updateData = { orderStatus };
    if (trackingId !== undefined) updateData.trackingId = trackingId;

    if (orderStatus === "delivered") {
      updateData.deliveredAt = new Date();
      // Mark payment as completed for COD orders on delivery
      if (order.paymentMethod === "cod" && order.paymentStatus !== "completed") {
        updateData.paymentStatus = "completed";
      }
    }

    if (orderStatus === "cancelled") {
      updateData.cancelledAt = new Date();
      if (req.body.reason) updateData.cancelReason = req.body.reason;
    }

    if (orderStatus === "returned") {
      updateData.returnedAt = new Date();
      if (req.body.reason) updateData.returnReason = req.body.reason;
    }

    if (estimatedDelivery) {
      updateData.estimatedDelivery = new Date(estimatedDelivery);
    }

    Object.assign(order, updateData);

    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({ status: orderStatus, note: "Updated by admin", by: req.user.id });

    // ── Cancellation: restore stock once + cancel open subOrders ────────────
    if (orderStatus === "cancelled" && !order.stockRestored) {
      order.stockRestored = true;
      await restoreStock(order.items).catch(() => {});
      if (order.subOrders?.length) {
        for (const s of order.subOrders) {
          if (!["delivered", "cancelled"].includes(s.status)) {
            s.status = "cancelled";
            s.updatedAt = new Date();
          }
        }
      }
    } else if (order.subOrders?.length && ["confirmed", "processing", "shipped", "out_for_delivery", "delivered", "returned"].includes(orderStatus)) {
      // Do NOT stomp sub-order state that's progressed beyond the global flag —
      // vendors manage subOrder status independently.
      const allDelivered = order.subOrders.every((s) => s.status === "delivered");
      if (orderStatus === "delivered" && allDelivered) {
        for (const s of order.subOrders) s.updatedAt = new Date();
      }
    }

    await order.save();

    // Realtime: update the buyer, admins and affected vendors
    try {
      const { emitToAdmins, emitToVendor, pushNotification } = require("../services/socketService");
      emitToAdmins("order:updated", { orderId: order._id, orderStatus });
      await pushNotification({
        user: order.user,
        type: "order",
        title: `Order ${orderStatus.replace(/_/g, " ")}`,
        message: `Your order ${order._id} is now ${orderStatus.replace(/_/g, " ")}.`,
        link: `/order/${order._id}`,
      });
      const vendorIds = [...new Set(order.subOrders?.map((s) => s.vendor?.toString()) || [])];
      for (const vid of vendorIds) {
        emitToVendor(vid, "order:updated", { orderId: order._id, orderStatus });
        const Vendor = require("../models/Vendor");
        const v = await Vendor.findById(vid).select("user");
        if (v?.user) await pushNotification({ user: v.user, type: "order", title: "Order status updated", message: `Order ${order._id} is now ${orderStatus.replace(/_/g, " ")}.`, link: `/vendor/orders` });
      }
    } catch { /* best-effort */ }

    notifyStatusUpdated(order);

    res.json({ success: true, order });
  } catch (error) {
    logger.error(`updateOrderStatus failed for order ${orderId}: ${error.message}\n${error.stack}`);
    res.status(500).json({ message: "Failed to update order", error: error.message });
  }
};

// ─── Cancel Order (customer) ─────────────────────────────────────────────────
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    // Express 5: an empty PUT body leaves req.body undefined (no longer {}).
    // The client's cancel/return dialogs send no body at all (reason optional),
    // so destructuring used to crash with a TypeError -> 500 "Failed to
    // cancel/process return" instead of actually cancelling.
    const reason = req.body?.reason;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const ownerId = order.user?._id?.toString() || order.user?.toString();
    if (ownerId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (["shipped", "out_for_delivery", "delivered"].includes(order.orderStatus)) {
      return res.status(400).json({
        message: "Cannot cancel an order that has already been shipped or delivered"
      });
    }

    if (order.orderStatus === "cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    order.orderStatus = "cancelled";
    order.cancelledAt = new Date();
    order.cancelReason = reason || "Cancelled by customer";
    // Legacy orders may lack the statusHistory array entirely — pushing into
    // undefined would crash with a TypeError (500 "Failed to cancel order").
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({ status: "cancelled", note: order.cancelReason, by: req.user.id });

    // ── Restore stock exactly once ─────────────────────────────────────────
    if (!order.stockRestored) {
      order.stockRestored = true;
      await restoreStock(order.items).catch(() => {});
    }
    if (order.subOrders?.length) {
      for (const s of order.subOrders) {
        if (!["delivered", "cancelled"].includes(s.status)) {
          s.status = "cancelled";
          s.updatedAt = new Date();
        }
      }
    }

    await order.save();

    res.json({ success: true, order });
  } catch (error) {
      logger.error(`cancelOrder failed for order ${orderId}: ${error.message}\n${error.stack}`);
      res.status(500).json({ message: "Failed to cancel order", error: error.message });
  }
};

// ─── Return Order ─────────────────────────────────────────────────────────────
const returnOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    // Express 5: an empty PUT body leaves req.body undefined (no longer {}).
    // The client's cancel/return dialogs send no body at all (reason optional),
    // so destructuring used to crash with a TypeError -> 500 "Failed to
    // cancel/process return" instead of actually cancelling.
    const reason = req.body?.reason;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const ownerId = order.user?._id?.toString() || order.user?.toString();
    if (ownerId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (order.orderStatus !== "delivered") {
      return res.status(400).json({ message: "Only delivered orders can be returned" });
    }

    // 7-day return window
    const deliveredAt = order.deliveredAt || order.updatedAt;
    const daysSinceDelivery = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 7) {
      return res.status(400).json({ message: "Return window has expired (7 days from delivery)" });
    }

    order.orderStatus = "returned";
    order.returnedAt = new Date();
    order.returnReason = reason || "Return requested by customer";
    order.paymentDetails = order.paymentDetails || {};
    order.paymentDetails.refundStatus = "initiated";
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({ status: "returned", note: order.returnReason, by: req.user.id });

    // Restore stock exactly once
    if (!order.stockRestored) {
      order.stockRestored = true;
      await restoreStock(order.items).catch(() => {});
    }
    if (order.subOrders?.length) {
      for (const s of order.subOrders) {
        if (s.status !== "cancelled") {
          s.status = "returned";
          s.updatedAt = new Date();
        }
      }
    }

    await order.save();

    res.json({ success: true, order });
  } catch (error) {
      logger.error(`returnOrder failed for order ${orderId}: ${error.message}\n${error.stack}`);
      res.status(500).json({ message: "Failed to process return", error: error.message });
  }
};

// ─── Generate Invoice PDF ─────────────────────────────────────────────────────
const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate("user", "name email phone role")
      .populate("items.product", "name price");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const User = require("../models/User");
    const requester = await User.findById(req.user.id).select("role");
    const isAdmin = requester?.role === "admin";
    const ownerId = order.user?._id?.toString() || order.user?.toString();
    if (!isAdmin && ownerId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${orderId}.pdf"`
    );

    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────────────────────
    doc.fontSize(24).font("Helvetica-Bold").text("INVOICE", { align: "right" });
    doc.fontSize(10).font("Helvetica").fillColor("#666666");
    doc.text(`Order ID: ${order._id}`, { align: "right" });
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`, { align: "right" });
    doc.moveDown();

    // ── Store Info ───────────────────────────────────────────────────────────
    doc.fillColor("#000000").fontSize(16).font("Helvetica-Bold").text("Ghost Panda");
    doc.fontSize(10).font("Helvetica").fillColor("#666666");
    doc.text("support@ghostpanda.store");
    doc.moveDown();

    // ── Divider ──────────────────────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#dddddd");
    doc.moveDown();

    // ── Billing & Shipping ───────────────────────────────────────────────────
    doc.fillColor("#000000").fontSize(11).font("Helvetica-Bold").text("BILL TO:");
    doc.font("Helvetica").fontSize(10).fillColor("#333333");
    const addr = order.shippingAddress || {};
    const userName = order.user?.name || "Customer";
    doc.text(addr.name || userName);
    doc.text([addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(", ") || "—");
    if (addr.zipCode) doc.text(`PIN: ${addr.zipCode}`);
    if (addr.phone) doc.text(`Phone: ${addr.phone}`);
    doc.moveDown();

    // ── Order Status ─────────────────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#dddddd");
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Payment Method: ${(order.paymentMethod || "").toUpperCase()}`, { continued: true });
    doc.text(`   |   Status: ${order.orderStatus.toUpperCase()}`, { align: "right" });
    doc.moveDown();

    // ── Items Table ───────────────────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#dddddd");
    doc.moveDown(0.5);

    doc.font("Helvetica-Bold").fontSize(10);
    const tableTop = doc.y;
    doc.text("Item", 50, tableTop);
    doc.text("Qty", 350, tableTop);
    doc.text("Price", 410, tableTop);
    doc.text("Total", 480, tableTop);
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#dddddd");
    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(10);
    for (const item of order.items) {
      const y = doc.y;
      const itemName = item.name || (item.product && item.product.name) || "Item";
      const itemTotal = ((item.price || 0) * (item.quantity || 0)).toFixed(2);
      doc.text(itemName, 50, y, { width: 290 });
      doc.text(String(item.quantity ?? ""), 350, y);
      doc.text(`₹${(item.price || 0).toFixed(2)}`, 410, y);
      doc.text(`₹${itemTotal}`, 480, y);
      doc.moveDown(0.8);
    }

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#dddddd");
    doc.moveDown(0.5);

    // ── Totals ────────────────────────────────────────────────────────────────
    const totalsX = 380;
    doc.font("Helvetica").fontSize(10);
    doc.text("Subtotal:", totalsX, doc.y, { continued: true });
    doc.text(`₹${(order.subtotal || 0).toFixed(2)}`, { align: "right" });
    doc.text("Tax (18% GST):", totalsX, doc.y, { continued: true });
    doc.text(`₹${(order.tax || 0).toFixed(2)}`, { align: "right" });
    doc.text("Shipping:", totalsX, doc.y, { continued: true });
    doc.text(order.shippingCost === 0 ? "Free" : `₹${(order.shippingCost || 0).toFixed(2)}`, { align: "right" });

    if (order.couponDiscount > 0) {
      doc.fillColor("#16a34a");
      doc.text(`Coupon (${order.couponCode || "discount"}):`, totalsX, doc.y, { continued: true });
      doc.text(`-₹${order.couponDiscount.toFixed(2)}`, { align: "right" });
      doc.fillColor("#000000");
    }

    doc.moveDown(0.3);
    doc.moveTo(totalsX, doc.y).lineTo(545, doc.y).stroke("#dddddd");
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("TOTAL:", totalsX, doc.y, { continued: true });
    doc.text(`₹${(order.totalAmount || 0).toFixed(2)}`, { align: "right" });

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.moveDown(3);
    doc.font("Helvetica").fontSize(9).fillColor("#999999");
    doc.text("Thank you for shopping with Ghost Panda!", { align: "center" });
    doc.text("For support: support@ghostpanda.store", { align: "center" });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: "Failed to generate invoice", error: error.message });
  }
};

// ─── Get All Orders (Admin) ───────────────────────────────────────────────────
const getAllOrders = async (req, res) => {
  try {
    const { status, limit = 10, skip = 0 } = req.query;

    let query = {};
    if (status) {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .populate("user", "name email phone")
      .populate("items.product", "name image price")
      .sort({ createdAt: -1 })
      .limit(Math.min(100, parseInt(limit, 10) || 10))
      .skip(Math.max(0, parseInt(skip, 10) || 0));

    const total = await Order.countDocuments(query);

    res.json({ orders, total });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
};

// ─── Order tracking timeline ────────────────────────────────────────────────
const getOrderTracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).select("orderStatus trackingId estimatedDelivery statusHistory subOrders user createdAt");
    if (!order) return res.status(404).json({ message: "Order not found" });
    const ownerId = order.user?.toString();
    if (ownerId !== req.user.id && req.user.role !== "admin") {
      // vendors with items in order may also track
      const Vendor = require("../models/Vendor");
      const v = await Vendor.findOne({ user: req.user.id });
      const hasItems = v && order.subOrders?.some((s) => s.vendor?.toString() === v._id.toString());
      if (!hasItems) return res.status(403).json({ message: "Not authorized" });
    }
    res.json({ success: true, data: order });
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch tracking", error: e.message });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderDetails,
  updateOrderStatus,
  cancelOrder,
  returnOrder,
  generateInvoice,
  getAllOrders,
  getOrderTracking
};
