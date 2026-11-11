const mongoose = require("mongoose");

/**
 * Vendor / Seller store profile.
 * One-to-one with User (role=vendor). Admin approves before selling.
 */
const vendorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    storeName: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: { type: String, maxlength: 2000 },
    logo: { type: String },
    banner: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    // Compliance / payout stubs (production would verify GSTIN, bank, etc.)
    taxId: { type: String },
    payoutDetails: {
      accountName: String,
      accountNumber: String,
      ifsc: String,
      upiId: String,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    rejectionReason: { type: String },
    commissionRate: { type: Number, default: 10, min: 0, max: 50 }, // platform fee %
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

vendorSchema.pre("save", function (next) {
  if (this.isModified("storeName") && !this.slug) {
    this.slug =
      this.storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + `-${Date.now().toString(36)}`;
  }
  next();
});

vendorSchema.index({ status: 1, isActive: 1 });
vendorSchema.index({ rating: -1 });

module.exports = mongoose.models.Vendor || mongoose.model("Vendor", vendorSchema);
