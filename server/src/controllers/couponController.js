const Coupon = require("../models/Coupon");
const { computeDiscount } = require("../services/couponService");

// ─── Validate Coupon ──────────────────────────────────────────────────────────
const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Please provide a coupon code" });
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase().trim(),
      isActive: true
    });

    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    if (coupon.expiresAt < new Date()) {
      return res.status(400).json({ message: "This coupon has expired" });
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ message: "This coupon has reached its usage limit" });
    }

    // Check if user already used this coupon (ObjectId vs string safe)
    if (coupon.usedBy.some((id) => id.toString() === req.user.id)) {
      return res.status(400).json({ message: "You have already used this coupon" });
    }

    if (orderAmount && orderAmount < (coupon.minOrderAmount || 0)) {
      return res.status(400).json({
        message: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`
      });
    }

    // Calculate discount through the shared service — same rules (min order,
    // max cap, subtotal clamp) as the actual checkout paths, so the amount
    // shown in the cart always matches what the order will charge.
    const amount = Number(orderAmount) || 0;
    const discountAmount = computeDiscount(coupon, amount);

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscount: coupon.maxDiscount ?? null,
        // Embedded so clients that store `coupon` and read
        // `coupon.discountAmount` get the real value — the Cart used to read
        // undefined here and rendered ₹0 / NaN totals (root cause of the
        // "coupon makes the total zero" bug).
        discountAmount
      },
      // Kept top-level for backward compatibility with existing callers.
      discountAmount
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to validate coupon", error: error.message });
  }
};

// ─── Admin: Get All Coupons ───────────────────────────────────────────────────
const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ coupons, total: coupons.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch coupons", error: error.message });
  }
};

// ─── Admin: Create Coupon ─────────────────────────────────────────────────────
const createCoupon = async (req, res) => {
  try {
    const { code, type, value, minOrderAmount, maxDiscount, maxUses, expiresAt, description } = req.body;

    if (!code || !type || !expiresAt) {
      return res.status(400).json({ message: "Code, type and expiry are required" });
    }

    if (type === "percentage" && (value == null || value <= 0 || value > 100)) {
      return res.status(400).json({ message: "Percentage value must be between 1 and 100" });
    }
    if (type === "flat" && (value == null || value < 0)) {
      return res.status(400).json({ message: "Flat value must be >= 0" });
    }
    if (maxDiscount != null && maxDiscount !== "" && (Number(maxDiscount) < 0 || Number.isNaN(Number(maxDiscount)))) {
      return res.status(400).json({ message: "Max discount must be a positive amount" });
    }

    const normalizedCode = code.toUpperCase().trim();
    const existingCoupon = await Coupon.findOne({ code: normalizedCode });
    if (existingCoupon) {
      return res.status(400).json({ message: "A coupon with this code already exists" });
    }

    const coupon = new Coupon({
      code: normalizedCode,
      type,
      value,
      minOrderAmount,
      maxDiscount: maxDiscount != null && maxDiscount !== "" ? Number(maxDiscount) : null,
      maxUses,
      expiresAt,
      description
    });

    await coupon.save();
    res.status(201).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ message: "Failed to create coupon", error: error.message });
  }
};

// ─── Admin: Update Coupon ─────────────────────────────────────────────────────
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.code) {
      updates.code = updates.code.toUpperCase().trim();
      const dup = await Coupon.findOne({ code: updates.code, _id: { $ne: id } });
      if (dup) return res.status(400).json({ message: "A coupon with this code already exists" });
    }
    if (updates.type === "percentage" || (updates.value != null && !updates.type)) {
      // Fetch current to validate percentage cap when type not supplied
      const current = await Coupon.findById(id).select("type");
      const effectiveType = updates.type || current?.type;
      if (effectiveType === "percentage" && (updates.value <= 0 || updates.value > 100)) {
        return res.status(400).json({ message: "Percentage value must be between 1 and 100" });
      }
    }

    const coupon = await Coupon.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ message: "Failed to update coupon", error: error.message });
  }
};

// ─── Admin: Delete Coupon ─────────────────────────────────────────────────────
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    // Malformed ids (e.g. "undefined" from a stale client) must 404, not 500
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete coupon", error: error.message });
  }
};

module.exports = {
  validateCoupon,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
};
