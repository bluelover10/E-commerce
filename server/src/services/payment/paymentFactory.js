/**
 * Payment service architecture — keeps payment logic separated from order logic.
 *
 * PaymentProvider interface:
 *   createOrder({ amount, currency, receipt, notes }) -> { providerOrderId, amount, currency, raw }
 *   verifyWebhookOrSignature(payload) -> boolean
 *
 * Add new gateways (Stripe, PayPal) by implementing the same interface
 * and registering in factory below. Order controllers never touch SDKs directly.
 */

const getRazorpayProvider = () => require("./razorpayProvider");
const getCODProvider = () => require("./codProvider");
const getStripeProvider = () => {
  try {
    return require("./stripeProvider");
  } catch {
    return null;
  }
};

const providers = {
  razorpay: () => getRazorpayProvider(),
  cod: () => getCODProvider(),
  stripe: () => getStripeProvider(),
};

const getProvider = (name = "razorpay") => {
  const factory = providers[name];
  if (!factory) throw new Error(`Unknown payment provider: ${name}`);
  const provider = factory();
  if (!provider) throw new Error(`Payment provider not configured: ${name}`);
  return provider;
};

module.exports = { getProvider };
