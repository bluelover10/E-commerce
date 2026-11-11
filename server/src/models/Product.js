const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    description: {
      type: String
    },

    sku: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values
      trim: true,
      uppercase: true
    },

    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"]
    },

    originalPrice: {
      type: Number
    },

    image: {
      type: String,
      default: null
    },

    // Proper sub-document array. The previous inline `type: String` made
    // Mongoose cast every element to String, so storing `{ url, uploadedAt }`
    // objects (what image upload pushes) silently failed/corrupted.
    images: [
      new mongoose.Schema(
        {
          url: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now }
        },
        { _id: false }
      )
    ],

    category: {
      type: String
    },

    brand: {
      type: String,
      trim: true,
      index: true
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved"
    },

    subcategory: {
      type: String
    },

    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"] // prevents negative stock
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0
    },

    variants: [{
      name: { type: String, required: true }, // e.g. "Size M / Red"
      sku: { type: String, trim: true },
      price: { type: Number, min: 0 },
      stock: { type: Number, default: 0, min: 0 },
      attributes: { type: Map, of: String }, // { size: "M", color: "Red" }
      image: String,
      isActive: { type: Boolean, default: true }
    }],

    seller: {
      name: String,
      rating: Number
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    totalReviews: {
      type: Number,
      default: 0
    },

    reviews: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review"
    }],

    wishlistCount: {
      type: Number,
      default: 0
    },

    sales: {
      type: Number,
      default: 0
    },

    specifications: {
      type: Map,
      of: String
    },

    warranty: String,

    returnPolicy: String,

    shippingDays: Number,

    isActive: {
      type: Boolean,
      default: true
    },

    isFeatured: {
      type: Boolean,
      default: false
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    tags: [String]
  },
  {
    timestamps: true
  }
);

// ── Indexes for performance ───────────────────────────────────────────────────
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ brand: 1, isActive: 1 });
productSchema.index({ vendor: 1, isActive: 1 });
productSchema.index({ approvalStatus: 1, isActive: 1 });
productSchema.index({ name: "text", description: "text", tags: "text", brand: "text" });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ sales: -1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);