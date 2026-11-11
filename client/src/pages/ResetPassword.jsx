import { useState, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import PasswordInput from "../components/ui/PasswordInput";

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useContext(AuthContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      showToast("Passwords do not match", "error");
      return;
    }
    setLoading(true);
    const res = await resetPassword(token, password, confirm);
    if (res.success) {
      showToast("Password reset successfully. Please login.", "success");
      navigate("/login");
    } else {
      showToast(res.message, "error");
    }
    setLoading(false);
  };

  return (
    <div className="gradient-mesh flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h1 className="section-title text-2xl text-center">Reset password</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <PasswordInput label="New password (min 8)" name="new-password" id="reset-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          <PasswordInput label="Confirm password" name="confirm-password" id="reset-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">{loading ? "Resetting..." : "Reset password"}</button>
        </form>
        <p className="text-muted mt-6 text-center text-sm"><Link to="/login" className="font-semibold" style={{ color: "var(--accent)" }}>Back to login</Link></p>
      </div>
    </div>
  );
}
