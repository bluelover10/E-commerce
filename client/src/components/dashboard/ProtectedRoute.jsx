import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, token, loading } = useContext(AuthContext);
  const location = useLocation();

  // Wait for the initial token → user resolution before rendering pages
  // that immediately fire authenticated API calls (avoids spurious 401s
  // on refresh while fetchCurrentUser() is still in flight).
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

  return children;
}
