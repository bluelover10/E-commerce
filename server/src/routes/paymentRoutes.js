const express = require("express");
const {
  createRazorpayOrder,
  verifyPayment,
  createCODOrder,
  handlePaymentFailure,
} = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All payment routes require authentication
router.post("/create-order", authMiddleware, createRazorpayOrder);
router.post("/verify", authMiddleware, verifyPayment);
router.post("/cod", authMiddleware, createCODOrder);
router.post("/failure", authMiddleware, handlePaymentFailure);

module.exports = router;
