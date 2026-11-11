import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { AdminStatCard } from "../../components/dashboard/StatCard";
import { formatPrice } from "../../utils/format";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="admin-skeleton h-10 w-56 opacity-60" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-panel h-28 p-5">
              <div className="admin-skeleton h-3 w-20 opacity-60" />
              <div className="admin-skeleton mt-4 h-8 w-24 opacity-60" />
            </div>
          ))}
        </div>
        <div className="admin-panel h-72 p-6">
          <div className="admin-skeleton h-3 w-32 opacity-60" />
          <div className="admin-skeleton mt-4 h-40 w-full opacity-60" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="admin-empty admin-panel">
        <span className="admin-empty-icon">⚠️</span>
        Failed to load dashboard. Ensure you are logged in as admin.
      </div>
    );
  }

  const statusEntries = Object.entries(stats.ordersByStatus || {});
  const maxStatus = Math.max(...statusEntries.map(([, c]) => c), 1);

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="admin-page-head">
        <h1>Command overview</h1>
        <p>Real-time pulse of your store</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Revenue" value={formatPrice(stats.revenue)} sub="Excl. cancelled" accent="indigo" icon="revenue" />
        <AdminStatCard label="Orders" value={stats.orderCount} accent="sky" icon="orders" />
        <AdminStatCard label="Products" value={stats.productCount} accent="emerald" icon="products" />
        <AdminStatCard label="Customers" value={stats.userCount} accent="amber" icon="customers" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="admin-panel p-6">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-[var(--dash-muted)]">
            Orders by status
          </h2>
          <div className="space-y-4">
            {statusEntries.length === 0 ? (
              <p className="text-sm text-[var(--dash-muted)]">No orders yet</p>
            ) : (
              statusEntries.map(([status, count]) => (
                <div key={status}>
                  <div className="mb-1 flex justify-between text-sm capitalize">
                    <span>{status}</span>
                    <span className="text-[var(--dash-muted)]">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--dash-surface-2)]">
                    <div
                      className="bar-animate h-full rounded-full bg-[var(--dash-accent)]"
                      style={{ width: `${(count / maxStatus) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="admin-panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--dash-muted)]">
              Low stock alert
            </h2>
            <Link to="/admin/products" className="text-xs text-[var(--dash-accent-2)] hover:underline">
              Manage →
            </Link>
          </div>
          {stats.lowStock?.length === 0 ? (
            <p className="text-sm text-[var(--dash-muted)]">All stock levels healthy</p>
          ) : (
            <ul className="space-y-3">
              {stats.lowStock.map((p) => (
                <li key={p._id} className="flex items-center justify-between rounded-lg bg-[var(--dash-surface-2)] px-3 py-2">
                  <span className="truncate text-sm">{p.name}</span>
                  <span className="admin-chip warning shrink-0">
                    {p.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="admin-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--dash-border)] px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--dash-muted)]">
            Recent orders
          </h2>
          <Link to="/admin/orders" className="text-xs text-[var(--dash-accent-2)] hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders?.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="admin-empty">
                      <span className="admin-empty-icon">🧾</span>
                      No orders yet
                    </div>
                  </td>
                </tr>
              )}
              {stats.recentOrders?.map((order) => (
                <tr key={order._id}>
                  <td className="font-mono text-xs text-[var(--dash-muted)]">#{order._id.slice(-8)}</td>
                  <td>{order.user?.name || "—"}</td>
                  <td className="font-semibold">{formatPrice(order.totalAmount)}</td>
                  <td>
                    <span className={`admin-chip ${
                      order.orderStatus === "delivered" ? "success"
                      : order.orderStatus === "cancelled" || order.orderStatus === "returned" ? "danger"
                      : order.orderStatus === "pending" ? "warning"
                      : "info"
                    }`}>
                      {order.orderStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
