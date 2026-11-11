import { useEffect, useRef, useState } from "react";
import { adminListVendors, adminReviewVendor } from "../../services/vendorService";
import { useToast } from "../../context/ToastContext";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import ErrorState from "../../components/ui/ErrorState";

export default function AdminVendors() {
  const { showToast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  // pendingReview: { id, action: "suspend" | "reject" } — renders a decision modal
  const [pendingReview, setPendingReview] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const reasonRef = useRef(null);

  const load = async () => {
    try {
      const r = await adminListVendors(filter ? { status: filter } : {});
      setVendors(r.data || r || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load vendors");
    }
  };

  useEffect(() => {
    load();
    setPendingReview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openReview = (v, action) => {
    setRejectReason("");
    setPendingReview({ id: v._id, name: v.storeName, action });
    // focus the reason input once it renders
    if (action === "reject") {
      requestAnimationFrame(() => reasonRef.current?.focus());
    }
  };

  const confirmReview = async () => {
    const { id, action } = pendingReview;
    const rejectionReason = action === "reject" ? rejectReason.trim() || undefined : undefined;
    setPendingReview(null);
    await review(id, action, rejectionReason);
  };

  const review = async (id, action, rejectionReason) => {
    setBusyId(id);
    try {
      await adminReviewVendor(id, { action, rejectionReason });
      showToast(`Vendor ${action === "approve" ? "approved" : `${action}d`}`, "success");
      await load();
    } catch (e) {
      showToast(e.response?.data?.message || `Failed to ${action} vendor`, "error");
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="admin-page-head">
          <h1>Vendors</h1>
          <p>Review seller applications and manage stores</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter by status"
          className="admin-select sm:w-48"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="admin-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table min-w-[660px]">
            <thead>
              <tr>
                <th>Store</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="admin-empty">
                      <span className="admin-empty-icon">🏪</span>
                      No vendors in this view
                    </div>
                  </td>
                </tr>
              )}
              {vendors.map((v) => (
                <tr key={v._id}>
                  <td className="font-medium">{v.storeName}</td>
                  <td className="text-xs text-[var(--dash-muted)]">{v.user?.email}</td>
                  <td>
                    <span className={`admin-chip ${
                      v.status === "approved" ? "success"
                      : v.status === "pending" ? "warning"
                      : v.status === "rejected" || v.status === "suspended" ? "danger"
                      : "muted"
                    }`}>{v.status}</span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={busyId === v._id || v.status === "approved"}
                        onClick={() => review(v._id, "approve")}
                        className="admin-btn-ghost !px-3 !py-1.5 !text-xs disabled:opacity-40"
                      >
                        Approve
                      </button>
                      <button
                        disabled={busyId === v._id || v.status === "rejected"}
                        onClick={() => openReview(v, "reject")}
                        className="admin-btn-danger !px-3 !py-1.5 !text-xs disabled:opacity-40"
                      >
                        Reject
                      </button>
                      <button
                        disabled={busyId === v._id || v.status !== "approved"}
                        onClick={() => openReview(v, "suspend")}
                        className="admin-btn-ghost !px-3 !py-1.5 !text-xs disabled:opacity-40"
                      >
                        Suspend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject with reason */}
      {pendingReview?.action === "reject" && (
        <div
          className="payment-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Reject vendor application"
          onMouseDown={(e) => e.target === e.currentTarget && setPendingReview(null)}
        >
          <div className="payment-modal-container !max-w-md p-6">
            <h3 className="text-lg font-bold">Reject {pendingReview.name}?</h3>
            <p className="text-sm text-[var(--dash-muted)] mt-1">
              The seller will see this reason and can fix their application and
              reapply. Optional but much appreciated.
            </p>
            <textarea
              ref={reasonRef}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Store profile incomplete — add contact details and try again."
              className="admin-input mt-4"
              aria-label="Rejection reason"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setPendingReview(null)} className="btn-ghost !px-4 !py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReview}
                className="btn-danger !px-4 !py-2 text-sm"
              >
                Reject application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend confirmation */}
      <ConfirmDialog
        open={pendingReview?.action === "suspend"}
        title={`Suspend ${pendingReview?.name}?`}
        message="Their products immediately stop selling to customers. You can re-approve them later."
        confirmLabel="Suspend store"
        cancelLabel="Back out"
        variant="danger"
        onConfirm={async () => {
          const { id, action } = pendingReview;
          setPendingReview(null);
          await review(id, action);
        }}
        onCancel={() => setPendingReview(null)}
      />
    </div>
  );
}
