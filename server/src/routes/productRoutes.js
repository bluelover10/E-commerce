const express = require("express");

const {
  getProducts,
  getProductById,
  getRelatedProducts,
  createProduct,
  updateProduct,
  addProductImage,
  deleteProduct,
  getCategories,
  getFeaturedProducts,
  getBestSellers,
  getLatestProducts,
  getMyProducts,
  bulkUpdateInventory,
  reviewProduct
} = require("../controllers/productController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const requireApprovedVendor = require("../middleware/vendorMiddleware");
const { validateProduct, validateProductUpdate } = require("../middleware/validate");

const router = express.Router();

// ── Public routes (static paths before parameterized routes) ──────────────────
router.get("/categories", getCategories);
router.get("/featured", getFeaturedProducts);
router.get("/best-sellers", getBestSellers);
router.get("/latest", getLatestProducts);
router.get("/", getProducts);

// ── Vendor routes ─────────────────────────────────────────────────────────────
router.get("/vendor/mine", authMiddleware, authorize("vendor", "admin"), requireApprovedVendor, getMyProducts);
router.put("/vendor/inventory", authMiddleware, authorize("vendor", "admin"), requireApprovedVendor, bulkUpdateInventory);

// ── Parameterized routes ──────────────────────────────────────────────────────
router.get("/:id/related", getRelatedProducts);
router.get("/:id", getProductById);

// ── Admin + Vendor write routes ───────────────────────────────────────────────
// Vendors manage own products (approved, active stores only); admins manage all
router.post("/", authMiddleware, authorize("vendor", "admin"), requireApprovedVendor, validateProduct, createProduct);
router.put("/:id", authMiddleware, authorize("vendor", "admin"), requireApprovedVendor, validateProductUpdate, updateProduct);
router.post("/:id/image", authMiddleware, authorize("vendor", "admin"), requireApprovedVendor, addProductImage);
router.delete("/:id", authMiddleware, authorize("vendor", "admin"), requireApprovedVendor, deleteProduct);
router.put("/:id/review", authMiddleware, authorize("admin"), reviewProduct);

module.exports = router;