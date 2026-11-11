import api from "./api";

export const list = (params) => api.get("/notifications", { params }).then((r) => r.data);
export const markRead = (id) => api.put(`/notifications/${id}/read`).then((r) => r.data);
export const markAllRead = () => api.put("/notifications/read-all").then((r) => r.data);
export const remove = (id) => api.delete(`/notifications/${id}`).then((r) => r.data);
export const getRecommendations = () => api.get("/notifications/recommendations").then((r) => r.data);
export const getTracking = (orderId) => api.get(`/orders/${orderId}/tracking`).then((r) => r.data);
