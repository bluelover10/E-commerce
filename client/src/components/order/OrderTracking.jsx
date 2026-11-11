import { useEffect, useState } from "react";
import { getTracking } from "../../services/notificationService";

const STEPS = ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered"];

export default function OrderTracking({ orderId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (orderId) getTracking(orderId).then((r) => setData(r.data || r)).catch(() => {});
  }, [orderId]);

  if (!data) return null;
  const rawIdx = STEPS.indexOf(data.orderStatus);
  // Terminal states outside the linear flow: delivered = full, cancelled/returned = none + banner
  const idx = rawIdx !== -1 ? rawIdx : data.orderStatus === "delivered" ? STEPS.length - 1 : -1;
  const terminal = rawIdx === -1 ? data.orderStatus : null;

  return (
    <div className="card-surface p-5" aria-label="Order tracking">
      <h3 className="font-semibold">Tracking {data.trackingId ? `#${data.trackingId}` : ""}</h3>
      {terminal && (
        <p className="mt-2 inline-block rounded-full bg-black px-3 py-1 text-xs font-semibold capitalize text-white">
          {terminal.replace(/_/g, " ")}
        </p>
      )}
      <ol className="mt-4 space-y-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${i <= idx ? "bg-black text-white" : "border"}`}>
              {i < idx ? "✓" : i + 1}
            </span>
            <span className={i <= idx ? "font-medium capitalize" : "text-muted capitalize"}>{s.replace(/_/g, " ")}</span>
          </li>
        ))}
      </ol>
      {data.estimatedDelivery && <p className="mt-3 text-xs text-muted">Estimated delivery: {new Date(data.estimatedDelivery).toLocaleDateString()}</p>}
      {!!data.statusHistory?.length && (
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {data.statusHistory.slice(-5).reverse().map((h, i) => (
            <li key={i}>{new Date(h.at).toLocaleString()} — {h.status} {h.note ? `· ${h.note}` : ""}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
