const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const escapeRegex = require("../utils/escapeRegex");

const getAdminStats = async (req, res) => {
  try {
    const [productCount, userCount, orderCount, revenueAgg, statusBreakdown, recentOrders, lowStock] =
      await Promise.all([
        Product.countDocuments(),
        User.countDocuments(),
        Order.countDocuments(),
        Order.aggregate([
          { $match: { orderStatus: { $nin: ["cancelled", "returned"] }, paymentStatus: "completed" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        Order.aggregate([
          { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
        ]),
        Order.find()
          .populate("user", "name email")
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
        Product.find({ stock: { $lte: 5 }, isActive: { $ne: false } })
          .sort({ stock: 1 })
          .limit(6)
          .select("name stock price image")
          .lean(),
      ]);

    const revenue = revenueAgg[0]?.total || 0;
    const ordersByStatus = statusBreakdown.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {});

    res.json({
      productCount,
      userCount,
      orderCount,
      revenue,
      ordersByStatus,
      recentOrders,
      lowStock,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch admin stats", error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { search = "", limit = 50, skip = 0 } = req.query;
    const query = search
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: "i" } },
            { email: { $regex: escapeRegex(search), $options: "i" } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({ users, total });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "customer", "vendor", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (userId === req.user.id && role !== "admin") {
      return res.status(400).json({ message: "Cannot remove your own admin access" });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
};
