const Notification = require("../models/Notification");
const asyncHandler = require("../utils/asyncHandler");

const listMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const q = { user: req.user.id };
  if (unreadOnly === "true") q.isRead = false;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [items, total, unread] = await Promise.all([
    Notification.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Notification.countDocuments(q),
    Notification.countDocuments({ user: req.user.id, isRead: false }),
  ]);
  res.json({ success: true, data: items, unread, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) } });
});

const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await Notification.findOneAndUpdate({ _id: id, user: req.user.id }, { isRead: true }, { new: true });
  if (!doc) return res.status(404).json({ success: false, message: "Notification not found" });
  res.json({ success: true, data: doc });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user.id, isRead: false }, { isRead: true });
  res.json({ success: true, message: "All marked read" });
});

const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  res.json({ success: true, message: "Deleted" });
});

// Personalized recommendations: same-category + top-rated fallback
const getRecommendations = asyncHandler(async (req, res) => {
  const Order = require("../models/Order");
  const Product = require("../models/Product");
  const orders = await Order.find({ user: req.user.id }).select("items.product").lean();
  const boughtIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.product?.toString()).filter(Boolean)))];
  let recs = [];
  if (boughtIds.length) {
    const bought = await Product.find({ _id: { $in: boughtIds } }).select("category").lean();
    const cats = [...new Set(bought.map((p) => p.category).filter(Boolean))];
    recs = await Product.find({ category: { $in: cats }, _id: { $nin: boughtIds }, isActive: true, approvalStatus: "approved" })
      .sort({ rating: -1, sales: -1 })
      .limit(12)
      .lean();
  }
  if (recs.length < 8) {
    const more = await Product.find({ isActive: true, approvalStatus: "approved", _id: { $nin: [...boughtIds, ...recs.map((r) => r._id)] } })
      .sort({ sales: -1, rating: -1 })
      .limit(12 - recs.length)
      .lean();
    recs = [...recs, ...more];
  }
  res.json({ success: true, data: recs });
});

module.exports = { listMyNotifications, markRead, markAllRead, deleteNotification, getRecommendations };
