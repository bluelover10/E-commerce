const express = require("express");
const path = require("path");
const fs = require("fs");
const { uploadProduct, uploadProfile } = require("../middleware/uploadMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  uploadProductImage,
  uploadProfileImage,
  deleteImage,
  getImageList
} = require("../controllers/imageController");

const router = express.Router();
const authorize = require("../middleware/authorize");

// Upload endpoints — vendors + admins can upload product images (Cloudinary-first via controller fallback)
router.post("/upload/product", authMiddleware, authorize("vendor", "admin"), uploadProduct.single("image"), uploadProductImage);
router.post("/upload/profile", authMiddleware, uploadProfile.single("image"), uploadProfileImage);

// Delete endpoint — admin only for product images; profile images are checked
// for ownership in the controller (users may delete their own avatar).
router.post("/delete", authMiddleware, deleteImage);

// List images by type — admin only to avoid enumeration
router.get("/list/:type", authMiddleware, adminMiddleware, getImageList);

// Serve images — public (needed for storefront display)
router.get("/products/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(__dirname, "../../uploads/products", filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ message: "Image not found" });
  }

  res.sendFile(filepath);
});

router.get("/profiles/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(__dirname, "../../uploads/profiles", filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ message: "Image not found" });
  }

  res.sendFile(filepath);
});

module.exports = router;
