const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Admin analytics — powers dashboard charts:
 * total sales, monthly revenue, orders, customers, products,
 * top-selling products, vendor performance.
 */
const getOverview = asyncHandler(async (req, res) => {
  const [productCount, userCount, vendorCount, orderCount, revenueAgg, monthly, byStatus, topProducts, topVendors, recentOrders, lowStock] =
    await Promise.all([
      Product.countDocuments(),
      User.countDocuments({ role: { $in: ["user", "customer"] } }),
      Vendor.countDocuments({ status: "approved" }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { orderStatus: { $nin: ["cancelled", "returned"] }, paymentStatus: { $in: ["completed", "pending"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        { $match: { orderStatus: { $nin: ["cancelled"] }, createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 11)) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
      Product.find({}).sort({ sales: -1 }).limit(8).select("name price sales stock image").lean(),
      Order.aggregate([
        { $unwind: "$items" },
        { $match: { "items.vendor": { $ne: null } } },
        { $group: { _id: "$items.vendor", revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }, units: { $sum: "$items.quantity" }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ]),
      Order.find().populate("user", "name email").sort({ createdAt: -1 }).limit(8).lean(),
      Product.find({ stock: { $lte: 5 }, isActive: { $ne: false } }).sort({ stock: 1 }).limit(6).select("name stock price image").lean(),
    ]);

  // Hydrate vendor names for performance table
  const vendorIds = topVendors.map((v) => v._id);
  const vendors = await Vendor.find({ _id: { $in: vendorIds } }).select("storeName").lean();
  const nameById = Object.fromEntries(vendors.map((v) => [v._id.toString(), v.storeName]));
  const vendorPerformance = topVendors.map((v) => ({ ...v, storeName: nameById[v._id?.toString()] || "Unknown" }));

  res.json({
    success: true,
    data: {
      productCount,
      userCount,
      customerCount: userCount,
      vendorCount,
      orderCount,
      revenue: revenueAgg[0]?.total || 0,
      monthlyRevenue: monthly,
      ordersByStatus: byStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
      topProducts,
      vendorPerformance,
      recentOrders,
      lowStock,
    },
  });
});

const getRevenueReport = asyncHandler(async (req, res) => {
  const { from, to, groupBy = "day" } = req.query;
  const match = { orderStatus: { $nin: ["cancelled", "returned"] } };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }
  const format = groupBy === "month" ? "%Y-%m" : "%Y-%m-%d";
  const rows = await Order.aggregate([
    { $match: match },
    { $group: { _id: { $dateToString: { format, date: "$createdAt" } }, revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 }, discount: { $sum: "$discount" } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, data: rows });
});

module.exports = { getOverview, getRevenueReport };
