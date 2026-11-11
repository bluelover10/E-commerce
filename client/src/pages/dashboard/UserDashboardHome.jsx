import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { AtelierStatCard } from "../../components/dashboard/StatCard";
import { formatPrice } from "../../utils/format";

export default function UserDashboardHome() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/users/dashboard-stats")
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="atelier-card h-24 skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="atelier-card relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: "linear-gradient(135deg, var(--atelier-accent), var(--atelier-warm))",
            filter: "blur(80px)",
          }}
        />
        <div className="relative">
          <p className="text-sm" style={{ color: "var(--atelier-muted)" }}>
            Member since {stats?.memberSince ? new Date(stats.memberSince).getFullYear() : "—"}
          </p>
          <h2 className="mt-2 text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Your shopping journey
          </h2>
          <p className="mt-2 max-w-lg text-sm" style={{ color: "var(--atelier-muted)" }}>
            Track orders, manage wishlist, and update your profile — all in one place.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AtelierStatCard label="Orders" value={stats?.orderCount ?? 0} icon="📦" />
        <AtelierStatCard label="Wishlist" value={stats?.wishlistCount ?? 0} icon="♡" />
        <AtelierStatCard label="Addresses" value={stats?.addressCount ?? 0} icon="⌂" />
        <AtelierStatCard label="Total spent" value={formatPrice(stats?.totalSpent ?? 0)} icon="✦" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="atelier-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Recent orders
            </h3>
            <Link to="/dashboard/orders" className="text-sm" style={{ color: "var(--atelier-accent)" }}>
              View all →
            </Link>
          </div>
          {!stats?.recentOrders?.length ? (
            <p className="text-sm" style={{ color: "var(--atelier-muted)" }}>
              No orders yet.{" "}
              <Link to="/products" style={{ color: "var(--atelier-accent)" }}>
                Start shopping
              </Link>
            </p>
          ) : (
            <ul className="space-y-4">
              {stats.recentOrders.map((order) => (
                <li key={order._id}>
                  <Link
                    to={`/order/${order._id}`}
                    className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-black/5"
                    style={{ border: "1px solid color-mix(in srgb, var(--atelier-ink) 8%, transparent)" }}
                  >
                    <div>
                      <p className="font-mono text-xs" style={{ color: "var(--atelier-muted)" }}>
                        #{order._id.slice(-8)}
                      </p>
                      <p className="text-sm capitalize">{order.orderStatus}</p>
                    </div>
                    <p className="font-semibold">{formatPrice(order.totalAmount)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="atelier-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Wishlist preview
            </h3>
            <Link to="/dashboard/wishlist" className="text-sm" style={{ color: "var(--atelier-accent)" }}>
              See all →
            </Link>
          </div>
          {!stats?.wishlistPreview?.length ? (
            <p className="text-sm" style={{ color: "var(--atelier-muted)" }}>
              Nothing saved yet
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {stats.wishlistPreview.map((p) => (
                <Link
                  key={p._id}
                  to={`/product/${p._id}`}
                  className="group overflow-hidden rounded-xl"
                  style={{ border: "1px solid color-mix(in srgb, var(--atelier-ink) 8%, transparent)" }}
                >
                  {p.image && (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                  <p className="truncate p-2 text-xs font-medium">{p.name}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { to: "/dashboard/profile", label: "Edit profile", desc: "Name & phone" },
          { to: "/dashboard/addresses", label: "Addresses", desc: "Delivery locations" },
          { to: "/cart", label: "Your bag", desc: "Checkout" },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="atelier-card block p-5">
            <p className="font-semibold">{item.label}</p>
            <p className="text-sm" style={{ color: "var(--atelier-muted)" }}>
              {item.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
