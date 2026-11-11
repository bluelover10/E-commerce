const mongoose = require("mongoose");

/**
 * PaymentDraft — server-side snapshot of a pending online payment.
 *
 * Created by createRazorpayOrder BEFORE the gateway order is returned to the
 * client. verifyPayment then builds the order exclusively from the draft —
 * client-supplied items/addresses/coupons are never trusted, closing the
 * "pay ₹10, get ₹10,000 of goods" trust gap on multi-step checkouts.
 */
const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", default: null },
    name: String,
    price: Number,
    quantity: Number,
    image: String,
    variant: { name: String, sku: String },
  },
  { _id: false }
);

const paymentDraftSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, default: "razorpay" },
    providerOrderId: { type: String, required: true, unique: true },
    amountInPaise: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    items: [itemSchema],
    shippingAddress: {
      name: String,
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      phone: String,
    },
    billingAddress: {
      name: String,
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      phone: String,
    },
    couponCode: String,
    couponDiscount: { type: Number, default: 0 },
    totals: {
      subtotal: { type: Number, required: true },
      tax: Number,
      shippingCost: Number,
      discount: Number,
      totalAmount: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ["created", "used", "cancelled", "expired"],
      default: "created",
      index: true,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Drafts live ~1h for checkout; TTL sweep removes them 24h after expiry so
// in-flight verifications never race with cleanup.
paymentDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.models.PaymentDraft || mongoose.model("PaymentDraft", paymentDraftSchema);
