const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { uploadDirs } = require("../middleware/uploadMiddleware");

// Optimize image with sharp
const optimizeImage = async (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath, ext);
    const dirName = path.dirname(filePath);
    const optimizedPath = path.join(dirName, `${filename}-optimized.webp`);

    await sharp(filePath)
      .resize(800, 800, {
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toFile(optimizedPath);

    // Delete original if optimization successful
    fs.unlinkSync(filePath);
    return optimizedPath;
  } catch (error) {
    console.error("Image optimization error:", error);
    return filePath;
  }
};

// Upload product image — Cloudinary-first, local fallback
const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Try Cloudinary when configured (production)
    try {
      const { isCloudinaryEnabled, uploadBuffer } = require("../services/uploadService");
      if (isCloudinaryEnabled()) {
        const buf = fs.readFileSync(req.file.path);
        const result = await uploadBuffer({ buffer: buf, folder: "ecommerce/products" });
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        return res.json({ success: true, imageUrl: result.secure_url, filename: result.public_id, provider: "cloudinary" });
      }
    } catch (e) {
      console.error("Cloudinary upload failed, falling back to local:", e.message);
    }

    const optimizedPath = await optimizeImage(req.file.path);
    const filename = path.basename(optimizedPath);
    const imageUrl = `/api/images/products/${filename}`;

    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: filename,
      provider: "local"
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ message: "Image upload failed", error: error.message });
  }
};

// Upload profile image
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const optimizedPath = await optimizeImage(req.file.path);
    const filename = path.basename(optimizedPath);
    const imageUrl = `/api/images/profiles/${filename}`;

    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: filename
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ message: "Image upload failed", error: error.message });
  }
};

// Delete image
const deleteImage = async (req, res) => {
  try {
    const { filename, type } = req.body;
    
    if (!filename || !type) {
      return res.status(400).json({ message: "Filename and type required" });
    }

    if (!["products", "profiles"].includes(type)) {
      return res.status(400).json({ message: "Invalid image type" });
    }

    // Product images are catalogue assets claimed by admin.
    const User = require("../models/User");
    const requester = await User.findById(req.user.id).select("role profileImage");
    const isAdmin = requester?.role === "admin";

    if (type === "products" && !isAdmin) {
      return res.status(403).json({ message: "Only admins can delete product images" });
    }

    // Any user may only delete their OWN avatar.
    if (type === "profiles" && !isAdmin) {
      const owned = requester?.profileImage?.includes(path.basename(filename));
      if (!owned) {
        return res.status(403).json({ message: "You can only delete your own profile image" });
      }
    }

    const uploadDir = uploadDirs[type];
    if (!uploadDir) {
      return res.status(400).json({ message: "Invalid image type" });
    }

    // Prevent path traversal — strip directories
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename || filename.includes("..")) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    const filePath = path.join(uploadDir, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: "Image deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
};

// Get image list
const getImageList = async (req, res) => {
  try {
    const { type } = req.params;
    
    if (!uploadDirs[type]) {
      return res.status(400).json({ message: "Invalid image type" });
    }

    const uploadDir = uploadDirs[type];
    const files = fs.readdirSync(uploadDir);
    const images = files.map(file => ({
      filename: file,
      url: `/api/images/${type}/${file}`,
      uploadedAt: fs.statSync(path.join(uploadDir, file)).birthtime
    }));

    res.json(images);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch images", error: error.message });
  }
};

module.exports = {
  uploadProductImage,
  uploadProfileImage,
  deleteImage,
  getImageList
};
