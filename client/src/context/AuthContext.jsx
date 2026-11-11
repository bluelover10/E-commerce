import { createContext, useState, useEffect } from "react";
import api from "../services/api";
import * as userService from "../services/userService";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  // Starts true whenever a token exists, so consumers (like AdminRoute /
  // ProtectedRoute) know to wait for fetchCurrentUser() to resolve before
  // rendering pages that fire authenticated API calls.
  const [loading, setLoading] = useState(!!localStorage.getItem("token"));

  // Only logout on 401 for authenticated requests (had Authorization header).
  // Public 401s (wrong OTP, etc.) must NOT log the user out.
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          const hadAuthHeader = !!error.config?.headers?.Authorization;
          const storedToken = localStorage.getItem("token");
          if (hadAuthHeader && storedToken) {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  // Fetch current user when token changes
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setUser(null);
    }
  }, [token]);

  const normalizeUser = (u) => {
    if (!u) return u;
    if (u.role === "user") return { ...u, role: "customer" };
    return u;
  };

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const userData = await userService.getProfile();
      setUser(normalizeUser(userData));
    } catch (error) {
      console.error("Failed to fetch user:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, confirmPassword) => {
    try {
      setLoading(true);
      const data = await userService.register(name, email, password, confirmPassword);
      
      const nextToken = data.token || data.accessToken;
      setToken(nextToken);
      setUser(normalizeUser(data.user));
      if (nextToken) localStorage.setItem("token", nextToken);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      if (data.user?.email) localStorage.setItem("pendingEmail", data.user.email);
      
      return { success: true, otp: data.otp, email: data.user?.email };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || "Registration failed" 
      };
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (code, email) => {
    try {
      const targetEmail = email || user?.email || localStorage.getItem("pendingEmail");
      const data = await userService.verifyEmailOTP(code, targetEmail);
      if (data.user) setUser(normalizeUser(data.user));
      localStorage.removeItem("pendingEmail");
      return { success: true, message: data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Verification failed"
      };
    }
  };

  const resendOTP = async (email) => {
    try {
      const targetEmail = email || user?.email || localStorage.getItem("pendingEmail");
      const data = await userService.resendVerification(targetEmail);
      return { success: true, message: data.message, otp: data.otp, retryAfter: data.retryAfter };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Resend failed",
        retryAfter: error.response?.data?.retryAfter
      };
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const data = await userService.login(email, password);
      
      const nextToken = data.token || data.accessToken;
      setToken(nextToken);
      setUser(normalizeUser(data.user));
      if (nextToken) localStorage.setItem("token", nextToken);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || "Login failed" 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      api.post("/users/logout").catch(() => {});
    } catch { /* ignore */ }
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("pendingEmail");
  };

  const updateProfile = async (updates) => {
    try {
      setLoading(true);
      const data = await userService.updateProfile(updates);
      setUser(normalizeUser(data.user));
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || "Update failed" 
      };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      await userService.forgotPassword(email);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || "Forgot password request failed" 
      };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (resetToken, password, confirmPassword) => {
    try {
      setLoading(true);
      await userService.resetPassword(resetToken, password, confirmPassword || password);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || "Password reset failed" 
      };
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword, confirmNewPassword) => {
    try {
      setLoading(true);
      await userService.changePassword(currentPassword, newPassword, confirmNewPassword || newPassword);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || "Change password failed" 
      };
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (productId) => {
    try {
      const data = await userService.addToWishlist(productId);
      setUser(prev => ({ ...prev, wishlist: data.wishlist }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const data = await userService.removeFromWishlist(productId);
      setUser(prev => ({ ...prev, wishlist: data.wishlist }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  };

  // Public demo account — credentials are intentionally published on the
  // login page; this endpoint issues a session for the demo customer.
  const demoLogin = async () => {
    try {
      setLoading(true);
      const data = await userService.demoLogin();
      const nextToken = data.token || data.accessToken;
      if (nextToken) {
        setToken(nextToken);
        localStorage.setItem("token", nextToken);
      }
      if (data.user) setUser(normalizeUser(data.user));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Demo login failed. Is the demo data seeded on the server?"
      };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      register,
      login,
      logout,
      demoLogin,
      verifyOTP,
      resendOTP,
      updateProfile,
      forgotPassword,
      resetPassword,
      changePassword,
      addToWishlist,
      removeFromWishlist
    }}>
      {children}
    </AuthContext.Provider>
  );
}
