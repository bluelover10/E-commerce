const logger = require("../config/logger");

const isProduction = process.env.NODE_ENV === "production";

const notFound = (req, res) => {
  const message = `Not found — ${req.method} ${req.originalUrl}`;
  res.status(404).json({ success: false, message, error: message });
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Server Error";

  // Mongoose bad ObjectId — never echo the raw value back
  if (err.name === "CastError") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    statusCode = 400;
    message = field ? `That ${field} is already taken` : "Duplicate field value entered";
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // Multer upload errors
  if (err.name === "MulterError" || String(err.code || "").startsWith("LIMIT_")) {
    statusCode = 400;
    const map = {
      LIMIT_FILE_SIZE: "File is too large",
      LIMIT_FILE_COUNT: "Too many files",
      LIMIT_UNEXPECTED_FILE: "Unexpected file field",
      LIMIT_FIELD_VALUE: "Field value too large",
    };
    message = map[err.code] || err.message || "Upload failed";
  }

  // JWT errors
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  logger.error(err.stack || err.message || String(err));

  // Never leak internal error details (stack traces, driver messages) in prod
  if (isProduction && statusCode >= 500) {
    message = "Something went wrong on our side. Please try again.";
  }

  res.status(statusCode).json({
    success: false,
    message,
    // keep the legacy `error` key so existing clients keep working
    error: message,
  });
};

module.exports = { notFound, errorHandler };
