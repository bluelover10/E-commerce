import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchMyVendor, fetchVendorStats } from "../../store/slices/vendorSlice";
import { formatPrice } from "../../utils/format";

export default function VendorDashboard() {
  const dispatch = useDispatch();
  const { profile, stats } = useSelector((s) => s.vendor);

  useEffect(() => {
    dispatch(fetchMyVendor());
    dispatch(fetchVendorStats());
  }, [dispatch]);

  if (profile && profile.status !== "approved") {
    return (
      <div className="atelier-card p-8 text-center">
        <h1 className="text-xl font-bold">Store {profile.status}</h1>
        <p className="mt-2 text-sm text-muted">
          {profile.status === "pending" ? "Your store is under review. You'll be notified on approval." : `Status: ${profile.status}. ${profile.rejectionReason || ""}`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{profile?.storeName || "Seller dashboard"}</h1>
        <p className="text-sm text-muted">Sales, revenue and fulfilment at a glance</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Gross revenue", value: formatPrice(stats?.grossRevenue || 0) },
          { label: "Net (after commission)", value: formatPrice(stats?.netRevenue || 0) },
          { label: "Orders", value: stats?.orderCount ?? "—" },
          { label: "Products", value: stats?.productCount ?? "—" },
        ].map((c) => (
          <div key={c.label} className="atelier-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted">{c.label}</p>
            <p className="mt-2 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="atelier-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Top products</h2>
            <Link to="/vendor/products" className="text-xs underline">Manage →</Link>
          </div>
          {!stats?.topProducts?.length ? <p className="text-sm text-muted">No sales yet</p> : (
            <ul className="space-y-2">
              {stats.topProducts.map((p) => (
                <li key={p._id} className="flex justify-between text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="text-muted">{p.sales} sold</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="atelier-card p-6">
          <h2 className="mb-4 text-sm font-semibold">Low stock</h2>
          {!stats?.lowStock?.length ? <p className="text-sm text-muted">Stock healthy</p> : (
            <ul className="space-y-2">
              {stats.lowStock.map((p) => (
                <li key={p._id} className="flex justify-between text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="text-amber-600">{p.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
