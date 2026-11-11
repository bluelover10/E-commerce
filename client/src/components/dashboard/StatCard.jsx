export function AdminStatCard({ label, value, sub, accent = "indigo", icon }) {
  // Gradient tints are translucent on the light admin surface; the icon
  // "ink" reads semantic admin tokens so it stays readable everywhere.
  const accents = {
    indigo: { grad: "from-indigo-500/15 to-transparent", ink: "text-[var(--dash-accent-2)]" },
    sky: { grad: "from-sky-500/15 to-transparent", ink: "text-[var(--dash-info-ink)]" },
    emerald: { grad: "from-emerald-500/15 to-transparent", ink: "text-[var(--dash-success-ink)]" },
    amber: { grad: "from-amber-500/15 to-transparent", ink: "text-[var(--dash-warning-ink)]" },
  };
  const icons = {
    revenue: <text x="12" y="17" textAnchor="middle" fontSize="15" fontWeight="600" fill="currentColor" stroke="none">₹</text>,
    orders: <path d="M6 6h15l-1.5 9h-12zM9 20a1.4 1.4 0 1 0 0-.01M18 20a1.4 1.4 0 1 0 0-.01M6 6 5 3H2" />,
    products: <path d="m21 8-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" />,
    customers: <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M16 4a3.5 3.5 0 0 1 0 7M17.5 14.5a6.5 6.5 0 0 1 4 5.5" />,
    vendors: <path d="M3 9 5 3h14l2 6M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 21v-6h6v6" />,
  };

  return (
    <div className="admin-panel admin-stat-glow relative overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-0.5">
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${(accents[accent] || accents.indigo).grad} opacity-50`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--dash-muted)]">{label}</p>
          <p className="mt-2 truncate text-3xl font-bold tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-[var(--dash-muted)]">{sub}</p>}
        </div>
        {icon && icons[icon] && (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--dash-tile-bg)", boxShadow: "var(--dash-inset)", border: "1px solid var(--dash-border)" }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={(accents[accent] || accents.indigo).ink}>
              {icons[icon]}
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}

export function AtelierStatCard({ label, value, icon }) {
  return (
    <div className="atelier-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--atelier-muted)" }}>
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {value}
          </p>
        </div>
        {icon && <span className="text-2xl opacity-80">{icon}</span>}
      </div>
    </div>
  );
}
