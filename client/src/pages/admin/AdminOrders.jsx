import { useEffect, useState } from "react";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { formatPrice } from "../../utils/format";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "returned"];

export default function AdminOrders() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  // destructive status changes (restore stock / refunds) need confirmation
  const [pendingStatus, setPendingStatus] = useState(null); // { orderId, orderStatus }

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "50" });
      if (filter) params.set("status", filter);
      const res = await api.get(`/orders/admin/all?${params}`);
      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      showToast(e.response?.data?.message || "Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const updateStatus = async (orderId, orderStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { orderStatus });
      showToast("Order status updated", "success");
      fetchOrders();
    } catch (e) {
      showToast(e.response?.data?.message || "Update failed", "error");
    }
  };

  const handleStatusChange = (orderId, orderStatus) => {
    if (orderStatus === "cancelled" || orderStatus === "returned") {
      setPendingStatus({ orderId, orderStatus });
    } else {
      updateStatus(orderId, orderStatus);
    }
  };

  const confirmStatus = () => {
    const { orderId, orderStatus } = pendingStatus;
    setPendingStatus(null);
    updateStatus(orderId, orderStatus);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="admin-page-head">
          <h1>Orders</h1>
          <p>{total} total orders</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="admin-select sm:w-56"
          aria-label="Filter orders by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="admin-panel p-5">
              <div className="admin-skeleton h-4 w-40 opacity-60" />
              <div className="admin-skeleton mt-3 h-3 w-64 opacity-60" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="admin-panel p-5 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-xs text-[var(--dash-muted)]">#{order._id.slice(-8)}</p>
                    <span className={`admin-chip ${
                      order.orderStatus === "delivered" ? "success"
                      : order.orderStatus === "cancelled" || order.orderStatus === "returned" ? "danger"
                      : order.orderStatus === "pending" ? "warning"
                      : "info"
                    }`}>
                      {order.orderStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate font-medium">{order.user?.name || "—"}</p>
                  <p className="truncate text-xs text-[var(--dash-muted)]">{order.user?.email}</p>
                  <p className="mt-2 text-lg font-bold text-[var(--dash-accent-2)]">{formatPrice(order.totalAmount)}</p>
                  <p className="text-xs text-[var(--dash-muted)]">
                    {new Date(order.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {order.items?.slice(0, 4).map((item, i) =>
                    item.image ? (
                      <img key={i} src={item.image} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-[var(--dash-border)]" />
                    ) : null
                  )}
                </div>
                <select
                  value={order.orderStatus}
                  onChange={(e) => handleStatusChange(order._id, e.target.value)}
                  className="admin-select lg:w-44"
                  aria-label={`Update status for order #${order._id.slice(-8)}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="admin-empty admin-panel">
              <span className="admin-empty-icon">📦</span>
              No orders found
              {filter && <span className="text-xs">with status "{filter.replace(/_/g, " ")}"</span>}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingStatus}
        title={
          pendingStatus?.orderStatus === "cancelled"
            ? "Cancel this order?"
            : "Mark this order as returned?"
        }
        message={
          pendingStatus?.orderStatus === "cancelled"
            ? "Stock is returned to inventory and any customer payment will be refunded."
            : "Stock is returned to inventory and a refund is initiated for the customer."
        }
        confirmLabel="Confirm"
        cancelLabel="Not yet"
        variant="danger"
        onConfirm={confirmStatus}
        onCancel={() => setPendingStatus(null)}
      />
    </div>
  );
}
