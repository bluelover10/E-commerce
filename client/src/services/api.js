import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL,
  withCredentials: true, // refresh-token httpOnly cookie
});

// Automatically inject JWT token into request headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Silent refresh on 401 (once per request) — keeps sessions alive
let isRefreshing = false;
let queue = [];
const flush = (err, token) => {
  queue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token)));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retry && !original?.url?.includes("/users/login")) {
      // Don't refresh for public 401s without a stored token (OTP errors etc.)
      if (!localStorage.getItem("token")) return Promise.reject(error);
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve: (t) => { original.headers["Authorization"] = `Bearer ${t}`; resolve(api(original)); }, reject });
        });
      }
      isRefreshing = true;
      try {
        const r = await axios.post(`${baseURL}/users/refresh`, {}, { withCredentials: true });
        const next = r.data?.token || r.data?.accessToken;
        if (next) {
          localStorage.setItem("token", next);
          // notify socket (and anything else subscribing) that the token changed
          window.dispatchEvent(new CustomEvent("auth:token-refreshed"));
        }
        flush(null, next);
        original.headers["Authorization"] = `Bearer ${next}`;
        return api(original);
      } catch (e) {
        flush(e, null);
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// We will attach logout-on-401 interceptors in AuthContext where logout is available.
export default api;
