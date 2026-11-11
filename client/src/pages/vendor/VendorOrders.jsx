import { useEffect, useState } from "react";
import { getVendorOrders, updateVendorOrderStatus } from "../../services/vendorService";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";

const STATUSES = ["confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"];

export default function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const load = async () => {
    setStatus("loading");
    try {
      const r = await getVendorOrders({ limit: 30 });
      setOrders(r.data || r || []);
      setStatus("succeeded");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load orders");
      setStatus("failed");
    }
  };

  useEffect(() => { load(); }, []);

  const update = async (orderId, next) => {
    try {
      await updateVendorOrderStatus(orderId, { status: next });
      load();
    } catch (e) {
      alert(e.response?.data?.message || "Update failed");
    }
  };

  if (status === "loading") return <p className="text-sm text-muted">Loading orders…</p>;
  if (status === "failed") return <ErrorState message={error} onRetry={load} />;
  if (!orders.length) return <EmptyState title="No orders yet" message="Orders containing your products will appear here." />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders to fulfil</h1>
      {orders.map((o) => (
        <div key={o._id} className="atelier-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs">#{o._id.slice(-8)} · {new Date(o.createdAt).toLocaleDateString()}</p>
            <span className="badge">{o.orderStatus}</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {o.items.map((i, idx) => (
              <li key={idx} className="flex justify-between">
                <span>{i.name} × {i.quantity}</span>
                <span>₹{i.price * i.quantity}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => update(o._id, s)} className="rounded-full border px-3 py-1 text-xs hover:bg-black hover:text-white">
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
