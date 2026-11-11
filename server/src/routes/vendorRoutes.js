const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const requireApprovedVendor = require("../middleware/vendorMiddleware");
const {
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
} = require("../controllers/vendorController");

const router = express.Router();

// Public
router.get("/", listVendors);
router.get("/slug/:slug", getVendorBySlug);

// Vendor self-service
router.post("/register", authMiddleware, registerVendor);
router.get("/me", authMiddleware, getMyVendor);
router.put("/me", authMiddleware, updateMyVendor);
router.get("/dashboard/stats", authMiddleware, authorize("vendor", "admin"), requireApprovedVendor, getVendorStats);
router.get("/orders", authMiddleware, authorize("vendor", "admin"), requireApprovedVendor, getVendorOrders);
router.put("/orders/:orderId/status", authMiddleware, authorize("vendor", "admin"), requireApprovedVendor, updateVendorOrderStatus);

// Admin moderation
router.get("/admin/list", authMiddleware, authorize("admin"), adminListVendors);
router.put("/admin/:vendorId/review", authMiddleware, authorize("admin"), adminReviewVendor);

module.exports = router;
