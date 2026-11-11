const Razorpay = require("razorpay");
const logger = require("./logger");

// Razorpay client singleton — initialized lazily so a missing/incomplete
// key pair (e.g. in local/dev environments where payments aren't being
// tested) does not crash the entire server on startup. The previous
// eager `new Razorpay(...)` at module load time threw synchronously
// whenever RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET were unset, which took
// down the whole app before it could even start listening.
let razorpayInstance = null;

function getRazorpayInstance() {
  if (razorpayInstance) return razorpayInstance;

  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    logger.warn(
      "Razorpay keys are not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET). " +
        "Online payment routes will return an error until they are set in .env."
    );
    return null;
  }

  razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  return razorpayInstance;
}

module.exports = { getRazorpayInstance };

