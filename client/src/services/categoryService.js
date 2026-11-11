import api from "./api";

export const list = () => api.get("/categories").then((r) => r.data);
export const create = (payload) => api.post("/categories", payload).then((r) => r.data);
export const update = (id, payload) => api.put(`/categories/${id}`, payload).then((r) => r.data);
export const remove = (id) => api.delete(`/categories/${id}`).then((r) => r.data);
