const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        default: null
      },
      name: String,
      price: Number,
      quantity: {
        type: Number,
        required: true,
        default: 1
      },
      image: String,
      variant: {
        name: String,
        sku: String
      }
    }],
    // Per-vendor sub-orders for multi-vendor fulfilment + payouts
    subOrders: [{
      vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
      items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        price: Number,
        quantity: Number,
        image: String
      }],
      subtotal: Number,
      status: {
        type: String,
        enum: ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "returned"],
        default: "pending"
      },
      trackingId: String,
      updatedAt: { type: Date, default: Date.now }
    }],
    shippingAddress: {
      name: String,
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      phone: String
    },
    billingAddress: {
      name: String,
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      phone: String
    },
    paymentMethod: {
      type: String,
      enum: ["credit_card", "debit_card", "upi", "wallet", "netbanking", "cod"],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending"
    },
    paymentDetails: {
      // Legacy / card / UPI fields
      transactionId: String,
      cardBrand: String,
      last4: String,
      upiId: String,
      walletProvider: String,
      bankCode: String,
      // Razorpay-specific fields (set after signature verification)
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      // Refund tracking
      refundId: String,
      refundStatus: {
        type: String,
        enum: ["none", "initiated", "processed"],
        default: "none"
      }
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned"
      ],
      default: "pending"
    },
    subtotal: {
      type: Number,
      required: true
    },
    tax: {
      type: Number,
      default: 0
    },
    shippingCost: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    couponCode: {
      type: String
    },
    couponDiscount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    notes: String,
    trackingId: String,
    statusHistory: [{
      status: String,
      note: String,
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      at: { type: Date, default: Date.now }
    }],
    estimatedDelivery: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancelReason: String,
    returnedAt: Date,
    returnReason: String,
    // One-shot guard: stock is restored exactly once per cancellation/return
    stockRestored: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ "items.vendor": 1 });
orderSchema.index({ "subOrders.vendor": 1 });
orderSchema.index({ "paymentDetails.razorpayOrderId": 1 });

module.exports = mongoose.model("Order", orderSchema);
