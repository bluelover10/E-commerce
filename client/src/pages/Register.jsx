import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import PasswordInput from "../components/ui/PasswordInput";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.confirmPassword
    );

    if (result.success) navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    else setError(result.message);
    setLoading(false);
  };

  return (
    <div className="gradient-mesh flex min-h-[calc(100svh-var(--nav-height))] items-center justify-center px-4 py-16">
      <div
        className="w-full max-w-md animate-fade-up rounded-3xl p-8 sm:p-10"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="mb-8 text-center">
          <h1 className="section-title text-2xl">Join Ghost Panda</h1>
          <p className="text-muted mt-2 text-sm">Create your account in seconds</p>
        </div>

        {error && (
          <div
            className="mb-4 rounded-xl px-4 py-3 text-sm font-medium"
            style={{ background: "var(--danger-soft)", color: "var(--danger-ink)" }}
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Full name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input-field"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input-field"
              placeholder="you@example.com"
            />
          </div>
          <PasswordInput
            label="Password"
            name="password"
            id="register-password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <PasswordInput
            label="Confirm password"
            name="confirmPassword"
            id="register-confirm"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-muted mt-8 text-center text-sm">
          Already a member?{" "}
          <Link to="/login" style={{ color: "var(--accent-hover)" }} className="font-semibold transition-opacity hover:opacity-80">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
