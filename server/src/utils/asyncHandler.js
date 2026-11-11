/**
 * asyncHandler — wraps async controllers so rejected promises
 * flow into Express errorMiddleware instead of crashing.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
