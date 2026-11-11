const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const compression = require("compression");
const morgan = require("morgan");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");
const logger = require("./config/logger");

const app = express();

// Security Middlewares (from ecommerce - retained for protection)
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Allow images to be served
app.use(hpp()); // Prevent HTTP parameter pollution
app.use(compression()); // Compress responses

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// HTTP request logger (from fixed - uses morgan + winston)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

// ✅ FIX: Restrict CORS to known frontend origin instead of wildcard.
// Set CORS_ORIGIN in your .env (e.g. http://localhost:5173 for dev,
// https://yourdomain.com for production).
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

// Serve static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
const imageRoutes = require("./routes/imageRoutes");
const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const couponRoutes = require("./routes/couponRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const contactRoutes = require("./routes/contactRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

app.use("/api/images", imageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/newsletter", newsletterRoutes);
// Support both /api/payment and /api/payments for compatibility across variants
app.use("/api/payment", paymentRoutes);
app.use("/api/payments", paymentRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is running", roles: ["customer", "vendor", "admin"], realtime: "socket.io", uploads: process.env.CLOUDINARY_CLOUD_NAME ? "cloudinary" : "local" });
});

// Error Handling Middleware (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
