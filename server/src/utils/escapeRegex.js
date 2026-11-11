/**
 * Escape user-controlled strings before embedding them in MongoDB $regex
 * filters. Prevents regex injection (ReDoS) from `?search=.*` style inputs.
 */
const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = escapeRegex;
