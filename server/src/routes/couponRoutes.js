const express = require("express");
const {
  validateCoupon,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
} = require("../controllers/couponController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { validateCoupon: validateCouponInput, validateCouponUpdate } = require("../middleware/validate");

const router = express.Router();

// ── User: Validate a coupon code ──────────────────────────────────────────────
router.post("/validate", authMiddleware, validateCoupon);

// ── Admin: Coupon management ──────────────────────────────────────────────────
router.get("/admin/all", authMiddleware, adminMiddleware, getAllCoupons);
router.post("/admin", authMiddleware, adminMiddleware, validateCouponInput, createCoupon);
router.put("/admin/:id", authMiddleware, adminMiddleware, validateCouponUpdate, updateCoupon);
router.delete("/admin/:id", authMiddleware, adminMiddleware, deleteCoupon);

module.exports = router;
