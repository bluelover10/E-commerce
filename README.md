# Multi-Vendor E-Commerce Platform (MERN)

Production-style marketplace with **Customer / Vendor / Admin** roles, JWT + refresh-token auth, vendor approvals, per-vendor fulfilment, clean payment service architecture, Socket.IO realtime, Cloudinary uploads, Redux Toolkit, and analytics dashboards.

## Tech stack

- Frontend: React 19 + Vite, Tailwind CSS 4, Redux Toolkit, React Router 7, Socket.IO client, Recharts
- Backend: Node.js + Express 5, MongoDB + Mongoose, JWT + refresh rotation, Socket.IO, Cloudinary (local fallback), Razorpay / Stripe / COD via provider interface
- API: RESTful, consistent `{ success, data, message, pagination }` shape, role-based auth, validation, rate limiting, logging

## Roles

1. **Customer** — register/login, forgot/reset, browse/search/filter/sort, product details, reviews, cart, wishlist, coupons, checkout, addresses, orders, tracking, profile, recommendations, notifications
2. **Vendor** — register store → admin approval → dashboard (revenue net of commission, orders, top products, low stock), CRUD products + variants + inventory, fulfil orders, coupons (via admin catalog for now), store page `/store/:slug`
3. **Admin** — overview + analytics charts (monthly revenue, orders by status, top products, vendor performance), users, vendors (approve/reject/suspend), products (approve/reject), orders, coupons, categories, messages, reviews

## Quick start

```bash
# 1. Backend
cd server
cp .env.example .env   # fill JWT secrets, Mongo URI
npm install
npm run seed           # admin/vendor/customer + categories + coupons + products
npm run dev            # http://localhost:5000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev            # http://localhost:5173
```

Sample credentials (seeded):
- Admin: `admin@shop.com` / `Admin123!` → `/admin`
- Vendor: `vendor@shop.com` / `Vendor123!` → `/vendor/dashboard`
- Customer: `customer@shop.com` / `Customer123!`

## Folder structure

```
server/
  server.js                 # http + socket.io bootstrap
  src/
    app.js                  # middleware, CORS, routes, errors
    config/ db.js logger.js email.js razorpay.js
    models/ User.js Vendor.js Product.js Order.js Category.js Coupon.js Review.js Cart.js Notification.js ContactMessage.js Newsletter.js
    controllers/ userController.js authController.js vendorController.js productController.js orderController.js paymentController.js analyticsController.js notificationController.js categoryController.js adminController.js couponController.js reviewController.js imageController.js contactController.js newsletterController.js
    routes/ userRoutes.js vendorRoutes.js productRoutes.js orderRoutes.js paymentRoutes.js analyticsRoutes.js notificationRoutes.js categoryRoutes.js adminRoutes.js couponRoutes.js reviewRoutes.js imageRoutes.js contactRoutes.js newsletterRoutes.js
    middleware/ authMiddleware.js authorize.js vendorMiddleware.js adminMiddleware.js validate.js errorMiddleware.js uploadMiddleware.js authRateLimit.js
    services/ payment/{paymentFactory,razorpayProvider,stripeProvider,codProvider}.js uploadService.js socketService.js
    utils/ tokens.js ApiResponse.js asyncHandler.js generateOTP.js
  scripts/ seed.js createAdmin.js
client/
  src/
    store/ store.js slices/{products,cart,notifications,vendor,analytics}Slice.js
    context/ AuthContext.jsx CartContext.jsx ToastContext.jsx ThemeContext.jsx
    hooks/ useSocket.js useDocumentTitle.js useReveal.js
    services/ api.js userService.js productService.js orderService.js couponService.js vendorService.js analyticsService.js notificationService.js categoryService.js
    routes/ AppRoutes.jsx
    layouts/ MainLayout.jsx AdminLayout.jsx UserDashboardLayout.jsx VendorLayout.jsx
    pages/ Home.jsx ProductsPage.jsx ProductDetails.jsx Cart.jsx Login.jsx Register.jsx ... vendor/{VendorRegister,VendorDashboard,VendorProducts,VendorOrders}.jsx admin/{AdminDashboard,AdminAnalytics,AdminVendors,AdminCatalog,...}.jsx StorePage.jsx NotificationsPage.jsx
    components/ ui/{EmptyState,ErrorState,ConfirmDialog,ProductSkeleton} order/OrderTracking product/ dashboard/ layout/ common/
```

## Database schemas (summary)

- **User**: name, email (unique), password (bcrypt-12), role `customer|vendor|admin` (legacy `user` normalized), vendor ref, wishlist, addresses[], refreshTokenHash + tokenVersion, OTP/reset fields
- **Vendor**: user (unique), storeName, slug, description, logo/banner, contact, address, taxId, payoutDetails, status `pending|approved|rejected|suspended`, commissionRate, rating, totalSales/Revenue
- **Product**: name, description, sku, price, brand, category, vendor ref, approvalStatus, stock + lowStockThreshold, variants[] {name, sku, price, stock, attributes, image}, images[], rating/totalReviews, sales, specs Map, isActive/Featured, discount, tags
- **Order**: user, items[] {product, vendor, name, price, qty, image, variant}, subOrders[] per vendor {vendor, items, subtotal, status, trackingId}, shipping/billing, paymentMethod/Status/Details, orderStatus (+ statusHistory[]), totals, coupon, trackingId, delivery/cancel/return dates
- **Category**: name, slug, description, image, icon, parent, sortOrder, isActive
- **Coupon**: code, type `percentage|flat|free_shipping`, value, minOrderAmount, maxUses/usedCount/usedBy, expiresAt, vendor (null = platform), createdBy, isActive
- **Review**: product, user, rating, title, comment, images, helpful, verified, vendor, status, vendorReply
- **Notification**: user, type, title, message, link, meta, isRead

## API documentation

See [`docs/API.md`](./docs/API.md). Highlights:

- Auth: `POST /api/users/register|login|refresh|logout`, forgot/reset, OTP verify
- Vendors: `POST /api/vendors/register`, `GET /api/vendors`, `GET /api/vendors/slug/:slug`, `GET /api/vendors/dashboard/stats`, `GET/PUT /api/vendors/orders...`, admin `GET /api/vendors/admin/list`
- Products: `GET /api/products?search&category&brand&vendor&priceMin&priceMax&rating&sort&page&limit`, vendor `GET /api/products/vendor/mine`, admin review
- Orders: `POST/GET /api/orders`, `GET /api/orders/:id/tracking`, admin status
- Payments: `POST /api/payment/create-order|verify|cod|failed`
- Analytics (admin): `GET /api/analytics/overview|revenue`
- Notifications: `GET /api/notifications`, recommendations `GET /api/notifications/recommendations`

## Environment variables

Backend: see `server/.env.example` (JWT secrets, Mongo, CORS, Cloudinary, `PAYMENT_PROVIDER`, Razorpay/Stripe, SMTP).
Frontend (`client/.env.example`):
```
VITE_API_URL=/api
VITE_SOCKET_URL=http://localhost:5000
```

## Deployment

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — Render/Railway (API + Socket.IO with sticky sessions), MongoDB Atlas, Cloudinary, Vercel/Netlify (SPA + proxy `/api` → backend).

## Architectural decisions

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — why refresh rotation, vendor sub-orders, payment provider interface, Cloudinary-first uploads, Socket.IO rooms, Redux + Context split, approval gates.
