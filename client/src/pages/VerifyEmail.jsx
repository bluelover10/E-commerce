import { useEffect, useRef, useState, useContext } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { verifyEmailByLink } from "../services/userService";

const RESEND_COOLDOWN = 60;
const formatCooldown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Ported from Local/client/src/pages/EmailVerificationPage.jsx (6-digit OTP)
// + legacy link support: /verify-email/:token still verifies old emails.
export default function VerifyEmail() {
  const { token } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { user, verifyOTP, resendOTP } = useContext(AuthContext);
  const { showToast } = useToast();

  const emailFromQuery = search.get("email") || user?.email || localStorage.getItem("pendingEmail") || "";
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(token ? 0 : RESEND_COOLDOWN);
  const [linkStatus, setLinkStatus] = useState(token ? "loading" : "otp");
  const [error, setError] = useState("");

  // Legacy link flow
  useEffect(() => {
    if (!token) return;
    verifyEmailByLink(token)
      .then(() => setLinkStatus("success"))
      .catch(() => setLinkStatus("error"));
  }, [token]);

  useEffect(() => {
    if (cooldown <= 0 || token) return;
    const t = setInterval(() => setCooldown((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown, token]);

  const handleChange = (index, value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length > 1) {
      const next = [...code];
      for (let i = 0; i < digits.length && index + i < 6; i++) next[index + i] = digits[i];
      setCode(next);
      inputRefs.current[Math.min(index + digits.length, 5)]?.focus();
    } else if (digits.length === 1) {
      const next = [...code];
      next[index] = digits;
      setCode(next);
      if (index < 5) inputRefs.current[index + 1]?.focus();
    } else if (value === "") {
      const next = [...code];
      next[index] = "";
      setCode(next);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const doVerify = async (fullCode) => {
    const v = fullCode || code.join("");
    if (v.length !== 6 || verifying) return;
    setVerifying(true);
    setError("");
    const res = await verifyOTP(v, emailFromQuery);
    if (res.success) {
      showToast("Email verified successfully 🎉", "success");
      navigate("/");
    } else {
      setError(res.message);
    }
    setVerifying(false);
  };

  useEffect(() => {
    if (!token && code.every((d) => d !== "")) doVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    if (!emailFromQuery) {
      showToast("No account email found. Please sign up again.", "error");
      return;
    }
    setResending(true);
    const res = await resendOTP(emailFromQuery);
    if (res.success) {
      showToast(import.meta.env.DEV && res.otp ? `New code sent! OTP: ${res.otp}` : "New verification code sent.", "success");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setCooldown(res.retryAfter || RESEND_COOLDOWN);
    } else {
      showToast(res.message, "error");
      if (res.retryAfter) setCooldown(res.retryAfter);
    }
    setResending(false);
  };

  if (token) {
    return (
      <div className="gradient-mesh flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        {linkStatus === "loading" && (
          <div
            className="h-9 w-9 animate-spin rounded-full border-3 border-transparent"
            style={{ borderTopColor: "var(--accent)", borderRightColor: "var(--accent)" }}
            role="status"
            aria-label="Verifying email"
          />
        )}
        {linkStatus === "success" && (
          <div
            className="card-surface w-full max-w-md p-10 text-center"
            role="status"
          >
            <div
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "var(--success-soft)", color: "var(--success-ink)" }}
              aria-hidden="true"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 className="section-title !text-2xl">Email verified 🎉</h1>
            <p className="text-muted mt-2 text-sm">Your account is fully activated. Welcome in!</p>
            <Link to="/login" className="btn-primary btn-sm mt-6 inline-flex">
              Go to login
            </Link>
          </div>
        )}
        {linkStatus === "error" && (
          <div
            className="card-surface w-full max-w-md p-10 text-center"
            role="alert"
          >
            <div
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "var(--warning-soft)", color: "var(--warning-ink)" }}
              aria-hidden="true"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>
            <h1 className="section-title !text-2xl">Link invalid or expired</h1>
            <p className="text-muted mt-2 text-sm">This verification link can't be used anymore.</p>
            <Link to="/verify-email" className="btn-primary btn-sm mt-6 inline-flex">
              Verify with a code instead
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="gradient-mesh flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl p-5 sm:p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="section-title text-2xl text-center">Verify Your Email</h2>
        <p className="text-muted mt-2 text-center text-sm break-words">
          Enter the 6-digit code sent to <strong>{emailFromQuery || "your email"}</strong>. Expires in 5 minutes.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); doVerify(); }} className="mt-6 space-y-6">
          <div className="flex justify-center gap-1.5 sm:gap-2">
            {code.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                aria-label={`Digit ${i + 1}`}
                className="input-field h-10 w-10 px-0 text-center text-lg font-bold sm:h-12 sm:w-12 sm:text-xl"
              />
            ))}
          </div>
          {error && (
            <p
              className="text-sm font-medium"
              style={{ color: "var(--danger-ink)" }}
              role="alert"
            >
              {error}
            </p>
          )}
          <button type="submit" disabled={verifying || code.some((d) => !d)} className="btn-primary w-full disabled:opacity-50">
            {verifying ? "Verifying..." : "Verify Email"}
          </button>
        </form>
        <p className="text-muted mt-6 text-center text-sm">
          Didn&apos;t receive the code?{" "}
          {cooldown > 0 ? (
            <span>Resend in {formatCooldown(cooldown)}</span>
          ) : (
            <button type="button" onClick={handleResend} disabled={resending} className="font-semibold hover:underline disabled:opacity-50" style={{ color: "var(--accent)" }}>
              {resending ? "Sending..." : "Resend code"}
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
