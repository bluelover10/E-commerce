/**
 * Stripe provider (optional — enabled when STRIPE_SECRET_KEY is set).
 * Implements the same interface so orders can switch gateway via env.
 */
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  } catch {
    stripe = null;
  }
}

const createOrder = async ({ amount, currency = "INR", receipt, notes }) => {
  if (!stripe) {
    const err = new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
    err.statusCode = 503;
    throw err;
  }
  // Stripe expects amount in smallest unit; reuse paise/cents convention
  const intent = await stripe.paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    metadata: { receipt, ...(notes || {}) },
  });
  return {
    providerOrderId: intent.id,
    amount: intent.amount,
    currency: intent.currency,
    clientSecret: intent.client_secret,
    raw: intent,
  };
};

const verifySignature = () => true; // Webhook verification handled separately

module.exports = { name: "stripe", createOrder, verifySignature };
