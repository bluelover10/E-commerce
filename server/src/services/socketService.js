const Notification = require("../models/Notification");
const { verifyAccessToken } = require("../utils/tokens");

let ioInstance = null;

/**
 * Socket service — single place to emit realtime events.
 * Falls back silently when Socket.IO isn't initialised (e.g. tests).
 *
 * SECURITY: rooms are joined from the JWT only. Clients can no longer claim
 * an arbitrary userId / vendorId via a `join` event — the token is decoded
 * at handshake (socket.auth = { token }) or via an `authenticate` message
 * (for silent refreshes mid-session), and rooms are derived from the token.
 */

const joinRoomsFor = (socket, decoded) => {
  const userId = decoded.id;
  let role = decoded.role;
  if (role === "user") role = "customer"; // normalize legacy role
  socket.data.user = { id: userId, role };
  socket.join(`user:${userId}`);
  if (role === "admin") socket.join("admins");
  // vendor room: token doesn't carry vendorId — resolved once by event
  return socket.data.user;
};

const initSocket = (io) => {
  ioInstance = io;
  io.on("connection", (socket) => {
    // ── Handshake auth ──────────────────────────────────────────────────
    let decoded = null;
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (token) decoded = verifyAccessToken(token);
    } catch {
      decoded = null; // invalid/expired token → treated as unauthenticated
    }
    if (decoded?.id) joinRoomsFor(socket, decoded);

    // ── Re-auth after a silent token refresh (client emits new token) ───
    socket.on("authenticate", (token) => {
      try {
        const next = verifyAccessToken(token);
        // leave stale rooms from a different identity, then join fresh
        socket.rooms.forEach((room) => {
          if (/^user:/.test(room) || room === "admins") socket.leave(room);
        });
        if (next?.id) joinRoomsFor(socket, next);
      } catch {
        socket.data.user = undefined;
      }
    });

    // Legacy client events — accepted as no-ops so old clients don't error,
    // but they can never influence room membership.
    socket.on("join", () => {});
    socket.on("join-vendor", () => {});
    socket.on("join-admin", () => {});

    // Client tells us its vendor id after auth; validated against the
    // authenticated user so a socket can only join ITS OWN vendor room.
    socket.on("link-vendor", async (vendorId) => {
      if (!vendorId || !socket.data.user) return;
      try {
        const Vendor = require("../models/Vendor");
        const v = await Vendor.findById(vendorId).select("user").lean();
        if (!v || String(v.user) !== socket.data.user.id) return;
        socket.join(`vendor:${vendorId}`);
      } catch {
        /* best-effort */
      }
    });
  });
};

const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
};

const emitToVendor = (vendorId, event, payload) => {
  if (!ioInstance || !vendorId) return;
  ioInstance.to(`vendor:${vendorId}`).emit(event, payload);
};

const emitToAdmins = (event, payload) => {
  if (!ioInstance) return;
  ioInstance.to("admins").emit(event, payload);
};

const pushNotification = async ({ user, type = "system", title, message, link, meta }) => {
  if (!user) return null;
  const doc = await Notification.create({ user, type, title, message, link, meta });
  emitToUser(user.toString(), "notification", doc);
  return doc;
};

module.exports = { initSocket, emitToUser, emitToVendor, emitToAdmins, pushNotification };
