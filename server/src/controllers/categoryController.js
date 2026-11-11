const Category = require("../models/Category");
const asyncHandler = require("../utils/asyncHandler");

const listCategories = asyncHandler(async (req, res) => {
  const { activeOnly } = req.query;
  const q = activeOnly === "true" ? { isActive: true } : {};
  const cats = await Category.find(q).sort({ sortOrder: 1, name: 1 }).lean();
  res.json({ success: true, data: cats });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, image, icon, parent, sortOrder } = req.body;
  if (!name) return res.status(400).json({ success: false, message: "Name required" });
  const cat = await Category.create({ name, description, image, icon, parent: parent || null, sortOrder: sortOrder || 0 });
  res.status(201).json({ success: true, data: cat });
});

const updateCategory = asyncHandler(async (req, res) => {
  // Whitelist — never pass raw req.body to Mongoose update
  const allowed = ["name", "description", "image", "icon", "parent", "sortOrder", "isActive"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const cat = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!cat) return res.status(404).json({ success: false, message: "Category not found" });
  res.json({ success: true, data: cat });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!cat) return res.status(404).json({ success: false, message: "Category not found" });
  res.json({ success: true, message: "Category deactivated" });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
