import { useState } from "react";

export default function PasswordInput({
  value,
  onChange,
  name,
  placeholder = "••••••••",
  required = false,
  minLength,
  autoComplete = "current-password",
  label,
  id,
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      {label && (
        <label htmlFor={id || name} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id || name}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="input-field pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          title={show ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full px-2 py-1 text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--muted)" }}
        >
          {show ? "🙈" : "👁️"}
        </button>
      </div>
    </div>
  );
}
