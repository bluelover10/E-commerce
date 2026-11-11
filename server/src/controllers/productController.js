const Product = require("../models/Product");
const escapeRegex = require("../utils/escapeRegex");

// Normalize incoming images into sub-documents ({ url, uploadedAt })
const normalizeImages = (images) => {
  if (!Array.isArray(images)) return undefined;
  const cleaned = images
    .map((img) => (typeof img === "string" ? { url: img } : img?.url ? { url: img.url } : null))
    .filter((img) => img && img.url);
  return cleaned.map(({ url }) => ({ url }));
};

// ─── Get Products (with search, filter, sort, pagination) ─────────────────────
const getProducts = async (req, res) => {
  try {
    const {
      category,
      brand,
      vendor,
      priceMin,
      priceMax,
      search,
      sort = "-createdAt",
      page = 1,
      limit = 20,
      rating,
      featured,
      inStock,
      approvalStatus
    } = req.query;

    let query = { isActive: true };
    // Public storefront only shows approved products unless admin/vendor explicitly asks.
    // `null` in $in also matches pre-existing docs missing the field.
    if (!approvalStatus) query.approvalStatus = { $in: ["approved", null] };
    else if (approvalStatus !== "all") query.approvalStatus = approvalStatus;

    if (category) {
      query.category = Array.isArray(category) ? { $in: category } : category;
    }
    if (brand) {
      query.brand = Array.isArray(brand)
        ? { $in: brand }
        : { $regex: escapeRegex(brand), $options: "i" };
    }
    if (vendor) query.vendor = vendor;

    if (priceMin || priceMax) {
      query.price = {};
      if (priceMin) query.price.$gte = parseFloat(priceMin);
      if (priceMax) query.price.$lte = parseFloat(priceMax);
    }

    if (search) {
      // Escaped regex prevents ReDoS / injection from `?search=` input
      query.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
        { brand: { $regex: escapeRegex(search), $options: "i" } },
        { tags: { $regex: escapeRegex(search), $options: "i" } }
      ];
    }

    if (rating) query.rating = { $gte: parseFloat(rating) };
    if (featured === "true") query.isFeatured = true;
    if (inStock === "true") query.stock = { $gt: 0 };

    const allowedSorts = ["price", "-price", "rating", "-rating", "sales", "-sales", "createdAt", "-createdAt", "name", "-name"];
    const sortBy = allowedSorts.includes(sort) ? sort : "-createdAt";

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total, brands, priceRange] = await Promise.all([
      Product.find(query)
        .populate("vendor", "storeName slug logo rating")
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query),
      Product.distinct("brand", { isActive: true }),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } }
      ])
    ]);

    const pages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      products,
      data: products,
      pagination: { total, page: parseInt(page), pages, limit: parseInt(limit) },
      facets: { brands: brands.filter(Boolean).slice(0, 50), priceRange: priceRange[0] || { min: 0, max: 0 } }
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
};

// ─── Get Single Product ───────────────────────────────────────────────────────
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    // Public detail page: hide inactive / unapproved products
    const product = await Product.findOne({
      _id: id,
      isActive: true,
      approvalStatus: { $in: ["approved", null] }
    }).populate({
      path: "reviews",
      populate: { path: "user", select: "name profileImage" },
      options: { sort: { createdAt: -1 }, limit: 10 }
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error: error.message });
  }
};

// ─── Related Products ─────────────────────────────────────────────────────────
const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).select("category");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const related = await Product.find({
      category: product.category,
      _id: { $ne: id },
      isActive: true,
      approvalStatus: { $in: ["approved", null] }
    })
      .sort({ rating: -1, sales: -1 })
      .limit(6)
      .lean();

    res.json(related);
  } catch (error) {
    res.status(500).json({ message: "Error fetching related products", error: error.message });
  }
};

// ─── Create Product ───────────────────────────────────────────────────────────
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, brand, stock, image, images, sku, isFeatured, discount, variants, tags, lowStockThreshold } = req.body;

    // Prevent negative stock on creation
    if (stock !== undefined && parseInt(stock) < 0) {
      return res.status(400).json({ message: "Stock cannot be negative" });
    }

    // Attach vendor when created by a vendor (admin products stay vendor-less)
    let vendorId = req.body.vendor || null;
    if (req.vendor?._id) vendorId = req.vendor._id;
    else if (req.user?.role === "vendor") {
      const Vendor = require("../models/Vendor");
      const v = await Vendor.findOne({ user: req.user.id });
      if (v) vendorId = v._id;
    }

    const product = new Product({
      name, description, price, category, brand, stock, image, sku, isFeatured, discount, variants, tags, lowStockThreshold,
      images: normalizeImages(images),
      vendor: vendorId,
      // Vendor products need approval; admin products auto-approved
      approvalStatus: vendorId && req.user?.role === "vendor" ? "pending" : "approved"
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: "Error creating product", error: error.message });
  }
};

// Resolve the caller's vendor id (vendors only; admins return null = unrestricted)
const resolveCallerVendorId = async (req) => {
  if (req.vendor?._id) return req.vendor._id;
  if (req.user?.role !== "vendor") return null;
  const Vendor = require("../models/Vendor");
  const v = await Vendor.findOne({ user: req.user.id }).select("_id");
  return v?._id || null;
};

// Fields a vendor must never overwrite directly
const PROTECTED_FIELDS = ["vendor", "sales", "rating", "totalReviews", "reviews", "wishlistCount", "approvalStatus"];

