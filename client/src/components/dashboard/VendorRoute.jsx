import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export default function VendorRoute({ children }) {
  const { user, token, loading } = useContext(AuthContext);
  const location = useLocation();

  if (token && !user && loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!token || !user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (user && !["vendor", "admin"].includes(user.role)) return <Navigate to="/vendor/register" replace />;
  return children;
}
