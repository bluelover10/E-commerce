import { NavLink, useNavigate } from "react-router-dom";
import PageTransition from "../components/ui/PageTransition";

const NAV = [
  { to: "/vendor/dashboard", label: "Overview", end: true },
  { to: "/vendor/products", label: "Products" },
  { to: "/vendor/orders", label: "Orders" },
];

export default function VendorLayout() {
  return (
    <div className="user-dash-shell">
      <div className="container-narrow flex flex-col gap-6 py-8 lg:flex-row">
        <aside className="atelier-card h-fit w-full shrink-0 p-4 lg:w-60">
          <p className="px-2 text-xs font-semibold uppercase tracking-widest text-muted">Seller centre</p>
          <nav className="mt-3 flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `atelier-nav-link ${isActive ? "active" : ""}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <PageTransition />
        </main>
      </div>
    </div>
  );
}
