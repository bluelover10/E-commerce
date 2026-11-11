const express = require("express");
const {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  markHelpful
} = require("../controllers/reviewController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.get("/product/:productId", getProductReviews);

// Protected routes
router.post("/", authMiddleware, createReview);
router.put("/:reviewId", authMiddleware, updateReview);
router.delete("/:reviewId", authMiddleware, deleteReview);
router.post("/:reviewId/helpful", authMiddleware, markHelpful);

module.exports = router;
