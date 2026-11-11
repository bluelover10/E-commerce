import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useDispatch } from "react-redux";
import { pushRealtime } from "../store/slices/notificationsSlice";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

/**
 * useSocket — connects with the JWT in the handshake (the server derives
 * rooms from the token; arbitrary room-joins are no longer possible), listens
 * for realtime notifications/orders, re-authenticates after a silent token
 * refresh, and cleans up on unmount.
 */
export function useSocket({ user, onToast }) {
  const socketRef = useRef(null);
  const dispatch = useDispatch();
  const toastRef = useRef(onToast);
  toastRef.current = onToast;

  const userId = user?._id || user?.id;
  const vendorId = typeof user?.vendor === "string" ? user.vendor : user?.vendor?._id;

  useEffect(() => {
    if (!userId) return;
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: { token: localStorage.getItem("token") },
    });
    socketRef.current = socket;

    // Vendor room must be validated server-side (token user == vendor owner)
    if (vendorId) {
      socket.on("connect", () => socket.emit("link-vendor", vendorId));
    }

    socket.on("notification", (doc) => {
      dispatch(pushRealtime(doc));
      toastRef.current?.(doc.title || "New notification", doc.message);
    });

    // Re-authenticate with a fresh access token after silent refreshes
    const onTokenRefreshed = () => {
      const token = localStorage.getItem("token");
      if (token && socket.connected) socket.emit("authenticate", token);
    };
    window.addEventListener("auth:token-refreshed", onTokenRefreshed);

    return () => {
      window.removeEventListener("auth:token-refreshed", onTokenRefreshed);
      socket.disconnect();
    };
  }, [userId, vendorId, dispatch]);

  return socketRef;
}
