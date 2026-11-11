import { NavLink, Link, useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import PageTransition from "../components/ui/PageTransition";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: "✦", end: true },
  { to: "/dashboard/orders", label: "Orders", icon: "📦" },
  { to: "/dashboard/wishlist", label: "Wishlist", icon: "♡" },
  { to: "/dashboard/addresses", label: "Addresses", icon: "⌂" },
  { to: "/dashboard/profile", label: "Profile", icon: "○" },
];

export default function UserDashboardLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="user-dash-shell relative">
      <div className="container-narrow py-8 lg:py-12">
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest" style={{ color: "var(--atelier-muted)" }}>
              My account
            </p>
            <h1
              className="mt-1 text-3xl font-bold sm:text-4xl"
              style={{ fontFamily: "var(--font-display)", color: "var(--atelier-ink)" }}
            >
              Hello, {user?.name?.split(" ")[0] || "there"}
            </h1>
          </div>
          <div className="flex gap-3">
            <Link to="/products" className="btn-outline text-sm py-2">
              Continue shopping
            </Link>
            {user?.role === "admin" && (
              <Link
                to="/admin"
                className="rounded-full px-4 py-2 text-sm font-semibold text-white"
                style={{ background: "var(--atelier-accent)" }}
              >
                Admin panel
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="lg:w-56 shrink-0">
            <div className="atelier-card sticky top-24 p-3">
              <nav className="flex flex-row flex-wrap gap-1 lg:flex-col">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) => `atelier-nav-link ${isActive ? "active" : ""}`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="atelier-nav-link mt-4 w-full text-red-600"
              >
                Sign out
              </button>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <PageTransition />
          </main>
        </div>
      </div>
    </div>
  );
}
