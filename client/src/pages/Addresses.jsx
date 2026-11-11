import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmptyState from "../components/ui/EmptyState";

function Addresses({ embedded = false }) {
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(null); // address pending delete confirm
  const [formData, setFormData] = useState({
    name: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    phone: "",
    isDefault: false,
  });

  // The shared api interceptor attaches the auth header — no manual headers.
  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users/addresses");
      setAddresses(response.data);
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      if (!embedded) navigate("/login");
      return;
    }
    fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, embedded]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/users/addresses/${editingId}`, formData);
        showToast("Address updated successfully!", "success");
      } else {
        await api.post("/users/addresses", formData);
        showToast("Address added successfully!", "success");
      }
      resetForm();
      fetchAddresses();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to save address", "error");
    }
  };

  const confirmDelete = async () => {
    const id = deleting;
    setDeleting(null);
    try {
      await api.delete(`/users/addresses/${id}`);
      showToast("Address deleted", "success");
      fetchAddresses();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to delete address", "error");
    }
  };

  const handleEdit = (address) => {
    setFormData({
      name: address.name || "",
      street: address.street || "",
      city: address.city || "",
      state: address.state || "",
      zipCode: address.zipCode || "",
      country: address.country || "",
      phone: address.phone || "",
      isDefault: !!address.isDefault,
    });
    setEditingId(address._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      phone: "",
      isDefault: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (!user) return null;

  const inputCls = "input-field";

  return (
    <div className={embedded ? "" : "gradient-mesh min-h-screen py-10 sm:py-16"}>
      <div className={embedded ? "" : "container-narrow"}>
        <div className="mb-8 flex items-center justify-between">
          {!embedded && (
            <div>
              <h1 className="section-title">Saved addresses</h1>
              <p className="text-muted mt-1 text-sm">Where should we deliver?</p>
            </div>
          )}
          {embedded && <span aria-hidden="true" className="hidden" />}
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={embedded ? "btn-primary btn-sm" : "btn-primary"}
            aria-expanded={showForm}
          >
            + Add address
          </button>
        </div>

        {/* Add / Edit form */}
        {showForm && (
          <div
            className="hover-lift mb-8 rounded-2xl p-6 sm:p-8"
            style={{
              background: "var(--surface)",
              border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))",
            }}
          >
            <h2 className="mb-4 text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
              {editingId ? "Edit address" : "New address"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="addr-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                    Full name
                  </label>
                  <input id="addr-name" type="text" required autoComplete="name" className={inputCls} value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="addr-phone" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                    Phone
                  </label>
                  <input id="addr-phone" type="tel" required autoComplete="tel" className={inputCls} value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label htmlFor="addr-street" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                  Street address
                </label>
                <input id="addr-street" type="text" required autoComplete="street-address" className={inputCls} value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="addr-city" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                    City
                  </label>
                  <input id="addr-city" type="text" required autoComplete="address-level2" className={inputCls} value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="addr-state" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                    State
                  </label>
                  <input id="addr-state" type="text" required autoComplete="address-level1" className={inputCls} value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="addr-zip" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                    PIN code
                  </label>
                  <input id="addr-zip" type="text" required autoComplete="postal-code" className={inputCls} value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="addr-country" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                    Country
                  </label>
                  <input id="addr-country" type="text" required autoComplete="country-name" className={inputCls} value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" checked={formData.isDefault} onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 accent-[var(--accent)]" />
                <span>Set as default address</span>
              </label>

              <div className="flex gap-3 pt-1">
                <button type="submit" className="btn-primary btn-sm">
                  {editingId ? "Save changes" : "Save address"}
                </button>
                <button type="button" onClick={resetForm} className="btn-ghost btn-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-52 rounded-2xl" />
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <EmptyState
            icon="⌂"
            title="No addresses yet"
            message='Save your first address and checkout gets a one-tap affair. Use the "+ Add address" button.'
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {addresses.map((address) => (
              <div
                key={address._id}
                className="hover-lift flex flex-col rounded-2xl p-6"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    {address.name}
                  </h3>
                  {address.isDefault && <span className="status-chip success !px-2 !py-0.5">default</span>}
                </div>
                <div className="text-muted flex-1 space-y-0.5 text-sm">
                  <p>{address.street}</p>
                  <p>
                    {address.city}, {address.state} {address.zipCode}
                  </p>
                  <p>{address.country}</p>
                  <p className="pt-1">📱 {address.phone}</p>
                </div>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => handleEdit(address)} className="btn-outline btn-sm flex-1">
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleting(address._id)}
                    className="btn-danger btn-sm flex-1"
                    aria-label={`Delete address for ${address.name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this address?"
        message="You can always add it back later."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

export default Addresses;
