import api from "./api";

export const getOverview = () => api.get("/analytics/overview").then((r) => r.data);
export const getRevenue = (params) => api.get("/analytics/revenue", { params }).then((r) => r.data);
export const getAdminStats = () => api.get("/admin/stats").then((r) => r.data);
