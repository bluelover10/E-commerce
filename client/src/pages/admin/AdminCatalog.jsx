import { useEffect, useState } from "react";
import api from "../../services/api";
import * as categoryService from "../../services/categoryService";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useToast } from "../../context/ToastContext";
import { formatPrice } from "../../utils/format";

export default function AdminCatalog() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [couponForm, setCouponForm] = useState({
    code: "",
    type: "percentage",
    value: "10",
    minOrderAmount: "",
    maxDiscount: "",
    expiresAt: "",
  });
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  // Coupon about to be deleted — renders the confirmation dialog
  const [pendingDeleteCoupon, setPendingDeleteCoupon] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [c, cats] = await Promise.all([
        api.get("/coupons/admin/all").catch(() => ({ data: [] })),
        categoryService.list().catch(() => ({ data: [] })),
      ]);
      setCoupons(c.data?.coupons || c.data?.data || []);
      setCategories(cats.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createCoupon = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      await api.post("/coupons/admin", {
        ...couponForm,
        value: Number(couponForm.value),
        minOrderAmount: couponForm.minOrderAmount === "" ? undefined : Number(couponForm.minOrderAmount),
        maxDiscount: couponForm.maxDiscount === "" ? undefined : Number(couponForm.maxDiscount),
      });
      showToast("Coupon created", "success");
      setCouponForm({ code: "", type: "percentage", value: "10", minOrderAmount: "", maxDiscount: "", expiresAt: "" });
      load();
    } catch (e2) {
      const msg = e2.response?.data?.errors?.[0]?.msg || e2.response?.data?.message || "Failed to create coupon";
      showToast(msg, "error");
    } finally {
      setCreating(false);
    }
  };

  const createCat = async (e) => {
    e.preventDefault();
    try {
      await categoryService.create(catForm);
      showToast("Category created", "success");
      setCatForm({ name: "", description: "" });
      load();
    } catch (e2) {
      showToast(e2.response?.data?.message || "Failed to create category", "error");
    }
  };

  const confirmDeleteCoupon = async () => {
    const target = pendingDeleteCoupon;
    setPendingDeleteCoupon(null);
    if (!target) return;
    try {
      setDeleting(true);
      await api.delete(`/coupons/admin/${target._id}`);
      showToast(`Coupon ${target.code} deleted`, "success");
      await load();
    } catch (e2) {
      showToast(e2.response?.data?.message || "Failed to delete coupon", "error");
    } finally {
      setDeleting(false);
    }
  };

  const couponValue = (c) =>
    c.type === "percentage" ? `${c.value}% off` : c.type === "flat" ? `${formatPrice(c.value)} off` : "Free shipping";

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="admin-page-head">
        <h1>Coupons & Categories</h1>
        <p>Create discounts, manage storefront categories</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ── Coupons ─────────────────────────────────────────────────── */}
        <div className="admin-panel overflow-hidden">
          <div className="border-b border-[var(--dash-border)] px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--dash-muted)]">Coupons</h2>
          </div>

          <form onSubmit={createCoupon} className="grid gap-3 border-b border-[var(--dash-border)] p-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="cp-code" className="admin-label">Code</label>
              <input
                id="cp-code"
                className="admin-input font-mono uppercase"
                placeholder="SUMMER25"
                required
                value={couponForm.code}
                onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label htmlFor="cp-type" className="admin-label">Type</label>
              <select
                id="cp-type"
                className="admin-select"
                value={couponForm.type}
                onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat amount (₹)</option>
                <option value="free_shipping">Free shipping</option>
              </select>
            </div>
            <div>
              <label htmlFor="cp-value" className="admin-label">
                {couponForm.type === "percentage" ? "Percent" : couponForm.type === "flat" ? "Amount (₹)" : "Shipping comp (₹)"}
              </label>
              <input
                id="cp-value"
                type="number"
                min="0"
                className="admin-input"
                required={couponForm.type !== "free_shipping"}
                value={couponForm.value}
                onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="cp-min" className="admin-label">Min order (₹)</label>
              <input
                id="cp-min"
                type="number"
                min="0"
                placeholder="0"
                className="admin-input"
                value={couponForm.minOrderAmount}
                onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="cp-max" className="admin-label">Max discount (₹)</label>
              <input
                id="cp-max"
                type="number"
                min="0"
                placeholder="No cap"
                className="admin-input"
                disabled={couponForm.type === "free_shipping"}
                value={couponForm.maxDiscount}
                onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cp-exp" className="admin-label">Expires</label>
              <input
                id="cp-exp"
                type="date"
                className="admin-input"
                required
                value={couponForm.expiresAt}
                onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="admin-btn w-full" disabled={creating}>
                {creating ? "Creating…" : "Create coupon"}
              </button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="admin-table min-w-[560px]">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Caps</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6}><div className="admin-skeleton m-4 h-16 opacity-60" /></td></tr>
                )}
                {!loading && coupons.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="admin-empty">
                        <span className="admin-empty-icon">🎟️</span>
                        No coupons yet — create one above
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  coupons.map((c) => {
                    const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                    const exhausted = c.maxUses != null && c.usedCount >= c.maxUses;
                    return (
                      <tr key={c._id}>
                        <td className="font-mono font-semibold text-[var(--dash-accent-2)]">{c.code}</td>
                        <td>{couponValue(c)}</td>
                        <td className="text-xs text-[var(--dash-muted)]">
                          {c.type !== "free_shipping" && c.maxDiscount != null ? `max ${formatPrice(c.maxDiscount)} · ` : ""}
                          {c.minOrderAmount ? `min ${formatPrice(c.minOrderAmount)}` : c.type !== "free_shipping" && c.maxDiscount == null ? "—" : ""}
                        </td>
                        <td className="text-xs text-[var(--dash-muted)]">
                          {c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ""}
                        </td>
                        <td>
                          <span className={`admin-chip ${expired || exhausted ? "danger" : c.isActive ? "success" : "muted"}`}>
                            {expired ? "expired" : exhausted ? "exhausted" : c.isActive ? "active" : "inactive"}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => setPendingDeleteCoupon(c)}
                            className="admin-btn-danger !px-3 !py-1.5 !text-xs"
                            aria-label={`Delete coupon ${c.code}`}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Categories ──────────────────────────────────────────────── */}
        <div className="admin-panel overflow-hidden self-start">
          <div className="border-b border-[var(--dash-border)] px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--dash-muted)]">Categories</h2>
          </div>

          <form onSubmit={createCat} className="grid gap-3 border-b border-[var(--dash-border)] p-6">
            <div>
              <label htmlFor="ct-name" className="admin-label">Name</label>
              <input
                id="ct-name"
                className="admin-input"
                placeholder="e.g. Shirts"
                required
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="ct-desc" className="admin-label">Description</label>
              <input
                id="ct-desc"
                className="admin-input"
                placeholder="Short description"
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              />
            </div>
            <button type="submit" className="admin-btn">Add category</button>
          </form>

          <ul className="divide-y divide-[color-mix(in_srgb,var(--dash-border)_55%,transparent)]">
            {categories.map((c) => (
              <li key={c._id} className="flex items-center justify-between gap-3 px-6 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {c.image ? (
                    <img src={c.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-[var(--dash-border)]" />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--dash-border)] text-xs text-[var(--dash-muted)]">
                      {c.name?.slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    {c.description && <p className="truncate text-xs text-[var(--dash-muted)]">{c.description}</p>}
                  </div>
                </div>
                <button
                  onClick={() => categoryService.remove(c._id).then(load).catch(() => showToast("Failed to deactivate category", "error"))}
                  className="admin-btn-ghost !px-3 !py-1.5 !text-xs"
                >
                  Deactivate
                </button>
              </li>
            ))}
            {categories.length === 0 && !loading && (
              <li>
                <div className="admin-empty">
                  <span className="admin-empty-icon">🗂️</span>
                  No categories yet
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Delete-coupon confirmation — shows the code, history stays intact */}
      <ConfirmDialog
        open={!!pendingDeleteCoupon}
        title={`Delete coupon ${pendingDeleteCoupon?.code}?`}
        message="Customers will no longer be able to use this code. Past orders keep their discount history — only the coupon record is removed. This cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete coupon"}
        cancelLabel="Keep coupon"
        variant="danger"
        onConfirm={confirmDeleteCoupon}
        onCancel={() => setPendingDeleteCoupon(null)}
      />
    </div>
  );
}
