const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const { listCategories, createCategory, updateCategory, deleteCategory } = require("../controllers/categoryController");

const router = express.Router();
router.get("/", listCategories);
router.post("/", authMiddleware, authorize("admin"), createCategory);
router.put("/:id", authMiddleware, authorize("admin"), updateCategory);
router.delete("/:id", authMiddleware, authorize("admin"), deleteCategory);

module.exports = router;
