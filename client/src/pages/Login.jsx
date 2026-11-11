import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import PasswordInput from "../components/ui/PasswordInput";
import { DEMO_CREDENTIALS } from "../config/demo";
import { useReveal } from "../hooks/useReveal";

/* ── Icons ─────────────────────────────────────────────────────────────── */
const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const IconArrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </svg>
);

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/dashboard";
  const sideRef = useReveal();
  const formRef = useReveal();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email.trim(), password);
    if (result.success) navigate("/dashboard", { replace: true });
    else setError(result.message);
    setLoading(false);
  };

  /* ── Demo Access panel — rendered ONLY on this login page ─────────────── */
  const DemoAccessPanel = () => {
    const { demoLogin } = useContext(AuthContext);
    const [demoLoading, setDemoLoading] = useState(false);
    const [demoError, setDemoError] = useState("");
    const [copied, setCopied] = useState(""); // "email" | "password"
    const timerRef = useRef(null);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const copy = async (field, value) => {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        // Clipboard permission fallback
        const el = document.createElement("textarea");
        el.value = value;
        document.body.appendChild(el);
        el.select();
        try { document.execCommand("copy"); } catch { /* ignore */ }
        document.body.removeChild(el);
      }
      setCopied(field);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(""), 1800);
    };

    const handleDemoLogin = async () => {
      setDemoError("");
      setDemoLoading(true);
      const result = await demoLogin();
      setDemoLoading(false);
      if (result.success) {
        navigate("/dashboard", { replace: true });
      } else {
        setDemoError(result.message);
      }
    };

    const handleUseDemo = () => {
      setEmail(DEMO_CREDENTIALS.email);
      setPassword(DEMO_CREDENTIALS.password);
      setDemoError("");
    };

    return (
      <section className="demo-card" aria-label="Demo access">
        <div className="demo-card-inner">
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent-hover)" }}>
                <IconShield /> Demo access
              </p>
              <h2 className="mt-1.5 text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Try Ghost Panda instantly
              </h2>
              <p className="text-muted mt-1 text-sm">
                This is a public demo — sign in with the shared account below. No signup needed.
              </p>
            </div>
            <span className="status-chip success" aria-label="Demo account">demo</span>
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="demo-cred-row">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Email</p>
                <p className="truncate text-sm font-semibold" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  {DEMO_CREDENTIALS.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copy("email", DEMO_CREDENTIALS.email)}
                className={`copy-btn micro-press ${copied === "email" ? "copied" : ""}`}
                aria-label={`Copy demo email ${copied === "email" ? "(copied)" : ""}`}
              >
                {copied === "email" ? <IconCheck /> : <IconCopy />}
              </button>
            </div>
            <div className="demo-cred-row">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Password</p>
                <p className="truncate text-sm font-semibold" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  {DEMO_CREDENTIALS.password}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copy("password", DEMO_CREDENTIALS.password)}
                className={`copy-btn micro-press ${copied === "password" ? "copied" : ""}`}
                aria-label={`Copy demo password ${copied === "password" ? "(copied)" : ""}`}
              >
                {copied === "password" ? <IconCheck /> : <IconCopy />}
              </button>
            </div>
          </div>

          {demoError && (
            <p className="mt-3 text-xs font-medium" style={{ color: "var(--danger-ink)" }} role="alert">
              {demoError}
            </p>
          )}

          <div className="relative mt-4 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="btn-accent btn-sm flex-1"
            >
              {demoLoading ? "Signing you in…" : "Login as Demo"}
            </button>
            <button
              type="button"
              onClick={handleUseDemo}
              className="btn-ghost btn-sm flex-1 icon-nudge"
            >
              Use Demo Account <IconArrow />
            </button>
          </div>
          <p className="relative mt-3 text-[11px] leading-relaxed text-muted">
            The demo account is a standard customer account — browse, add to cart, place orders and
            leave reviews. Admin and vendor tools are not part of the demo.
          </p>
        </div>
      </section>
    );
  };

  return (
    <div className="gradient-mesh min-h-[calc(100svh-var(--nav-height))] px-4 pb-20 pt-10 sm:pt-16">
      <div className="container-narrow grid items-start gap-10 lg:grid-cols-[1.1fr_minmax(0,460px)] lg:items-center">
        {/* Brand story — desktop only */}
        <div ref={sideRef} className="reveal hidden lg:block">
          <span className="badge mb-5">Welcome back</span>
          <h1 className="section-title !text-5xl leading-[1.05]">
            Your curated corner of&nbsp;
            <span style={{ color: "var(--accent-hover)" }}>Ghost Panda</span>
          </h1>
          <p className="text-muted mt-5 max-w-md text-base leading-relaxed">
            Sign in to pick up where you left off — your cart, wishlist and orders are
            exactly where you left them.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              ["Secure sessions", "Rotating refresh tokens in httpOnly cookies."],
              ["Fast checkout", "Saved addresses and one-tap ordering."],
              ["Live updates", "Real-time order and delivery notifications."],
            ].map(([title, desc], i) => (
              <li
                key={title}
                className="animate-fade-up flex gap-3.5"
                style={{ animationDelay: `${0.15 + i * 0.12}s`, animationFillMode: "backwards" }}
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--success-soft)", color: "var(--success-ink)" }}
                  aria-hidden="true"
                >
                  <IconCheck />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-sm text-muted">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Form */}
        <div ref={formRef} className="reveal mx-auto w-full max-w-md">
          <div className="card-surface !transform-none p-7 sm:p-9">
            <h1 className="section-title !text-3xl">Sign in</h1>
            <p className="text-muted mt-1.5 text-sm">Enter your details to continue.</p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
              {error && (
                <p
                  className="rounded-xl px-4 py-3 text-sm font-medium"
                  style={{ background: "var(--danger-soft)", color: "var(--danger-ink)" }}
                  role="alert"
                >
                  {error}
                </p>
              )}
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium">Email</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                  spellCheck={false}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ color: "var(--accent-hover)" }}
                  >
                    Forgot?
                  </Link>
                </div>
                <PasswordInput
                  id="login-password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Your password"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="text-muted mt-6 text-center text-sm">
              New here?{" "}
              <Link
                to="/register"
                className="font-semibold transition-opacity hover:opacity-80"
                style={{ color: "var(--accent-hover)" }}
              >
                Create an account
              </Link>
            </p>
          </div>

          <div className="mt-6">
            <DemoAccessPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
