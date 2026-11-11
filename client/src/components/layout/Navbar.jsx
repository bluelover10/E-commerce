import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { AuthContext } from "../../context/AuthContext";
import { CartContext } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { useSocket } from "../../hooks/useSocket";
const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const { getCartCount } = useContext(CartContext);
  const { showToast } = useToast();
  const unread = useSelector((s) => s.notifications.unread);
  // Realtime: join user/vendor/admin rooms, push notifications into Redux + toast
  useSocket({ user, onToast: (title, msg) => showToast(msg ? `${title}: ${msg}` : title, "info") });
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const cartCount = getCartCount();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <>
      <header
        className={`glass-nav fixed top-0 right-0 left-0 z-50 transition-shadow duration-300 ${scrolled ? "shadow-md" : ""
          }`}
      >
        <div className="container-narrow flex h-[var(--nav-height)] items-center gap-4 lg:gap-8">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 font-display text-xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: "var(--accent)", color: "var(--ink)" }}
            >
              <img
                src="/favicon.png"
                alt="Logo"
                className="h-8 w-8 object-contain"
              />
            </span>
            Ghost Panda
          </Link>

          <form onSubmit={handleSearch} className="hidden flex-1 md:flex md:max-w-md lg:max-w-lg">
            <div className="nav-search flex w-full items-center gap-2 rounded-full px-4 py-2.5">
              <IconSearch />
              <input
                type="search"
                placeholder="Search curated pieces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--ink)" }}
              />
            </div>
          </form>

          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="relative text-sm font-medium transition-colors"
                aria-current={location.pathname === link.to ? "page" : undefined}
                style={{
                  color: location.pathname === link.to ? "var(--accent)" : "var(--muted)",
                }}
              >
                {link.label}
                {location.pathname === link.to && (
                  <span
                    className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {user && (
              <Link to="/notifications" className="relative hidden h-10 w-10 items-center justify-center rounded-full sm:flex" title="Notifications" style={{ color: "var(--ink)" }}>
                <IconBell />
                {unread > 0 && <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
              </Link>
            )}
            <Link
              to="/wishlist"
              className="hidden h-10 w-10 items-center justify-center rounded-full sm:flex"
              style={{ color: "var(--ink)" }}
              title="Wishlist"
            >
              <IconHeart />
            </Link>

            <Link
              to="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full"
              style={{ color: "var(--ink)" }}
              title="Cart"
            >
              <IconCart />
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={{ background: "var(--teal)", color: "#fff" }}
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors"
                  style={{ border: "1px solid var(--border)", color: "var(--ink)" }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-xs font-bold"
                    style={{ background: "var(--accent)" }}
                  >
                    {user.profileImage ? (
                      <img src={user.profileImage} alt="Profile" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      user.name?.charAt(0)?.toUpperCase() || "U"
                    )}
                  </span>
                  <span className="hidden max-w-[100px] truncate lg:inline">{user.name}</span>
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div
                      className="absolute right-0 z-50 mt-2 min-w-[200px] overflow-hidden rounded-2xl py-2 shadow-lg"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    >
                      {[
                        { to: "/dashboard", label: "My dashboard" },
                        { to: "/dashboard/orders", label: "Orders" },
                        { to: "/dashboard/wishlist", label: "Wishlist" },
                        { to: "/notifications", label: "Notifications" },
                        ...(user.role === "vendor" || user.role === "admin"
                          ? [{ to: "/vendor/dashboard", label: "Seller centre" }]
                          : [{ to: "/vendor/register", label: "Become a seller" }]),
                        ...(user.role === "admin"
                          ? [{ to: "/admin", label: "Admin command" }]
                          : []),
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className="block px-4 py-2.5 text-sm transition-colors hover:opacity-80"
                          style={{ color: "var(--ink)" }}
                        >
                          {item.label}
                        </Link>
                      ))}
                      <button
                        onClick={() => {
                          logout();
                          navigate("/");
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-500"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/login" className="btn-outline px-4 py-2 text-xs">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary px-4 py-2 text-xs">
                  Join
                </Link>
              </div>
            )}

            <button
              className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              <span
                className={`h-0.5 w-5 rounded-full transition-all ${mobileOpen ? "translate-y-2 rotate-45" : ""}`}
                style={{ background: "var(--ink)" }}
              />
              <span
                className={`h-0.5 w-5 rounded-full transition-all ${mobileOpen ? "opacity-0" : ""}`}
                style={{ background: "var(--ink)" }}
              />
              <span
                className={`h-0.5 w-5 rounded-full transition-all ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`}
                style={{ background: "var(--ink)" }}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 lg:hidden ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
      >
        <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
        <div
          className={`absolute top-0 right-0 flex h-full w-[min(320px,85vw)] flex-col gap-6 p-6 pt-24 transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "translate-x-full"
            }`}
          style={{ background: "var(--surface)" }}
        >
          <form onSubmit={handleSearch}>
            <input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
            />
          </form>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-lg font-medium"
              style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <>
              <Link to="/dashboard" className="text-muted">
                Dashboard
              </Link>
              <Link to="/dashboard/wishlist" className="text-muted">
                Wishlist
              </Link>
              <Link to="/dashboard/orders" className="text-muted">
                Orders
              </Link>
            </>
          )}
          {user?.role === "admin" && (
            <Link to="/admin" className="text-muted font-semibold">
              Admin panel
            </Link>
          )}
          {!user ? (
            <div className="mt-auto flex flex-col gap-3">
              <Link to="/login" className="btn-outline w-full text-center">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary w-full text-center">
                Create account
              </Link>
            </div>
          ) : (
            <div className="mt-auto flex flex-col gap-3">
              <p className="text-sm text-muted truncate">Signed in as {user.name}</p>
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                  navigate("/");
                }}
                className="btn-outline w-full text-center text-red-500"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-[var(--nav-height)]" aria-hidden />
    </>
  );
}

export default Navbar;
