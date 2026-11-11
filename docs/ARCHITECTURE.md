# Architecture Decisions

## 1. Roles + approval gates
`User.role` is the single source of truth (`customer|vendor|admin`; legacy `user` normalized at auth + serialization). A `Vendor` profile is separate from `User` so stores can be moderated (`pending → approved/rejected/suspended`) without touching login. Vendors only sell after `requireApprovedVendor`; products they create start `approvalStatus=pending`.

## 2. JWT access + rotating refresh
Short access token (15m) in `Authorization` header; long refresh (7d) in httpOnly cookie + SHA-256 hash in DB with `tokenVersion`. Every `/refresh` rotates (replay-resistant). Axios retries once on 401. Logout revokes server-side.

## 3. Multi-vendor orders via sub-orders
Each `Order.items[]` carries its `vendor`. At creation we group into `subOrders[]` so vendors fulfil independently while the customer keeps one order + one payment. `statusHistory[]` gives the tracking timeline; Socket.IO + notifications fan out to customer, vendor rooms, and admins.

## 4. Payment service interface
`services/payment/paymentFactory.js` exposes `getProvider(name)` with a tiny interface (`createOrder`, `verifySignature`). Controllers never import SDKs. Razorpay is default, Stripe optional, COD always available. Switch via `PAYMENT_PROVIDER` env.

## 5. Cloudinary-first uploads
`uploadService.js` tries Cloudinary when env is set (with auto-format/resize transform), else falls back to the existing local Sharp/WebP pipeline. No dev setup required; production gets CDN persistence.

## 6. Realtime rooms
`socketService.js` owns all emits. Clients join `user:<id>`, `vendor:<id>`, `admins`. `pushNotification()` persists + emits atomically-ish (emit is best-effort). Order creation, status changes, and vendor reviews all push.

## 7. Redux + Context split
Auth stays in `AuthContext` (token lifecycle, OTP, profile) because it predates Redux and wraps routing guards. Domain state (products/filters, cart persistence, notifications/unread, vendor profile/stats, analytics) lives in Redux Toolkit slices for predictable caching and devtools. Theme is isolated in `ThemeContext` → `data-theme` CSS vars.

## 8. Consistent responses + error handling
New code uses `sendSuccess/sendPaginated` and `asyncHandler`; legacy controllers keep working because the frontend accepts both `products` and `data`. `errorMiddleware` normalizes Mongoose/validation errors; 404 handler is last.

## 9. Analytics via aggregation
Overview, monthly revenue, status breakdown, top products, and vendor performance are Mongo aggregations (no extra services). Recharts renders Area/Pie/Bar on the admin page; vendor dashboard reuses the same numbers scoped to one vendor.

## 10. What was deliberately NOT added
No microservices, no Redis (in-memory rate limit is fine for single-instance dev; use Redis + sticky sessions when scaling Socket.IO), no full-text search engine (Mongo text index + regex is enough at this scale).
