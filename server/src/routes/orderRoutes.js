const express = require("express");
const {
  createOrder,
  getUserOrders,
  getOrderDetails,
  updateOrderStatus,
  cancelOrder,
  returnOrder,
  generateInvoice,
  getAllOrders,
  getOrderTracking
} = require("../controllers/orderController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// ── Admin routes (must come before /:orderId parameterized routes) ────────────
router.get("/admin/all", authMiddleware, adminMiddleware, getAllOrders);
router.put("/:orderId/status", authMiddleware, adminMiddleware, updateOrderStatus);

// ── Protected user routes ─────────────────────────────────────────────────────
router.post("/", authMiddleware, createOrder);
router.get("/", authMiddleware, getUserOrders);
router.get("/:orderId/tracking", authMiddleware, getOrderTracking);
router.get("/:orderId", authMiddleware, getOrderDetails);
router.put("/:orderId/cancel", authMiddleware, cancelOrder);
router.post("/:orderId/return", authMiddleware, returnOrder);
router.get("/:orderId/invoice", authMiddleware, generateInvoice);

module.exports = router;
