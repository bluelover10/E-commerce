const express = require("express");
const {
  register,
  login,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  verifyEmailByLink,
  resendVerification,
  addToWishlist,
  removeFromWishlist,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getUserDashboardStats
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword
} = require("../middleware/validate");

const router = express.Router();
const { loginLimiter, otpLimiter, resendLimiter, demoLoginLimiter } = require("../middleware/authRateLimit");
const { refresh, logout, demoLogin } = require("../controllers/authController");

// ── Public routes ─────────────────────────────────────────────────────────────
router.post("/register", validateRegister, register);
router.post("/login", loginLimiter, validateLogin, login);
// Public demo account (credentials shown on the login page are intentional)
router.post("/demo-login", demoLoginLimiter, demoLogin);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/reset-password/:token", validateResetPassword, resetPassword);
// OTP verification (Local/auth style) + legacy link kept for old emails
router.post("/verify-email", otpLimiter, verifyEmail);
router.get("/verify-email/:token", verifyEmailByLink);
// Resend works with { email } body (public) or auth token — rate-limited like Local
router.post("/resend-verification", resendLimiter, (req, res) => {
  if (req.headers.authorization) return authMiddleware(req, res, () => resendVerification(req, res));
  return resendVerification(req, res);
});

// ── Protected routes ──────────────────────────────────────────────────────────
router.get("/profile", authMiddleware, getCurrentUser);
router.get("/dashboard-stats", authMiddleware, getUserDashboardStats);
router.put("/profile", authMiddleware, updateProfile);
router.put("/change-password", authMiddleware, changePassword);

// Wishlist
router.post("/wishlist/add", authMiddleware, addToWishlist);
router.post("/wishlist/remove", authMiddleware, removeFromWishlist);

// Addresses
router.post("/addresses", authMiddleware, addAddress);
router.get("/addresses", authMiddleware, getAddresses);
router.put("/addresses/:addressId", authMiddleware, updateAddress);
router.delete("/addresses/:addressId", authMiddleware, deleteAddress);
router.put("/addresses/:addressId/default", authMiddleware, setDefaultAddress);

module.exports = router;
