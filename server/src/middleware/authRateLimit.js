// Ported from Local/server/middleware/rateLimit.js
const rateLimit = require("express-rate-limit");

const isTest = process.env.NODE_ENV === "test";
const maxOr = (max) => (isTest ? 1000 : max);

const jsonHandler = (message) => (req, res) => {
  res.status(429).json({ success: false, message });
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: maxOr(10),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler("Too many login attempts. Please try again later."),
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: maxOr(10),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler("Too many verification attempts. Please try again later."),
});

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: maxOr(5),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler("Too many resend requests. Please try again later."),
});

const demoLoginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: maxOr(20),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler("Too many demo logins from this device. Please try again later."),
});

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: maxOr(5),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler("Too many messages sent. Please try again later."),
});

const newsletterLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: maxOr(10),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler("Too many subscribe attempts. Please try again later."),
});

module.exports = { loginLimiter, otpLimiter, resendLimiter, demoLoginLimiter, contactLimiter, newsletterLimiter };
