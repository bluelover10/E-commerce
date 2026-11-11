import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { formatPrice } from "../utils/format";
import ErrorState from "../components/ui/ErrorState";

/**
 * Printable invoice. Auth headers are handled by the shared api interceptor —
 * pages never set Authorization manually.
 */
function Invoice() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const fetchOrder = async () => {
      try {
        const response = await api.get(`/orders/${orderId}`);
        if (alive) setOrder(response.data.order || response.data);
        // Give the browser a beat to lay out, then open print dialog
        setTimeout(() => window.print(), 500);
      } catch (e) {
        if (alive) setError(e.response?.data?.message || "Failed to load order");
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchOrder();
    return () => {
      alive = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-500">Preparing invoice…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <ErrorState message={error || "Order not found"} onRetry={() => navigate(-1)} />
      </div>
    );
  }

  const ship = order.shippingAddress || {};
  const bill = order.billingAddress && order.billingAddress.street ? order.billingAddress : ship;

  return (
    <div className="min-h-screen bg-white p-4 text-black sm:p-8 print:p-0">
      <div className="mx-auto max-w-4xl border border-gray-200 p-4 sm:p-8 print:border-none print:p-0">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Ghost Panda
            </h1>
            <p className="mt-1 text-sm text-gray-500">Curated goods · support@ghostpanda.store</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-semibold text-gray-800">INVOICE</h2>
            <p className="mt-1 text-sm text-gray-600">
              Order #{order._id.slice(-8).toUpperCase()}
            </p>
            <p className="text-sm text-gray-600">
              Date: {new Date(order.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>

        {/* Addresses */}
        <div className="mb-10 grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 inline-block border-b-2 border-gray-900 font-semibold text-gray-900">
              Billed to
            </h3>
            <p className="text-sm font-medium">{bill?.name}</p>
            <p className="text-sm text-gray-600">{bill?.street}</p>
            <p className="text-sm text-gray-600">
              {bill?.city}, {bill?.state} {bill?.zipCode}
            </p>
            <p className="text-sm text-gray-600">{bill?.country}</p>
          </div>
          <div className="sm:text-right">
            <h3 className="mb-2 inline-block border-b-2 border-gray-900 font-semibold text-gray-900">
              Shipped to
            </h3>
            <p className="text-sm font-medium">{ship?.name}</p>
            <p className="text-sm text-gray-600">{ship?.street}</p>
            <p className="text-sm text-gray-600">
              {ship?.city}, {ship?.state} {ship?.zipCode}
            </p>
            <p className="text-sm text-gray-600">{ship?.country}</p>
          </div>
        </div>

        {/* Items */}
        <div className="mb-10 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-gray-800">
                  Item
                </th>
                <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-800">
                  Qty
                </th>
                <th className="whitespace-nowrap px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-800">
                  Unit price
                </th>
                <th className="pl-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-800">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="pr-4 py-4">
                    <p className="break-words text-sm font-medium text-gray-800">{item.name}</p>
                  </td>
                  <td className="px-2 py-4 text-center text-sm text-gray-600">{item.quantity}</td>
                  <td className="whitespace-nowrap px-2 py-4 text-right text-sm text-gray-600">
                    {formatPrice(item.price)}
                  </td>
                  <td className="pl-4 whitespace-nowrap py-4 text-right text-sm font-medium text-gray-800">
                    {formatPrice(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm font-medium text-green-700">
                <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                <span>−{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax (18%)</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Shipping</span>
              <span>{order.shippingCost === 0 ? "Free" : formatPrice(order.shippingCost)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t-2 border-gray-800 pt-2 text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
          <p>Thank you for shopping with Ghost Panda!</p>
          <p>If you have any questions concerning this invoice, contact support@ghostpanda.store.</p>
        </div>

        {/* Print actions (hidden on paper) */}
        <div className="mt-10 flex justify-center gap-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Print invoice
          </button>
          <button
            onClick={() => navigate(`/order/${order._id}`)}
            className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold transition hover:bg-gray-50"
          >
            Back to order
          </button>
        </div>
      </div>
    </div>
  );
}

export default Invoice;
