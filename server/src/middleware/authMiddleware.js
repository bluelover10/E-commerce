const { verifyAccessToken } = require("../utils/tokens");

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not configured");
      return res.status(500).json({ success: false, message: "Server auth misconfigured" });
    }

    const decoded = verifyAccessToken(token);
    // Normalize legacy "user" role -> "customer"
    if (decoded.role === "user") decoded.role = "customer";
    req.user = decoded;
    next();
  } catch (error) {
    const msg = error.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    res.status(401).json({ success: false, message: msg });
  }
};

module.exports = authMiddleware;
