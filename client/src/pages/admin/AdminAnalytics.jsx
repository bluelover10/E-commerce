import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOverview } from "../../store/slices/analyticsSlice";
import { AdminStatCard } from "../../components/dashboard/StatCard";
import { formatPrice } from "../../utils/format";
import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie, LabelList,
} from "recharts";

// Chart palette — mirrors the admin theme tokens in index.css (--dash-*).
// SVG presentation attributes (strokes/fills) can't read CSS variables, so
// these are plain constants; the admin panel is light-only by design, so the
// white dot/activeDot rings sit on the white panel surface by definition.
// Indigo = money metrics, sky = unit metrics; the remaining hues are
// categorical accents for the status donut only. Single-series charts use
// one color — no rainbow bars, no neon.
const C = {
  primary: "#4f46e5", // indigo-600 — revenue / money
  units: "#0284c7",   // sky-600   — units sold
  emerald: "#16a34a",
  amber: "#d97706",
  rose: "#e11d48",
  violet: "#7c3aed",
  teal: "#0d9488",
  slate: "#64748b",
};
const PIE_COLORS = [C.primary, C.units, C.emerald, C.amber, C.rose, C.violet, C.teal, C.slate];
const GRID = "rgba(15, 23, 42, 0.07)";  // horizontal grid lines
const AXIS = "rgba(15, 23, 42, 0.12)";  // axis lines (slightly stronger)
const TICK = { fill: "#64748b", fontSize: 11 };
const BAR_CURSOR = "rgba(2, 132, 199, 0.08)";
const AREA_CURSOR = "rgba(79, 70, 229, 0.08)";
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const shortMonth = (ym) => {
  if (!ym) return "";
  const [y, m] = String(ym).split("-");
  return `${MONTH_NAMES[Number(m) - 1] || ym} '${String(y).slice(2)}`;
};
const compact = (n) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : `${n}`;

