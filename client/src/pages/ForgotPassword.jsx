import { useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useContext(AuthContext);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await forgotPassword(email);
    if (res.success) {
      setSent(true);
      showToast("If that email is registered, a reset link was sent.", "success");
    } else showToast(res.message, "error");
    setLoading(false);
  };

  return (
    <div className="gradient-mesh flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="card-surface w-full max-w-md p-8" role="status">
        <h1 className="section-title text-center text-2xl">Forgot password</h1>
        <p className="text-muted mt-2 text-center text-sm">
          Enter your email to receive a reset link (expires in 1 hour).
        </p>
        {sent && (
          <p
            className="mt-5 rounded-xl px-4 py-3 text-sm font-medium"
            style={{ background: "var(--success-soft)", color: "var(--success-ink)" }}
          >
            Check your inbox — the reset link is on its way.
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input-field"
              placeholder="you@example.com"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="text-muted mt-6 text-center text-sm">
          <Link
            to="/login"
            className="font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--accent-hover)" }}
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
