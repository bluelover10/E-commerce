import api from "./api";

export const login = async (email, password) => {
  const response = await api.post("/users/login", { email, password });
  return response.data;
};

export const register = async (name, email, password, confirmPassword) => {
  const response = await api.post("/users/register", {
    name,
    email,
    password,
    confirmPassword,
  });
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get("/users/profile");
  return response.data;
};

export const updateProfile = async (updates) => {
  const response = await api.put("/users/profile", updates);
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post("/users/forgot-password", { email });
  return response.data;
};

export const resetPassword = async (token, password, confirmPassword) => {
  const response = await api.post(`/users/reset-password/${token}`, { password, confirmPassword });
  return response.data;
};

export const changePassword = async (currentPassword, newPassword, confirmNewPassword) => {
  const response = await api.put("/users/change-password", {
    currentPassword,
    newPassword,
    confirmNewPassword,
  });
  return response.data;
};

// One-click entry into the public demo (dedicated customer account)
export const demoLogin = async () => {
  const response = await api.post("/users/demo-login", {});
  return response.data;
};

export const verifyEmailOTP = async (code, email) => {
  const response = await api.post("/users/verify-email", { code, email });
  return response.data;
};

export const verifyEmailByLink = async (token) => {
  const response = await api.get(`/users/verify-email/${token}`);
  return response.data;
};

// Keep old name for backwards compat (link flow)
export const verifyEmail = verifyEmailByLink;

export const resendVerification = async (email) => {
  const response = await api.post("/users/resend-verification", email ? { email } : {});
  return response.data;
};

export const addToWishlist = async (productId) => {
  const response = await api.post("/users/wishlist/add", { productId });
  return response.data;
};

export const removeFromWishlist = async (productId) => {
  const response = await api.post("/users/wishlist/remove", { productId });
  return response.data;
};
