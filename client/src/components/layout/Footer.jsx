import { Link } from "react-router-dom";
import { useState } from "react";
import { useToast } from "../../context/ToastContext";
import api from "../../services/api";

function Footer() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [joining, setJoining] = useState(false);

  const handleNewsletter = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setJoining(true);
    try {
      const res = await api.post("/newsletter/subscribe", { email: email.trim() });
      showToast(res.data?.message || "Welcome to the Ghost Panda circle!", "success");
      setEmail("");
    } catch (err) {
      showToast(err.response?.data?.message || "Join failed. Try again.", "error");
    } finally {
      setJoining(false);
    }
  };

  return (
    <footer className="mt-auto" style={{ background: "var(--ink)", color: "var(--bg)" }}>
      <div className="container-narrow py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-2 text-2xl font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
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
            <p className="mt-4 text-sm opacity-70 leading-relaxed">
              Curated essentials for the modern connoisseur. Quality, craft, and conscious commerce.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-60">
              Explore
            </h4>
            <ul className="space-y-3 text-sm">
              {[
                { to: "/products", label: "All Products" },
                { to: "/about", label: "Our Story" },
                { to: "/contact", label: "Contact" },
                { to: "/dashboard/orders", label: "Track Order" },
              ].map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="opacity-80 transition-opacity hover:opacity-100">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-60">
              Support
            </h4>
            <ul className="space-y-3 text-sm opacity-80">
              <li>Free shipping over ₹500</li>
              <li>30-day easy returns</li>
              <li>Secure checkout</li>
              <li>support@ghostpanda.store</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-60">
              Newsletter
            </h4>
            <p className="mb-4 text-sm opacity-70">Early access to drops & exclusive offers.</p>
            <form onSubmit={handleNewsletter} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                aria-label="Email address for the newsletter"
                className="footer-field flex-1 rounded-full px-4 py-2.5 text-sm outline-none"
                required
              />
              <button
                type="submit"
                disabled={joining}
                className="footer-btn shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--ink)" }}
              >
                {joining ? "..." : "Join"}
              </button>
            </form>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm sm:flex-row"
          style={{ borderColor: "rgba(255,255,255,0.15)" }}
        >
          <p className="opacity-60">© {new Date().getFullYear()} Ghost Panda. All rights reserved.</p>
          <div className="flex gap-6">
            {[
              { name: "Instagram", url: "https://instagram.com" },
              { name: "Twitter", url: "https://twitter.com" },
              { name: "Pinterest", url: "https://pinterest.com" },
            ].map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ghost Panda on ${s.name}`}
                className="opacity-70 transition-opacity hover:opacity-100"
              >
                {s.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
