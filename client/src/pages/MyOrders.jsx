import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { formatPrice } from "../utils/format";
import api from "../services/api";
import EmptyState from "../components/ui/EmptyState";

const STATUS_CHIP = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipped: "info",
  out_for_delivery: "info",
  delivered: "success",
  cancelled: "danger",
  returned: "neutral",
};

function MyOrders({ embedded = false }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      // Auth header handled by the shared api interceptor.
      const response = await api.get("/orders");
      const data = response.data;
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const inner = (
    <>
      {!embedded && (
        <>
          <h1 className="section-title mb-2">Your orders</h1>
          <p className="text-muted mb-10">Track and manage your purchases</p>
        </>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders yet"
          message="Your first order is a checkout away."
          action={
            <Link to="/products" className="btn-primary btn-sm">
              Start shopping
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order, idx) => (
            <div
              key={order._id}
              className="hover-lift rounded-2xl p-6"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                animationDelay: `${idx * 0.04}s`,
              }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                      Order
                    </p>
                    <p className="font-semibold">#{order._id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                      Date
                    </p>
                    <p className="font-medium">
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                      Total
                    </p>
                    <p className="font-bold">{formatPrice(order.totalAmount)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`status-chip ${STATUS_CHIP[order.orderStatus] || "neutral"}`}
                  >
                    {order.orderStatus.replace(/_/g, " ")}
                  </span>
                  <button
                    onClick={() => navigate(`/order/${order._id}`)}
                    className="btn-outline btn-sm icon-nudge"
                    aria-label={`View order #${order._id.slice(-8)}`}
                  >
                    Details
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                {order.items?.slice(0, 5).map((item, idx) =>
                  item.image ? (
                    <img
                      key={idx}
                      src={item.image?.url || item.image}
                      alt={item.name || "Product"}
                      loading="lazy"
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : null
                )}
                {order.items?.length > 5 && (
                  <span className="text-muted ml-1 text-sm">+{order.items.length - 5} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div>
        <h2 className="mb-6 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Order history
        </h2>
        {inner}
      </div>
    );
  }

  return (
    <div className="gradient-mesh min-h-screen py-10 sm:py-16">
      <div className="container-narrow">{inner}</div>
    </div>
  );
}

export default MyOrders;
