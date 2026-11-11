import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { registerStore } from "../../services/vendorService";
import { AuthContext } from "../../context/AuthContext";

export default function VendorRegister() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ storeName: "", description: "", contactEmail: user?.email || "", contactPhone: "", taxId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await registerStore(form);
      setOk("Application submitted! An admin will review your store shortly.");
      setTimeout(() => navigate("/vendor/dashboard"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-narrow py-12">
      <div className="mx-auto max-w-xl card-surface p-8">
        <h1 className="section-title !text-2xl">Sell on our marketplace</h1>
        <p className="mt-2 text-sm text-muted">Open your store, list products, and fulfil orders. Approval usually takes under 24h.</p>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {ok && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="storeName">Store name *</label>
            <input id="storeName" className="input-field mt-1" required value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} placeholder="Panda Atelier" />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="desc">Description</label>
            <textarea id="desc" className="input-field mt-1" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What do you sell?" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Contact email</label>
              <input className="input-field mt-1" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input className="input-field mt-1" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Tax ID (optional)</label>
            <input className="input-field mt-1" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
          </div>
          <button disabled={loading} className="btn-primary w-full">{loading ? "Submitting…" : "Submit for approval"}</button>
        </form>
      </div>
    </div>
  );
}