function Panel({ title, subtitle, action, children }) {
  return (
    <div className="admin-panel p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--dash-muted)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--dash-muted)] opacity-80">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ChartEmpty({ icon, label }) {
  return (
    <div className="admin-empty" style={{ minHeight: 220, justifyContent: "center" }}>
      <span className="admin-empty-icon">{icon}</span>
      {label}
    </div>
  );
}

/* Shared tooltip — one consistent look across every chart */
function MoneyTooltip({ active, payload, label, moneyKey = "revenue" }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload || {};
  return (
    <div
      className="rounded-xl px-4 py-3 text-xs shadow-xl"
      style={{
        background: "var(--dash-tooltip-bg)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid var(--dash-border-strong)",
        color: "var(--dash-text)",
      }}
    >
      <p className="mb-1.5 font-semibold">{label ?? p.name ?? p.storeName}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color || entry.fill }} />
          <span className="capitalize text-[var(--dash-muted)]">
            {entry.dataKey === "revenue" ? "Revenue" : entry.dataKey === "orders" ? "Orders" : entry.dataKey === "sales" ? "Units sold" : entry.dataKey === "units" ? "Units" : entry.dataKey}:
          </span>
          <span className="font-semibold">
            {entry.dataKey === "revenue" ? formatPrice(entry.value) : entry.value}
          </span>
        </p>
      ))}
      {p.orders != null && moneyKey === "revenue" && payload[0]?.dataKey !== "orders" && (
        <p className="mt-1 border-t border-[var(--dash-border)] pt-1.5 text-[var(--dash-muted)]">
          {p.orders} order{p.orders === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

export default function AdminAnalytics() {
  const dispatch = useDispatch();
  const { overview, status, error } = useSelector((s) => s.analytics);

  useEffect(() => {
    if (status === "idle") dispatch(fetchOverview());
  }, [dispatch, status]);

  if (status === "loading" || status === "idle") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-panel h-24 p-5">
              <div className="admin-skeleton h-3 w-20 opacity-60" />
              <div className="admin-skeleton mt-3 h-7 w-24 opacity-60" />
            </div>
          ))}
        </div>
        <div className="admin-panel p-6">
          <div className="admin-skeleton h-64 w-full opacity-60" />
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="admin-empty admin-panel">
        <span className="admin-empty-icon">📉</span>
        {error || "Failed to load analytics."}
        <button className="admin-btn-ghost mt-2" onClick={() => dispatch(fetchOverview())}>
          Try again
        </button>
      </div>
    );
  }

  const monthly = (overview.monthlyRevenue || []).map((m) => ({
    month: shortMonth(m._id),
    revenue: m.revenue || 0,
    orders: m.orders || 0,
  }));
  const byStatus = Object.entries(overview.ordersByStatus || {}).map(([name, value]) => ({
    name: name.replace(/_/g, " "),
    value,
  }));
  const totalByStatus = byStatus.reduce((s, d) => s + d.value, 0);
  const topProducts = (overview.topProducts || []).map((p) => ({
    name: p.name,
    sales: p.sales || 0,
    revenue: (p.sales || 0) * (p.price || 0),
  }));
  const vendors = (overview.vendorPerformance || []).map((v) => ({
    storeName: v.storeName,
    revenue: v.revenue || 0,
    orders: v.orders || 0,
  }));
  // Real-data summary for the revenue chart header (sum of the same months
  // the chart plots — nothing invented).
  const monthlyTotal = monthly.reduce((s, m) => s + m.revenue, 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="admin-page-head">
        <h1>Analytics</h1>
        <p>Revenue, orders, products and vendor performance</p>
      </div>

      {/* KPI row — straight from the overview payload */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Revenue" value={formatPrice(overview.revenue)} accent="indigo" icon="revenue" />
        <AdminStatCard label="Orders" value={overview.orderCount} accent="sky" icon="orders" />
        <AdminStatCard label="Customers" value={overview.customerCount} accent="amber" icon="customers" />
        <AdminStatCard label="Vendors" value={overview.vendorCount} accent="emerald" icon="vendors" />
      </div>

      {/* Revenue over time — rounded-top gradient bars with a soft hover
          band and the shared glass tooltip. Same live data, same currency,
          same loading/empty/error handling as before. */}
      <Panel
        title="Revenue over time"
        subtitle="Monthly revenue from live orders (cancelled excluded)"
        action={
          <div className="text-right">
            <p className="text-xl font-bold tracking-tight text-[var(--dash-text)]">
              {formatPrice(monthlyTotal)}
            </p>
            <p className="text-[11px] text-[var(--dash-muted)]">
              Total across {monthly.length} month{monthly.length === 1 ? "" : "s"}
            </p>
          </div>
        }
      >
        {monthly.length === 0 ? (
          <ChartEmpty icon="📈" label="No order data yet — charts appear as orders come in" />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthly} margin={{ top: 16, right: 16, bottom: 4, left: 0 }} barCategoryGap="30%">
              <defs>
                <linearGradient id="revBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.primary} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={C.primary} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke={GRID} vertical={false} />
              <XAxis
                dataKey="month"
                tick={TICK}
                tickLine={false}
                tickMargin={10}
                minTickGap={20}
                interval="preserveStartEnd"
                axisLine={{ stroke: AXIS }}
              />
              <YAxis
                tick={TICK}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={64}
                allowDecimals={false}
                tickFormatter={(v) => `₹${compact(v)}`}
                domain={[0, (dataMax) => Math.max(1000, Math.ceil((dataMax * 1.15) / 1000) * 1000)]}
              />
              <Tooltip content={<MoneyTooltip />} cursor={{ fill: AREA_CURSOR }} />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="url(#revBarGrad)"
                radius={[8, 8, 0, 0]}
                maxBarSize={44}
                animationDuration={600}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Orders by status — donut */}
        <Panel title="Orders by status" subtitle="Share of every order ever placed">
          {byStatus.length === 0 ? (
            <ChartEmpty icon="🍩" label="No orders yet" />
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <ResponsiveContainer width="100%" height={240} className="max-w-[260px]">
                <PieChart>
                  <Pie
                    data={byStatus}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={95}
                    paddingAngle={2}
                    stroke="var(--dash-surface)"
                    strokeWidth={2}
                  >
                    {byStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      const pct = totalByStatus ? Math.round((d.value / totalByStatus) * 100) : 0;
                      return (
                        <div
                          className="rounded-xl px-3.5 py-2.5 text-xs"
                          style={{ background: "var(--dash-tooltip-bg)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid var(--dash-border-strong)", color: "var(--dash-text)" }}
                        >
                          <p className="font-semibold capitalize">{d.name}</p>
                          <p className="mt-0.5 text-[var(--dash-muted)]">
                            {d.value} order{d.value === 1 ? "" : "s"} · {pct}%
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="w-full min-w-0 space-y-2 text-sm sm:w-auto">
                {byStatus.map((d, i) => (
                  <li key={d.name} className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 capitalize">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="shrink-0 text-[var(--dash-muted)]">
                      {d.value} · {totalByStatus ? Math.round((d.value / totalByStatus) * 100) : 0}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        {/* Best-selling products — horizontal bars */}
        <Panel title="Best sellers" subtitle="Units sold per product (all-time)">
          {topProducts.length === 0 ? (
            <ChartEmpty icon="🏆" label="No sales recorded yet" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(topProducts.length * 40, 200)}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis
                  type="number"
                  tick={TICK}
                  tickLine={false}
                  axisLine={{ stroke: AXIS }}
                  tickFormatter={compact}
                  label={{ value: "Units sold", position: "insideBottomRight", offset: -2, style: { fill: TICK.fill, fontSize: 11 } }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={TICK}
                  tickLine={false}
                  axisLine={false}
                  width={150}
                  tickFormatter={(v) => (String(v).length > 18 ? `${String(v).slice(0, 17)}…` : v)}
                />
                <Tooltip content={<MoneyTooltip />} cursor={{ fill: BAR_CURSOR }} />
                <Bar dataKey="sales" name="Units sold" fill={C.units} radius={[0, 6, 6, 0]} barSize={18}>
                  <LabelList dataKey="sales" position="right" style={{ fill: TICK.fill, fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Vendor performance */}
      <Panel title="Vendor performance" subtitle="Revenue generated per store">
        {vendors.length === 0 ? (
          <ChartEmpty icon="🏪" label="No vendor sales yet" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(vendors.length * 46 + 40, 240)}>
            <BarChart data={vendors} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis
                type="number"
                tick={TICK}
                tickLine={false}
                axisLine={{ stroke: AXIS }}
                tickFormatter={(v) => `₹${compact(v)}`}
              />
              <YAxis
                type="category"
                dataKey="storeName"
                tick={TICK}
                tickLine={false}
                axisLine={false}
                width={150}
                tickFormatter={(v) => (String(v).length > 18 ? `${String(v).slice(0, 17)}…` : v)}
              />
              <Tooltip content={<MoneyTooltip moneyKey="revenue" />} cursor={{ fill: AREA_CURSOR }} />
              <Bar dataKey="revenue" name="Revenue" fill={C.primary} radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
}
