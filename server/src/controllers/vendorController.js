const Vendor = require("../models/Vendor");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");
const escapeRegex = require("../utils/escapeRegex");
const { restoreStock } = require("../services/stockService");
const { pushNotification, emitToAdmins } = require("../services/socketService");

/**
 * POST /api/vendors/register — logged-in user opens a store.
 */
const registerVendor = asyncHandler(async (req, res) => {
  const { storeName, description, contactEmail, contactPhone, address, taxId } = req.body;
  if (!storeName) return res.status(400).json({ success: false, message: "storeName is required" });

  const existing = await Vendor.findOne({ user: req.user.id });
  if (existing) return res.status(400).json({ success: false, message: "Vendor profile already exists", data: existing });

  const vendor = await Vendor.create({
    user: req.user.id,
    storeName,
    description,
    contactEmail,
    contactPhone,
    address,
    taxId,
    status: "pending",
  });

  await User.findByIdAndUpdate(req.user.id, { role: "vendor", vendor: vendor._id });

  emitToAdmins("vendor:pending", { vendorId: vendor._id, storeName });

  res.status(201).json({ success: true, message: "Store submitted for approval", data: vendor });
});

const getMyVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user.id });
  if (!vendor) return res.status(404).json({ success: false, message: "No vendor profile" });
  res.json({ success: true, data: vendor });
});

const updateMyVendor = asyncHandler(async (req, res) => {
  const allowed = ["storeName", "description", "logo", "banner", "contactEmail", "contactPhone", "address", "taxId", "payoutDetails"];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
  const vendor = await Vendor.findOneAndUpdate({ user: req.user.id }, updates, { new: true, runValidators: true });
  if (!vendor) return res.status(404).json({ success: false, message: "No vendor profile" });
  res.json({ success: true, data: vendor });
});

/**
 * GET /api/vendors — public store listing (approved only).
 */
const listVendors = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, search } = req.query;
  const q = { status: "approved", isActive: true };
  if (search) q.storeName = { $regex: escapeRegex(search), $options: "i" };
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [vendors, total] = await Promise.all([
    Vendor.find(q).sort({ rating: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Vendor.countDocuments(q),
  ]);
  res.json({ success: true, data: vendors, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) } });
});

const getVendorBySlug = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ slug: req.params.slug, status: "approved" }).lean();
  if (!vendor) return res.status(404).json({ success: false, message: "Store not found" });
  const products = await Product.find({ vendor: vendor._id, isActive: true, approvalStatus: "approved" })
    .sort({ sales: -1 })
    .limit(24)
    .lean();
  res.json({ success: true, data: { vendor, products } });
});

/**
 * Vendor dashboard stats — sales, revenue (net of commission), orders, top products.
 */
const getVendorStats = asyncHandler(async (req, res) => {
  const vendor = req.vendor;
  const [productCount, orderCountAgg, revenueAgg, topProducts, lowStock, recentOrders] = await Promise.all([
    Product.countDocuments({ vendor: vendor._id }),
    Order.countDocuments({ "items.vendor": vendor._id }),
    Order.aggregate([
      { $match: { "items.vendor": vendor._id, orderStatus: { $nin: ["cancelled", "returned"] } } },
      { $unwind: "$items" },
      { $match: { "items.vendor": vendor._id } },
      { $group: { _id: null, gross: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }, units: { $sum: "$items.quantity" } } },
    ]),
    Product.find({ vendor: vendor._id }).sort({ sales: -1 }).limit(5).select("name price sales stock image").lean(),
    Product.find({ vendor: vendor._id, stock: { $lte: 5 } }).sort({ stock: 1 }).limit(6).select("name stock price").lean(),
    Order.find({ "items.vendor": vendor._id }).sort({ createdAt: -1 }).limit(8).select("totalAmount orderStatus paymentStatus createdAt items").lean(),
  ]);
  const gross = revenueAgg[0]?.gross || 0;
  const units = revenueAgg[0]?.units || 0;
  const net = Math.round(gross * (1 - (vendor.commissionRate || 10) / 100));
  res.json({
    success: true,
    data: { productCount, orderCount: orderCountAgg, grossRevenue: gross, netRevenue: net, unitsSold: units, commissionRate: vendor.commissionRate, topProducts, lowStock, recentOrders },
  });
});

const getVendorOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const q = { "items.vendor": req.vendor._id };
  if (status) q.orderStatus = status;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Order.countDocuments(q),
  ]);
  // Trim items to this vendor's items for privacy
  const scoped = orders.map((o) => ({ ...o, items: o.items.filter((i) => i.vendor?.toString() === req.vendor._id.toString()) }));
  res.json({ success: true, data: scoped, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) } });
});

const updateVendorOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, trackingId } = req.body;
  const allowed = ["confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"];
  if (!allowed.includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });
  const order = await Order.findOne({ _id: orderId, "items.vendor": req.vendor._id });
  if (!order) return res.status(404).json({ success: false, message: "Order not found for this vendor" });

  // Update matching subOrder if present, else global status
  let touched = false;
  let cancelledCount = 0;
  if (order.subOrders?.length) {
    for (const s of order.subOrders) {
      if (s.vendor?.toString() === req.vendor._id.toString()) {
        const prev = s.status;
        if (prev === status) continue; // idempotent
        s.status = status;
        if (trackingId) s.trackingId = trackingId;
        s.updatedAt = new Date();
        touched = true;
        if (status === "cancelled" && prev !== "returned") cancelledCount++;
      }
    }
  }
  if (!touched) {
    if (status === "cancelled" && ["shipped", "out_for_delivery", "delivered"].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: "Order already shipped — cannot cancel" });
    }
    if (status === "cancelled" && !order.stockRestored) {
      order.stockRestored = true;
      await restoreStock(order.items.filter((i) => i.vendor?.toString() === req.vendor._id.toString()));
    }
    order.orderStatus = status;
    if (trackingId) order.trackingId = trackingId;
    touched = true;
  }

  // Vendor cancelling their sub-order restores only THEIR stock — global
  // `stockRestored` is set by the admin route when the whole order is cancelled.
  if (cancelledCount && !order.stockRestored) {
    const sub = order.subOrders.find((s) => s.vendor?.toString() === req.vendor._id.toString());
    if (sub) await restoreStock(sub.items);
  }

  // Legacy orders may lack the statusHistory array entirely — guard before push.
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({ status, note: `Updated by ${req.vendor.storeName}`, by: req.user.id });
  await order.save();

  await pushNotification({
    user: order.user,
    type: "order",
    title: `Order ${status.replace(/_/g, " ")}`,
    message: `Your order from ${req.vendor.storeName} is now ${status}.`,
    link: `/order/${order._id}`,
  });

  res.json({ success: true, data: order });
});

// ── Admin: approve / reject / list ──────────────────────────────────────────
const adminListVendors = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const q = {};
  if (status) q.status = status;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [vendors, total] = await Promise.all([
    Vendor.find(q).populate("user", "name email").sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Vendor.countDocuments(q),
  ]);
  res.json({ success: true, data: vendors, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) } });
});

const adminReviewVendor = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const { action, rejectionReason, commissionRate } = req.body; // action: approve|reject|suspend
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

  if (action === "approve") vendor.status = "approved";
  else if (action === "reject") {
    vendor.status = "rejected";
    vendor.rejectionReason = rejectionReason || "Did not meet requirements";
  } else if (action === "suspend") vendor.status = "suspended";
  else return res.status(400).json({ success: false, message: "Invalid action" });

  if (commissionRate !== undefined) vendor.commissionRate = commissionRate;
  await vendor.save();

  await pushNotification({
    user: vendor.user,
    type: "vendor",
    title: `Store ${vendor.status}`,
    message: action === "approve" ? `Your store "${vendor.storeName}" is live!` : `Store update: ${vendor.status}. ${vendor.rejectionReason || ""}`,
    link: "/vendor/dashboard",
  });

  res.json({ success: true, data: vendor });
});

module.exports = {
  registerVendor,
  getMyVendor,
  updateMyVendor,
  listVendors,
  getVendorBySlug,
  getVendorStats,
  getVendorOrders,
  updateVendorOrderStatus,
  adminListVendors,
  adminReviewVendor,
};
