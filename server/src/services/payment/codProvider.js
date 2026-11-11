/**
 * COD provider — no external gateway. Order stays "pending" until delivery.
 */
const createOrder = async ({ amount, receipt }) => {
  return {
    providerOrderId: `cod_${receipt || Date.now()}`,
    amount,
    currency: "INR",
    raw: { method: "cod" },
  };
};

const verifySignature = () => true;

module.exports = { name: "cod", createOrder, verifySignature };
