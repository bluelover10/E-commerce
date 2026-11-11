const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["percentage", "flat", "free_shipping"],
      required: true
    },
    value: {
      type: Number,
      required: function () {
        return this.type !== "free_shipping";
      },
      min: 0
    },
    minOrderAmount: {
      type: Number,
      default: 0
    },
    // Optional cap for percentage/flat discounts (e.g. "10% off up to ₹500").
    // null/absent = uncapped. Backward-compatible: existing coupons behave as before.
    maxDiscount: {
      type: Number,
      default: null,
      min: 0
    },
    maxUses: {
      type: Number,
      default: null // null = unlimited
    },
    usedCount: {
      type: Number,
      default: 0
    },
    usedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    expiresAt: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // Vendor-scoped coupons (null = platform-wide)
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    description: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

couponSchema.index({ isActive: 1, expiresAt: 1 });

module.exports = mongoose.model("Coupon", couponSchema);
