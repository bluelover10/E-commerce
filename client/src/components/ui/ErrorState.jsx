export default function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border p-10 text-center"
      style={{
        borderColor: "color-mix(in srgb, var(--danger) 30%, var(--border))",
        background: "color-mix(in srgb, var(--danger) 6%, transparent)",
      }}
      role="alert"
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "var(--danger-soft)", color: "var(--danger-ink)" }}
        aria-hidden="true"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </div>
      <p className="max-w-sm text-sm font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline btn-sm">
          Try again
        </button>
      )}
    </div>
  );
}
