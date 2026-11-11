const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    userName: String,
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    comment: {
      type: String,
      required: true
    },
    images: [String],
    helpful: {
      type: Number,
      default: 0
    },
    verified: {
      type: Boolean,
      default: false
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved"
    },
    vendorReply: {
      message: String,
      repliedAt: Date
    }
  },
  {
    timestamps: true
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Compound unique index: one review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
