import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, token, loading } = useContext(AuthContext);
  const location = useLocation();

  // If we have a token but haven't resolved the user yet, wait —
  // rendering children here would fire admin API calls before we know
  // whether the token is even valid, causing spurious 401s in the console.
  if (token && !user && loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
