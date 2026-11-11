# Deployment

## Prerequisites
- MongoDB Atlas cluster (whitelist IPs, `MONGODB_URI`)
- Cloudinary account (`CLOUDINARY_*`)
- Razorpay/Stripe keys (or COD-only)
- SMTP credentials for emails

## Backend (Render / Railway / Fly)

1. Root: `server/`. Build: `npm install`. Start: `npm start` (`server.js` serves HTTP + Socket.IO).
2. Env: `PORT`, `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN=https://your-storefront.com`, `FRONTEND_URL=...`, `PAYMENT_PROVIDER`, gateway keys, `CLOUDINARY_*`, SMTP.
3. Socket.IO: enable **sticky sessions** if running >1 instance (or use Redis adapter).
4. Health: `GET /api/health`.
5. Seed once: `npm run seed` (then change passwords / delete demo accounts in production).

## Frontend (Vercel / Netlify)

1. Root: `client/`. Build: `npm run build`. Output: `dist/`.
2. Env: `VITE_API_URL=https://your-api.com/api`, `VITE_SOCKET_URL=https://your-api.com`.
3. SPA fallback: rewrite `/* → /index.html`. If hosting API + SPA on one domain, proxy `/api` + `/socket.io` to backend instead.
4. Dark/light mode is CSS-only; no extra config.

## Production checklist
- [ ] Strong `JWT_SECRET` + `JWT_REFRESH_SECRET` (32+ random bytes, different values)
- [ ] `CORS_ORIGIN` restricted to storefront domain(s)
- [ ] Cloudinary configured (else uploads stay on ephemeral disk)
- [ ] MongoDB indexes auto-created on first boot (Mongoose)
- [ ] Rate limits reviewed (`app.js` limiter + `authRateLimit.js`)
- [ ] Backups + log retention (Winston) wired to provider
