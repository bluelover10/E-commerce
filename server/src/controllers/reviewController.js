const Review = require("../models/Review");
const Product = require("../models/Product");
const mongoose = require("mongoose");

// Re-compute a product's aggregate rating in a single query (replaces the
// per-review find-all + JS average that previously ran on every write).
const recalcProductRating = async (productId) => {
  const agg = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)) } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Product.findByIdAndUpdate(productId, {
    rating: agg[0] ? Math.round(agg[0].avg * 10) / 10 : 0,
    totalReviews: agg[0]?.count || 0,
  });
};

// Create Review
const createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;

    if (!productId || !rating || !title || !comment) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const ratingNum = Number(rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user already reviewed
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user.id
    });

    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    // Resolve display name from DB (req.user only contains { id })
    const User = require("../models/User");
    const dbUser = await User.findById(req.user.id).select("name");
    const review = new Review({
      product: productId,
      user: req.user.id,
      userName: dbUser?.name || "Customer",
      rating,
      title,
      comment,
      verified: false
    });

    // Mark verified only if user has a delivered order containing this product
    try {
      const Order = require("../models/Order");
      const delivered = await Order.findOne({
        user: req.user.id,
        orderStatus: "delivered",
        "items.product": productId
      }).select("_id");
      if (delivered) review.verified = true;
    } catch (_) {}

    await review.save();

    // Update product reviews + recalc aggregate rating (single aggregate)
    await Product.findByIdAndUpdate(productId, {
      $push: { reviews: review._id }
    });
    await recalcProductRating(productId);

    res.status(201).json({ success: true, review });
  } catch (error) {
    res.status(500).json({ message: "Failed to create review", error: error.message });
  }
};

// Get Product Reviews
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const reviews = await Review.find({ product: productId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate("user", "name profileImage");

    const total = await Review.countDocuments({ product: productId });

    res.json({ reviews, total });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews", error: error.message });
  }
};

// Update Review
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this review" });
    }

    const ratingNum = Number(rating);
    if (rating !== undefined && (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5)) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    review.rating = rating !== undefined ? ratingNum : review.rating;
    review.title = title || review.title;
    review.comment = comment || review.comment;

    await review.save();

    // Recalculate product rating (single aggregate query)
    await recalcProductRating(review.product);

    res.json({ success: true, review });
  } catch (error) {
    res.status(500).json({ message: "Failed to update review", error: error.message });
  }
};

// Delete Review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this review" });
    }

    await Review.findByIdAndDelete(reviewId);

    // Update product + recalc rating (single aggregate query)
    await Product.findByIdAndUpdate(review.product, {
      $pull: { reviews: reviewId }
    });
    await recalcProductRating(review.product);

    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete review", error: error.message });
  }
};

// Mark Review Helpful
const markHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $inc: { helpful: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ success: true, review });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark helpful", error: error.message });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  markHelpful
};
