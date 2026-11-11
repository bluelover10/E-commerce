const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  getAdminStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
} = require("../controllers/adminController");
const { adminListVendors, adminReviewVendor } = require("../controllers/vendorController");
const { reviewProduct } = require("../controllers/productController");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get("/stats", getAdminStats);
router.get("/users", getAllUsers);
router.put("/users/:userId/role", updateUserRole);
router.delete("/users/:userId", deleteUser);

// Vendor moderation shortcuts under /api/admin (in addition to /api/vendors/admin/*)
router.get("/vendors", adminListVendors);
router.put("/vendors/:vendorId/review", adminReviewVendor);

// Product moderation shortcut
router.put("/products/:id/review", reviewProduct);

module.exports = router;
