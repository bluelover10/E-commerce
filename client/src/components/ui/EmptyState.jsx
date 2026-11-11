export default function EmptyState({
  icon,
  title = "Nothing here",
  message = "Try adjusting your filters.",
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 60%, transparent)" }}>
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-2xl"
        style={{ background: "var(--success-soft)", color: "var(--success-ink)" }}
        aria-hidden="true"
      >
        {icon || (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {action}
    </div>
  );
}
