const { body, validationResult } = require("express-validator");

// ── Error formatter ───────────────────────────────────────────────────────────
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// ── Register ──────────────────────────────────────────────────────────────────
const validateRegister = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  handleValidationErrors
];

// ── Login ─────────────────────────────────────────────────────────────────────
const validateLogin = [
  body("email").isEmail().withMessage("Please provide a valid email").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors
];

// ── Forgot Password ───────────────────────────────────────────────────────────
const validateForgotPassword = [
  body("email").isEmail().withMessage("Please provide a valid email").normalizeEmail(),
  handleValidationErrors
];

// ── Reset Password ────────────────────────────────────────────────────────────
const validateResetPassword = [
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
  handleValidationErrors
];

// ── Create/Update Product ─────────────────────────────────────────────────────
const validateProduct = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount must be between 0 and 100"),
  handleValidationErrors
];

// ── Create Coupon ─────────────────────────────────────────────────────────────
const validateCoupon = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required")
    .isAlphanumeric()
    .withMessage("Coupon code must be alphanumeric"),
  body("type")
    .isIn(["percentage", "flat", "free_shipping"])
    .withMessage("Invalid coupon type"),
  body("value")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Coupon value must be a positive number"),
  body("expiresAt")
    .isISO8601()
    .withMessage("Invalid expiry date format")
    .custom((value) => new Date(value) > new Date())
    .withMessage("Expiry date must be in the future"),
  body("maxDiscount")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Max discount must be a positive amount"),
  handleValidationErrors
];

// ── Update Product (all fields optional — partial updates allowed) ────────────
const validateProductUpdate = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Product name cannot be empty"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount must be between 0 and 100"),
  handleValidationErrors
];

// ── Update Coupon (all fields optional — partial updates allowed) ─────────────
const validateCouponUpdate = [
  body("code")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Coupon code cannot be empty")
    .isAlphanumeric()
    .withMessage("Coupon code must be alphanumeric"),
  body("type")
    .optional()
    .isIn(["percentage", "flat", "free_shipping"])
    .withMessage("Invalid coupon type"),
  body("value")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Coupon value must be a positive number"),
  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Invalid expiry date format")
    .custom((value) => new Date(value) > new Date())
    .withMessage("Expiry date must be in the future"),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateProduct,
  validateProductUpdate,
  validateCoupon,
  validateCouponUpdate,
  handleValidationErrors
};
