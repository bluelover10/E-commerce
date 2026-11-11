const Coupon = require("../models/Coupon");

/**
 * Coupon service — single place that computes and (atomically) consumes
 * coupon usage. Every checkout flow (Razorpay drafts, COD, legacy orders)
 * goes through here so limits can't be bypassed by concurrent orders.
 */

// Pure discount computation (does not consume a use).
// Single source of truth — every flow (Razorpay drafts, COD, legacy orders,
// coupon validation) computes through here so rules can never drift apart:
//   * percentage/flat discounts honour an optional `maxDiscount` cap
//   * a discount can never exceed the order value itself
const computeDiscount = (coupon, subtotal) => {
  if (!coupon || subtotal < (coupon.minOrderAmount || 0)) return 0;
  let discount = 0;
  if (coupon.type === "percentage") discount = Math.round((subtotal * coupon.value) / 100);
  else if (coupon.type === "flat") discount = coupon.value;
  else if (coupon.type === "free_shipping") discount = subtotal > 500 ? 0 : 50;
  // Optional per-coupon cap (e.g. "10% off up to ₹500")
  if (coupon.maxDiscount != null && coupon.type !== "free_shipping") {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  // A discount can never exceed the merchandise value
  return Math.max(0, Math.min(discount, subtotal));
};

/**
 * Atomically consume one use of a coupon for a user.
 * Returns the coupon document, or null when the code is invalid, expired,
 * exhausted, already used by this user, or below the minimum order amount.
 *
 * The guard lives in the MATCH — `usedCount < maxUses` and `usedBy != user`
 * are checked in the same query as the increment, so concurrent orders can
 * never both consume the last available use.
 */
const consumeCoupon = async (rawCode, userId, subtotal) => {
  const code = String(rawCode || "").toUpperCase().trim();
  if (!code || !userId) return null;

  const match = {
    code,
    isActive: true,
    expiresAt: { $gt: new Date() },
    // maxUses == null means unlimited
    $or: [{ maxUses: null }, { $expr: { $lt: ["$usedCount", "$maxUses"] } }],
    usedBy: { $ne: userId },
  };

  let coupon = await Coupon.findOneAndUpdate(
    match,
    { $inc: { usedCount: 1 }, $addToSet: { usedBy: userId } },
    { new: true }
  );

  if (!coupon) return null;

  // Minimum-order check happens after the atomic grab; roll back if unmet so
  // the use isn't silently burned.
  if (subtotal < (coupon.minOrderAmount || 0)) {
    await Coupon.updateOne(
      { _id: coupon._id },
      { $inc: { usedCount: -1 }, $pull: { usedBy: userId } }
    );
    return null;
  }

  return coupon;
};

/**
 * Release a previously consumed use (checkout failed / order rolled back).
 * No-op when the coupon row no longer exists.
 */
const releaseCoupon = async (rawCode, userId) => {
  const code = String(rawCode || "").toUpperCase().trim();
  if (!code || !userId) return;
  await Coupon.updateOne(
    { code },
    { $inc: { usedCount: -1 }, $pull: { usedBy: userId } }
  );
};

module.exports = { computeDiscount, consumeCoupon, releaseCoupon };
