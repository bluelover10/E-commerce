import api from "./api";

export const registerStore = (payload) => api.post("/vendors/register", payload).then((r) => r.data);
export const getMyVendor = () => api.get("/vendors/me").then((r) => r.data);
export const updateMyVendor = (payload) => api.put("/vendors/me", payload).then((r) => r.data);
export const listVendors = (params) => api.get("/vendors", { params }).then((r) => r.data);
export const getStoreBySlug = (slug) => api.get(`/vendors/slug/${slug}`).then((r) => r.data);
export const getStats = () => api.get("/vendors/dashboard/stats").then((r) => r.data);
export const getVendorOrders = (params) => api.get("/vendors/orders", { params }).then((r) => r.data);
export const updateVendorOrderStatus = (orderId, payload) =>
  api.put(`/vendors/orders/${orderId}/status`, payload).then((r) => r.data);
export const adminListVendors = (params) => api.get("/vendors/admin/list", { params }).then((r) => r.data);
export const adminReviewVendor = (vendorId, payload) =>
  api.put(`/vendors/admin/${vendorId}/review`, payload).then((r) => r.data);
