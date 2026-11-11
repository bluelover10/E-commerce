const { getRazorpayInstance } = require("../../config/razorpay");

/**
 * Razorpay provider — wraps SDK behind PaymentProvider interface.
 */
const createOrder = async ({ amount, currency = "INR", receipt, notes }) => {
  const razorpay = getRazorpayInstance();
  if (!razorpay) {
    const err = new Error(
      "Online payments are not configured on this server. Please use Cash on Delivery."
    );
    err.statusCode = 503;
    throw err;
  }
  const order = await razorpay.orders.create({ amount, currency, receipt, notes });
  return { providerOrderId: order.id, amount: order.amount, currency: order.currency, raw: order };
};

const verifySignature = ({ orderId, paymentId, signature }) => {
  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
};

module.exports = { name: "razorpay", createOrder, verifySignature };
