# API Documentation

Base URL: `/api`. Success shape: `{ success: true, data, message?, pagination? }`. Errors: `{ success: false, message }` with proper HTTP codes.

Auth: `Authorization: Bearer <accessToken>`. Refresh via httpOnly cookie `POST /api/users/refresh` (also accepts `{ refreshToken }`).

## Auth (`/api/users`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Register (returns access + refresh, OTP in dev) |
| POST | `/login` | — | Login |
| POST | `/refresh` | cookie | Rotate refresh → new access |
| POST | `/logout` | optional | Revoke + clear cookie |
| POST | `/forgot-password` | — | Send reset link (anti-enumeration) |
| POST | `/reset-password/:token` | — | Set new password |
| PUT | `/change-password` | user | Change password |
| POST | `/verify-email` | — | OTP verify `{ code, email }` |
| GET | `/verify-email/:token` | — | Legacy link verify |
| POST | `/resend-verification` | — | Resend OTP (rate-limited) |
| GET | `/profile` | user | Current user |
| PUT | `/profile` | user | Update profile |
| GET | `/dashboard-stats` | user | Orders/wishlist/spend |
| POST | `/wishlist/add` `/wishlist/remove` | user | Wishlist |
| CRUD | `/addresses...` | user | Address book |

## Vendors (`/api/vendors`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | user | Open store (→ pending) |
| GET | `/me` | user | My vendor profile |
| PUT | `/me` | user | Update store |
| GET | `/` | — | Approved stores (search, page) |
| GET | `/slug/:slug` | — | Store + products |
| GET | `/dashboard/stats` | vendor | Revenue/sales/orders/top/low-stock |
| GET | `/orders` | vendor | Orders containing my items |
| PUT | `/orders/:orderId/status` | vendor | Fulfilment update + customer notify |
| GET | `/admin/list` | admin | All vendors (status filter) |
| PUT | `/admin/:vendorId/review` | admin | approve/reject/suspend |

Admin shortcuts also under `/api/admin/vendors`, `/api/admin/vendors/:id/review`.

## Products (`/api/products`)

- `GET /?search&category&brand&vendor&priceMin&priceMax&rating&featured&inStock&sort&approvalStatus&page&limit` → `{ products|data, pagination, facets: { brands, priceRange } }`
- `GET /featured|best-sellers|latest|categories`, `GET /:id`, `GET /:id/related`
- Vendor: `GET /vendor/mine`, `PUT /vendor/inventory` (bulk)
- Write (vendor/admin): `POST /`, `PUT /:id`, `POST /:id/image`, `DELETE /:id`
- Admin: `PUT /:id/review` (approve/reject)

## Orders (`/api/orders`)

- `POST /` (legacy direct), `GET /`, `GET /:orderId`, `PUT /:orderId/cancel`, `POST /:orderId/return`, `GET /:orderId/invoice`, `GET /:orderId/tracking`
- Admin: `GET /admin/all`, `PUT /:orderId/status`

## Payments (`/api/payment` + `/api/payments`)

- `POST /create-order` — secure totals from DB prices, provider via `PAYMENT_PROVIDER`
- `POST /verify` — HMAC verify → create order + subOrders + decrement stock
- `POST /cod` — COD order
- `POST /failed` — log gateway failure (no order)

## Analytics (admin, `/api/analytics`)

- `GET /overview` → revenue, orderCount, customer/vendor/product counts, monthlyRevenue[], ordersByStatus, topProducts[], vendorPerformance[], recentOrders[], lowStock[]
- `GET /revenue?from&to&groupBy=day|month`

## Notifications + recommendations (`/api/notifications`)

- `GET /?page&limit&unreadOnly`, `PUT /read-all`, `PUT /:id/read`, `DELETE /:id`
- `GET /recommendations` — category-based + top-sellers fallback

## Categories (`/api/categories`)

- `GET /` (public), admin `POST /`, `PUT /:id`, `DELETE /:id` (soft)

## Others

- Coupons `/api/coupons`, Reviews `/api/reviews`, Images `/api/images` (vendor/admin upload, Cloudinary-first), Contact `/api/contact`, Newsletter `/api/newsletter`, Health `/api/health`
