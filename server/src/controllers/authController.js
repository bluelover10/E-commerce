const crypto = require("crypto");
const User = require("../models/User");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/tokens");
const asyncHandler = require("../utils/asyncHandler");

const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");

const REFRESH_COOKIE = "refreshToken";
const isProd = process.env.NODE_ENV === "production";

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api",
  });
};

const issueAuthForUser = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

/**
 * POST /api/users/refresh — rotate refresh token, return new access token.
 * Reads httpOnly cookie; also accepts { refreshToken } body for native clients.
 */
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] || req.body.refreshToken;
  if (!token) return res.status(401).json({ success: false, message: "No refresh token" });
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
  const user = await User.findById(decoded.id).select("+refreshTokenHash +tokenVersion");
  if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hashToken(token)) {
    return res.status(401).json({ success: false, message: "Refresh token revoked" });
  }
  if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
    return res.status(401).json({ success: false, message: "Refresh token stale" });
  }
  const { accessToken, refreshToken: nextRefresh } = await issueAuthForUser(user);
  setRefreshCookie(res, nextRefresh);
  res.json({ success: true, token: accessToken, accessToken, refreshToken: nextRefresh, user: user.toJSON() });
});

/**
 * POST /api/users/logout — clear cookie + revoke stored hash.
 */
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await User.findByIdAndUpdate(decoded.id, { $unset: { refreshTokenHash: 1 } });
    } catch { /* ignore */ }
  } else if (req.user?.id) {
    await User.findByIdAndUpdate(req.user.id, { $unset: { refreshTokenHash: 1 } });
  }
  res.clearCookie(REFRESH_COOKIE, {
    path: "/api",
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
  res.json({ success: true, message: "Logged out" });
});

/**
 * POST /api/users/demo-login — one-click entry into the public demo.
 *
 * Finds-or-creates the dedicated demo CUSTOMER account whose credentials
 * intentionally appear on the login page (they are public by design, never a
 * secret). The account is forced to role=customer so the demo can never gain
 * admin/vendor privileges, and it is rate-limited in userRoutes.
 */
const demoLogin = asyncHandler(async (req, res) => {
  const DEMO_EMAIL = (process.env.DEMO_EMAIL || "customer@shop.com").toLowerCase();
  let user = await User.findOne({ email: DEMO_EMAIL }).select("+password");

  if (!user) {
    // Seed data missing — recreate the demo customer safely.
    const demoPassword = process.env.DEMO_PASSWORD || "Customer123!";
    user = new User({
      name: "Demo Shopper",
      email: DEMO_EMAIL,
      password: demoPassword,
      role: "customer",
      isActive: true,
      isEmailVerified: true,
    });
    await user.save();
  }

  // Guard rails: the demo account must always be an active customer.
  if (user.role !== "customer" || !user.isActive) {
    user.role = "customer";
    user.isActive = true;
    await user.save({ validateBeforeSave: false });
  }

  const { accessToken, refreshToken } = await issueAuthForUser(user);
  setRefreshCookie(res, refreshToken);

  res.json({ success: true, token: accessToken, accessToken, user: user.toJSON() });
});

module.exports = { issueAuthForUser, setRefreshCookie, refresh, logout, demoLogin, REFRESH_COOKIE };
