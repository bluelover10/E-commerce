const jwt = require("jsonwebtoken");

/**
 * Token service — clean separation of access vs refresh token logic.
 *
 * Architectural decision:
 * - Short-lived access token (15m default) sent via Authorization header.
 * - Long-lived refresh token (7d default) stored httpOnly cookie + hashed in DB.
 * - Rotation on every refresh to mitigate replay attacks.
 */

const ACCESS_EXPIRE = process.env.JWT_ACCESS_EXPIRE || "15m";
const REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || "7d";

const signAccessToken = (user) => {
  const payload = { id: user._id || user.id, role: user.role };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRE });
};

const signRefreshToken = (user) => {
  const payload = { id: user._id || user.id, tokenVersion: user.tokenVersion || 0 };
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return jwt.sign(payload, secret, { expiresIn: REFRESH_EXPIRE });
};

const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

const verifyRefreshToken = (token) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return jwt.verify(token, secret);
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  ACCESS_EXPIRE,
  REFRESH_EXPIRE,
};
