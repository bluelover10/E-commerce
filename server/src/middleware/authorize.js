/**
 * authorize(...allowedRoles) — role-based access control.
 * Usage: router.get("/x", authMiddleware, authorize("admin"), handler)
 *
 * Normalizes legacy "user" role to "customer" so old accounts keep working.
 */
const authorize = (...allowed) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Not authenticated" });
  let role = req.user.role || "customer";
  if (role === "user") role = "customer";
  const normalized = allowed.map((r) => (r === "user" ? "customer" : r));
  if (!normalized.includes(role)) {
    return res.status(403).json({ success: false, message: "Forbidden: insufficient role" });
  }
  req.user.role = role;
  next();
};

module.exports = authorize;
