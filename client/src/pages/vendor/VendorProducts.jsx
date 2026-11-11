import { useEffect, useState } from "react";
import api from "../../services/api";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import ProductSkeleton from "../../components/ui/ProductSkeleton";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function VendorProducts() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", price: "", category: "", brand: "", stock: "10", description: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setStatus("loading");
    try {
      const r = await api.get("/products/vendor/mine", { params: { limit: 50 } });
      setItems(r.data.data || r.data || []);
      setStatus("succeeded");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load");
      setStatus("failed");
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/products", { ...form, price: Number(form.price), stock: Number(form.stock) });
      setForm({ name: "", price: "", category: "", brand: "", stock: "10", description: "" });
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Create failed");
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    await api.delete(`/products/${confirmDelete}`);
    setConfirmDelete(null);
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Products & inventory</h1>
      <form onSubmit={create} className="atelier-card grid gap-3 p-5 sm:grid-cols-3">
        <input className="input-field" required placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input-field" required type="number" min="0" placeholder="Price *" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input className="input-field" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="input-field" placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        <input className="input-field" type="number" min="0" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <input className="input-field" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button className="btn-primary sm:col-span-3">Add product (goes to approval)</button>
      </form>

      {status === "loading" && <div className="grid gap-4 sm:grid-cols-2"><ProductSkeleton count={4} /></div>}
      {status === "failed" && <ErrorState message={error} onRetry={load} />}
      {status === "succeeded" && !items.length && <EmptyState title="No products" message="Add your first product above." />}

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((p) => (
          <div key={p._id} className="atelier-card flex gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="text-xs text-muted">{p.brand || "—"} · {p.category || "—"} · {p.approvalStatus}</p>
              <p className="mt-1 text-sm">₹{p.price} · {p.stock} in stock</p>
            </div>
            <button onClick={() => setConfirmDelete(p._id)} className="h-fit rounded-full border px-3 py-1 text-xs text-red-600">Delete</button>
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!confirmDelete} title="Delete product?" message="This will hide the product from the storefront." onCancel={() => setConfirmDelete(null)} onConfirm={remove} />
    </div>
  );
}
