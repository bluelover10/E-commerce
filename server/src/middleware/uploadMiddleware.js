const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const uploadDirs = {
  products: path.join(__dirname, "../../uploads/products"),
  profiles: path.join(__dirname, "../../uploads/profiles")
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = {
  products: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDirs.products);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
  }),
  profiles: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDirs.profiles);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
  })
};

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExt.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images are allowed"));
  }
};

// Create upload instances
const uploadProduct = multer({
  storage: storage.products,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadProfile = multer({
  storage: storage.profiles,
  fileFilter: fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB
});

module.exports = {
  uploadProduct,
  uploadProfile,
  uploadDirs
};
