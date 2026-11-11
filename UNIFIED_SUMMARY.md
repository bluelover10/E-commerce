# E-Commerce Unified - Combined Project

This project is the **single unified build** combining all development stages from:
- \ecommerce\ (original - 263 files)
- \ecommerce-fixed\ (231 files)
- \ixed\ (227 files)
- \ixed-1\ (227 files)
- \live\ (225 files, minimal backend)
- \New folder\ (asset dump)

**Location:** \C:\Users\Ghost\Music\ecommerce-unified\

## What Was Merged

### Backend - Best of all worlds
- **Base:** \ixed-1\ (most complete & recent) + overlay from \ixed\ (newer frontend API fixes)
- **Security (from ecommerce):** helmet, rateLimit, hpp, compression
- **Logging (from fixed):** morgan + winston logger, lazy Razorpay init
- **Features retained (all variants):**
  - Models: \Cart\, \Category\ (from ecommerce/live) + \Coupon\ (from fixed) + \User, Product, Order, Review\
  - Config: \db.js\ (now supports both MONGODB_URI & MONGO_URI), \email.js\, \logger.js\, \azorpay.js\ (lazy init with null check)
  - Middleware: \errorMiddleware\ (with logger), \alidate.js\, \uth, admin, upload\
  - Routes: \/api/payment\ & \/api/payments\ aliases, \/api/coupons\, \/api/orders\, etc.
  - Utils: \utils/sendEmail.js\ (legacy) + \config/email.js\ (modern)
- **Package:** superset deps (bcryptjs, razorpay, sharp, multer, morgan, winston, pdfkit, express-validator, helmet, hpp, compression, cors, etc.)
- **Env:** comprehensive \.env.example\ documenting all required vars

### Frontend - Best of all worlds
- **Base:** \ixed\ (newest, uses \pi\ service) + \ecommerce\ unique pages
- **Retained from ecommerce/live (missing in fixed):**
  - \components/common/Loader.jsx\
  - \hooks/useDocumentTitle.js\
  - \pages/Invoice.jsx\, \PaymentSuccess.jsx\, \PaymentFailed.jsx\
  - \pages/AdminProducts.jsx\ (duplicate kept), \pages/Products.jsx\
  - Lazy loading + Suspense in \AppRoutes.jsx\ with Invoice/Payment routes, ProtectedRoute for order/invoice
- **Retained from fixed (improved):**
  - \services/api.js\ (VITE_API_URL, JWT interceptor), \couponService, orderService, productService, userService\
  - \context/AuthContext.jsx\ (401 interceptor, loading state)
  - All pages now use \pi\ instead of raw \xios\ (ProductsPage, ProductDetails, Reviews, etc.)
  - Modern Cart with glassmorphic payment modal + coupon logic merged (see below)
- **Merged Cart.jsx:** fixed's rich payment UI (card preview, UPI QR, wallet, netbanking, processing steps) + ecommerce's coupon validation (apply/remove, discount in order summary & payload)
- **Build:** verified vite build succeeds - 122 modules, includes Invoice/Payment chunks

### Assets
- All images from \Hoodie, Pant, Shirt, Shorts, Suit, T-Shirt, New folder\ preserved
- Uploads: \ackend/uploads/products/*.webp\ from all variants (18 optimized images)
- Dist artifacts cleaned (frontend/dist, frontend/src/dist removed - rebuild via \
pm run build\)

## File Count
- Unified: 238 files (excl node_modules/dist) vs ecommerce 263, fixed 227 - unified has union of all unique files
- Backend models: 7 (Cart, Category, Coupon, Order, Product, Review, User)
- Frontend services: 5 (api, coupon, order, product, user)

## Verification
- Backend syntax: \
ode --check\ passed for server.js, app.js, db.js, razorpay.js
- Backend imports: 0 missing requires
- Frontend imports: 0 missing imports
- Backend install: 287 packages, app.js loads OK
- Frontend install: 174 packages, \
pm run build\ succeeds in 1.46s (dist with Invoice, PaymentSuccess/Failed chunks)

## How to Run
\\\ash
cd C:/Users/Ghost/Music/ecommerce-unified
npm run install:all
# or manually:
# cd backend && npm install
# cd ../frontend && npm install

# Set env
cp backend/.env.example backend/.env  # edit with your secrets

# Dev (concurrently runs both)
npm run dev
# Backend only: npm run backend  (http://localhost:5000)
# Frontend only: npm run frontend (http://localhost:5173, proxies /api to 5000)
\\\

## Original Variants (kept for reference)
- \ecommerce\ - original with security middleware, coupon logic but raw axios
- \ecommerce-fixed\ - first fix (missing some routes, older)
- \ixed\ / \ixed-1\ - recent fixes, \ixed\ newer than \ixed-1\ (uses api service)
- \live\ - minimal deploy backend (stripped deps, missing coupon/payment)
- \New folder\ - image dump only

All variants remain untouched in \C:\Users\Ghost\Music\ for rollback.
