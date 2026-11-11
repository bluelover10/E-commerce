import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import ImageUpload from "../../components/ImageUpload";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useToast } from "../../context/ToastContext";
import { formatPrice } from "../../utils/format";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category: "",
  stock: "",
  image: "",
};

export default function AdminProducts() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // product about to be deleted
  const uploadSectionRef = useRef(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/products");
      const data = Array.isArray(response.data) ? response.data : response.data.products || [];
      setProducts(data);
    } catch {
      showToast("Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image) {
      showToast("Please add a product image (drag & drop above)", "info");
      return;
    }
    const payload = {
      ...formData,
      price: Number(formData.price),
      stock: Number(formData.stock) || 0,
    };
    try {
      if (editing) {
        await api.put(`/products/${editing}`, payload);
        showToast("Product updated", "success");
      } else {
        await api.post("/products", payload);
        showToast("Product created", "success");
      }
      setFormData(emptyForm);
      setEditing(null);
      fetchProducts();
    } catch (e) {
      showToast(e.response?.data?.message || "Save failed — are you logged in as admin?", "error");
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price,
      category: product.category || "",
      stock: product.stock ?? "",
      image: product.image || "",
    });
    setEditing(product._id);
    // The admin column is the scroll container on desktop — scrollIntoView
    // walks up the ancestors and scrolls it (window.scrollTo would be a no-op
    // there because the document itself no longer scrolls).
    setTimeout(() => uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
  };

  const handleDelete = async () => {
    const id = pendingDelete?._id;
    setPendingDelete(null);
    if (!id) return;
    try {
      await api.delete(`/products/${id}`);
      showToast("Product deleted", "info");
      fetchProducts();
    } catch {
      showToast("Delete failed", "error");
    }
  };

  const handleImageUpload = (imageData) => {
    setFormData((prev) => ({ ...prev, image: imageData.imageUrl }));
    showToast("Image uploaded — save product to apply", "success");
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: "" }));
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="admin-page-head">
        <h1>Products</h1>
        <p>Drag & drop images · no URL needed</p>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <div className="admin-panel p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-[var(--dash-muted)]">
            {editing ? "Edit product" : "New product"}
          </h2>

          <div ref={uploadSectionRef} className="mb-6">
            <ImageUpload
              type="products"
              variant="admin"
              currentImage={formData.image || null}
              onUploadSuccess={handleImageUpload}
              onRemove={handleRemoveImage}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="ap-name" className="admin-label">Name</label>
              <input
                id="ap-name"
                className="admin-input"
                name="name"
                placeholder="Product name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label htmlFor="ap-desc" className="admin-label">Description</label>
              <textarea
                id="ap-desc"
                className="admin-input min-h-[80px]"
                name="description"
                placeholder="Description"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ap-price" className="admin-label">Price (₹)</label>
                <input
                  id="ap-price"
                  className="admin-input"
                  type="number"
                  name="price"
                  placeholder="999"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="ap-stock" className="admin-label">Stock</label>
                <input
                  id="ap-stock"
                  className="admin-input"
                  type="number"
                  name="stock"
                  placeholder="25"
                  value={formData.stock}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div>
              <label htmlFor="ap-cat" className="admin-label">Category</label>
              <input
                id="ap-cat"
                className="admin-input"
                name="category"
                placeholder="T-Shirts"
                value={formData.category}
                onChange={handleInputChange}
              />
            </div>
            <button type="submit" className="admin-btn w-full !py-3">
              {editing ? "Update product" : "Create product"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setFormData(emptyForm);
                }}
                className="admin-btn-ghost w-full"
              >
                Cancel edit
              </button>
            )}
          </form>
        </div>

        <div className="space-y-3">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="admin-panel flex gap-4 p-4">
                <div className="admin-skeleton h-20 w-20 opacity-60" />
                <div className="flex-1 space-y-2">
                  <div className="admin-skeleton h-4 w-2/3 opacity-60" />
                  <div className="admin-skeleton h-3 w-1/3 opacity-60" />
                </div>
              </div>
            ))
          ) : products.length === 0 ? (
            <div className="admin-empty admin-panel">
              <span className="admin-empty-icon">🏷️</span>
              No products yet — create your first one
            </div>
          ) : (
            products.map((product) => (
              <div key={product._id} className="admin-panel flex gap-4 p-4 transition-transform duration-200 hover:-translate-y-0.5">
                {product.image ? (
                  <img
                    src={typeof product.image === "string" ? product.image : product.image?.url}
                    alt=""
                    loading="lazy"
                    className="h-20 w-20 shrink-0 rounded-lg object-cover ring-1 ring-[var(--dash-border)]"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--dash-border)] text-xs text-[var(--dash-muted)]">
                    No img
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">{product.name}</h3>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--dash-accent-2)]">{formatPrice(product.price)}</p>
                    <span className={`admin-chip ${(product.stock ?? 0) <= 5 ? "warning" : "muted"}`}>
                      {product.stock} in stock
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button onClick={() => handleEdit(product)} className="admin-btn-ghost !px-3 !py-1.5 !text-xs">
                      Edit
                    </button>
                    <button onClick={() => setPendingDelete(product)} className="admin-btn-danger !px-3 !py-1.5 !text-xs">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.name}"?`}
        message="The product is deactivated and disappears from the storefront. Existing orders keep their history."
        confirmLabel="Delete product"
        cancelLabel="Keep product"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