// ─── Update Product ───────────────────────────────────────────────────────────
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.stock !== undefined && parseInt(updates.stock) < 0) {
      return res.status(400).json({ message: "Stock cannot be negative" });
    }

    const normalizedImages = normalizeImages(updates.images);
    if (normalizedImages !== undefined) updates.images = normalizedImages;

    const callerVendorId = await resolveCallerVendorId(req);
    if (callerVendorId) {
      // Vendors may only edit their own products and cannot touch protected fields
      for (const f of PROTECTED_FIELDS) delete updates[f];
      const product = await Product.findOneAndUpdate(
        { _id: id, vendor: callerVendorId },
        updates,
        { new: true, runValidators: true }
      );
      if (!product) {
        return res.status(404).json({ message: "Product not found for this vendor" });
      }
      return res.json(product);
    }

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: "Error updating product", error: error.message });
  }
};

// ─── Add Product Image ────────────────────────────────────────────────────────
const addProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL required" });
    }

    const callerVendorId = await resolveCallerVendorId(req);
    const filter = callerVendorId ? { _id: id, vendor: callerVendorId } : { _id: id };
    const product = await Product.findOneAndUpdate(
      filter,
      {
        image: imageUrl,
        $push: { images: { url: imageUrl, uploadedAt: new Date() } }
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: "Error adding image", error: error.message });
  }
};

// ─── Delete Product ───────────────────────────────────────────────────────────
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const callerVendorId = await resolveCallerVendorId(req);
    // Soft delete — just mark inactive (vendors scoped to own products)
    const filter = callerVendorId ? { _id: id, vendor: callerVendorId } : { _id: id };
    const product = await Product.findOneAndUpdate(
      filter,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
};

// ─── Get Categories ───────────────────────────────────────────────────────────
const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("category", { isActive: true });
    res.json(categories.filter(Boolean)); // remove null/empty
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories", error: error.message });
  }
};

// ─── Featured Products ────────────────────────────────────────────────────────
const getFeaturedProducts = async (req, res) => {
  try {
    // Featured products must be fully presentable: active, approved, and with
    // a real image — imageless rows would render as empty "No image" cards.
    const presentable = {
      isActive: true,
      approvalStatus: "approved",
      image: { $nin: [null, ""] },
    };

    const fetchFeatured = () =>
      Product.find({ ...presentable, isFeatured: true })
        .sort({ sales: -1, rating: -1 })
        .limit(12)
        .lean();

    const fetchTopSellers = () =>
      Product.find(presentable)
        .sort({ sales: -1, rating: -1 })
        .limit(12)
        .lean();

    // First try explicit isFeatured flag, fallback to top sellers
    let products = await fetchFeatured();

    if (products.length < 12) {
      // Fill the remaining grid positions with top sellers — deduped against
      // the flagged set, all equally presentable.
      const seen = new Set(products.map((p) => String(p._id)));
      const extra = (await fetchTopSellers()).filter((p) => {
        const id = String(p._id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      products = [...products, ...extra].slice(0, 12);
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching featured products", error: error.message });
  }
};

// ─── Best Sellers ─────────────────────────────────────────────────────────────
const getBestSellers = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ sales: -1 })
      .limit(parseInt(req.query.limit) || 8)
      .lean();

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching best sellers", error: error.message });
  }
};

// ─── Latest Products ──────────────────────────────────────────────────────────
const getLatestProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 8)
      .lean();

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching latest products", error: error.message });
  }
};

// ─── Vendor: my products ──────────────────────────────────────────────────────
const getMyProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const q = { vendor: req.vendor._id };
    if (status === "low") q.$expr = { $lte: ["$stock", "$lowStockThreshold"] };
    else if (status === "out") q.stock = 0;
    else if (status) q.approvalStatus = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(q).sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Product.countDocuments(q)
    ]);
    res.json({ success: true, data: products, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) } });
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch vendor products", error: e.message });
  }
};

// ─── Vendor: bulk inventory update ────────────────────────────────────────────
const bulkUpdateInventory = async (req, res) => {
  try {
    const { updates } = req.body; // [{ productId, stock, variantSku? }]
    if (!Array.isArray(updates) || !updates.length) return res.status(400).json({ message: "updates[] required" });
    const results = [];
    for (const u of updates) {
      const p = await Product.findOne({ _id: u.productId, vendor: req.vendor._id });
      if (!p) { results.push({ productId: u.productId, ok: false, error: "Not found" }); continue; }
      const stockNum = parseInt(u.stock, 10);
      if (!Number.isFinite(stockNum) || stockNum < 0) {
        results.push({ productId: u.productId, ok: false, error: "Invalid stock value" });
        continue;
      }
      if (u.variantSku && p.variants?.length) {
        const v = p.variants.find((x) => x.sku === u.variantSku);
        if (v) v.stock = stockNum;
      } else {
        p.stock = stockNum;
      }
      await p.save();
      results.push({ productId: u.productId, ok: true, stock: p.stock });
    }
    res.json({ success: true, data: results });
  } catch (e) {
    res.status(500).json({ message: "Bulk update failed", error: e.message });
  }
};

// ─── Admin: approve / reject product ──────────────────────────────────────────
const reviewProduct = async (req, res) => {
  try {
    const { action } = req.body; // approve | reject
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: "Product not found" });
    if (action === "approve") p.approvalStatus = "approved";
    else if (action === "reject") p.approvalStatus = "rejected";
    else return res.status(400).json({ message: "Invalid action" });
    await p.save();
    res.json({ success: true, data: p });
  } catch (e) {
    res.status(500).json({ message: "Review failed", error: e.message });
  }
};

module.exports = {
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
};
