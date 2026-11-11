import { NavLink, Link, useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import PageTransition from "../components/ui/PageTransition";

const DESKTOP_QUERY = "(min-width: 1024px)";

const NAV = [
  { to: "/admin", label: "Overview", end: true, icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
  ) },
  { to: "/admin/analytics", label: "Analytics", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></svg>
  ) },
  { to: "/admin/orders", label: "Orders", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6h15l-1.5 9h-12z" /><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M6 6 5 3H2" /></svg>
  ) },
  { to: "/admin/products", label: "Products", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m21 8-9-5-9 5v8l9 5 9-5z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></svg>
  ) },
  { to: "/admin/vendors", label: "Vendors", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9 5 3h14l2 6" /><path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 21v-6h6v6" /></svg>
  ) },
  { to: "/admin/catalog", label: "Coupons & Categories", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4z" /><path d="M13 7v2m0 6v2" strokeDasharray="2 3" /></svg>
  ) },
  { to: "/admin/users", label: "Customers", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4a3.5 3.5 0 0 1 0 7" /><path d="M17.5 14.5a6.5 6.5 0 0 1 4 5.5" /></svg>
  ) },
  { to: "/admin/messages", label: "Messages", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3 8 9 5.5L21 8" /></svg>
  ) },
];

export default function AdminLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  // ONE source of truth for the sidebar. On desktop it means expanded (icon +
  // label rail, w-64) vs collapsed icon rail (w-20). On mobile it means the
  // off-canvas drawer is open or closed. The hamburger toggles this bit and
  // the sidebar reacts through className — nothing else tracks sidebar state.
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);

  // Keep the state honest when the viewport crosses the lg breakpoint:
  // landing on desktop expands the rail, landing on mobile closes the drawer.
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => {
      setIsDesktop(e.matches);
      setSidebarOpen(e.matches);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Mobile drawer behaviors only (the desktop sidebar is inline, so it needs
  // neither an Escape handler nor a page scroll lock).
  useEffect(() => {
    if (isDesktop || !sidebarOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isDesktop, sidebarOpen]);

  const collapsed = isDesktop && !sidebarOpen;

  return (
    <div className="admin-shell relative flex min-h-screen lg:h-dvh lg:overflow-hidden">
      {/* Mobile drawer overlay — outside click closes (rendered only when the
          drawer can actually be open, i.e. never on desktop). */}
      {sidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm"
          style={{ background: "var(--dash-overlay)" }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="admin-sidebar"
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-[var(--dash-border)] bg-[var(--dash-surface)] transition-[width,transform] duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        {/* Brand — no close icon up here (that X used to read as a stray
            header button); the drawer closes via outside tap, Escape, link
            clicks and the labeled Close menu button at its bottom. */}
        <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? "lg:justify-center lg:px-2" : ""}`}>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--dash-accent)" }}
          >
            <img src="/favicon.png" alt="Ghost Panda logo" className="h-7 w-7 object-contain" />
          </span>
          <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="truncate text-sm font-bold tracking-wide">Ghost Panda</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--dash-muted)]">Command Center</p>
          </div>
        </div>

        {/* min-h-0 lets the nav shrink and scroll internally when the list
            outgrows the fixed-height sidebar — the brand and user card stay
            pinned. In the collapsed desktop rail only the icons remain
            (with a title tooltip for each destination). */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4 [scrollbar-width:thin]">
          <p className={`px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dash-muted)] ${collapsed ? "lg:hidden" : ""}`}>
            Manage
          </p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => {
                // Navigating from the mobile drawer should close it; on
                // desktop the sidebar is permanent and stays as-is.
                if (!isDesktop) setSidebarOpen(false);
              }}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""} ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
              <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User card — in the collapsed rail it condenses to icon actions
            instead of vanishing: the avatar, Storefront and Sign Out stay
            rendered and usable (icon-only with title tooltips). The SAME
            elements adapt; nothing is unmounted or duplicated. */}
        <div className={`mx-3 mb-4 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-tile-bg)] p-3 ${collapsed ? "lg:p-2" : ""}`}>
          <div className={`flex items-center gap-3 ${collapsed ? "lg:justify-center" : ""}`}>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: "var(--dash-accent)", color: "var(--dash-on-accent)" }}
              title={collapsed ? user?.name || "Admin" : undefined}
            >
              {(user?.name || "A").slice(0, 1).toUpperCase()}
            </span>
            <div className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
              <p className="truncate text-xs font-semibold">{user?.name || "Admin"}</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-[var(--dash-muted)]">{user?.email || "admin"}</p>
            </div>
          </div>
          <div className={`mt-3 ${collapsed ? "lg:mt-2 lg:flex lg:flex-col lg:gap-2" : "grid grid-cols-2 gap-2"}`}>
            <Link
              to="/"
              title={collapsed ? "Storefront" : undefined}
              className={`admin-btn-ghost justify-center !text-xs ${collapsed ? "lg:!p-2" : "!px-2 !py-1.5"}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9 5 3h14l2 6" /><path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 21v-6h6v6" /></svg>
              <span className={collapsed ? "lg:hidden" : ""}>Storefront</span>
            </Link>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              title={collapsed ? "Sign out" : undefined}
              className={`admin-btn-danger justify-center !text-xs ${collapsed ? "lg:!p-2" : "!px-2 !py-1.5"}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
              <span className={collapsed ? "lg:hidden" : ""}>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop: this column IS the scroll container — h-dvh + its own
          overflow-y means the page never scrolls as a whole, so the sidebar
          stays put while content moves (and the width follows the collapsed/
          expanded state automatically because both are flex siblings).
          Mobile: normal flow, the document scrolls and the sidebar is the
          off-canvas drawer. */}
      <div className="flex min-w-0 flex-1 flex-col lg:h-dvh lg:overflow-y-auto lg:overscroll-contain">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--dash-border)] bg-[var(--dash-header-bg)] px-4 py-3.5 backdrop-blur-xl lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {/* The one and only hamburger — first element of the header's
                content area, vertically centered with a comfortable hit
                area. Collapses/expands the desktop rail, opens the mobile
                drawer. aria-* wired to the sidebar it controls. */}
            <button
              className="admin-btn-ghost shrink-0 rounded-lg !p-2.5"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label={sidebarOpen ? "Collapse menu" : "Open menu"}
              aria-expanded={sidebarOpen}
              aria-controls="admin-sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <p className="hidden min-w-0 truncate text-sm text-[var(--dash-muted)] lg:block">
              Signed in as <span className="font-semibold text-[var(--dash-accent-2)]">{user?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="admin-chip info"
              style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              Admin
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <PageTransition />
        </main>
      </div>
    </div>
  );
}
