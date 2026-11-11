import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatPrice } from "../utils/format";
import Reviews from "../components/Reviews";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { user, addToWishlist, removeFromWishlist } = useContext(AuthContext);
  const { showToast } = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(null);
  const [inWishlist, setInWishlist] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (user && product) {
      const isInWishlist = user.wishlist?.some(
        (item) => item._id === product._id || item === product._id
      );
      setInWishlist(isInWishlist || false);
    }
  }, [user, product]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
      // image may be a plain string (legacy) or related data may arrive as
      // { url } objects — normalize before setting the selected gallery image.
      setSelectedImage(response.data.image?.url || response.data.image || null);
    } catch {
      navigate("/products");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product || product.stock <= 0) return;
    addToCart(product, quantity);
    showToast(`Added ${quantity} to your bag`, "success");
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      showToast("Sign in to save to wishlist", "info");
      navigate("/login");
      return;
    }
    if (inWishlist) {
      await removeFromWishlist(product._id);
      setInWishlist(false);
      showToast("Removed from wishlist", "info");
    } else {
      await addToWishlist(product._id);
      setInWishlist(true);
      showToast("Saved to wishlist", "success");
    }
  };

  if (loading) {
    return (
      <div className="container-narrow py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="skeleton aspect-square w-full rounded-3xl" />
          <div className="space-y-4">
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-6 w-1/2" />
            <div className="skeleton h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  // Normalize legacy string images and new { url } sub-documents; de-dupe.
  const normalizeImg = (img) => (typeof img === "string" ? img : img?.url || null);
  const images = [
    ...new Set(
      [normalizeImg(product.image), ...(product.images?.map(normalizeImg) || [])].filter(Boolean)
    ),
  ];

  return (
    <div className="gradient-mesh min-h-screen py-10 sm:py-16">
      <div className="container-narrow">
        <nav className="text-muted mb-8 flex items-center gap-2 text-sm">
          <Link to="/" className="hover:opacity-80">
            Home
          </Link>
          <span>/</span>
          <Link to="/products" className="hover:opacity-80">
            Shop
          </Link>
          <span>/</span>
          <span style={{ color: "var(--ink)" }}>{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <div
              className="mb-4 overflow-hidden rounded-3xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-muted">
                  No image
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-xl transition-all"
                    style={{
                      border:
                        selectedImage === img
                          ? "2px solid var(--accent)"
                          : "2px solid var(--border)",
                    }}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {product.category && (
              <span className="badge mb-4">{product.category}</span>
            )}
            <h1
              className="mb-4 text-3xl font-bold sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {product.name}
            </h1>

            {product.rating > 0 && (
              <div className="mb-6 flex items-center gap-2">
                <span style={{ color: "var(--accent)" }}>★★★★★</span>
                <span className="text-muted text-sm">
                  {Number(product.rating).toFixed(1)} · {product.totalReviews || 0} reviews
                </span>
              </div>
            )}

            <div className="mb-6 flex items-baseline gap-3">
              <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-muted text-lg line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            <p
              className={`mb-6 text-sm font-medium ${
                product.stock > 0 ? "" : "text-red-500"
              }`}
              style={product.stock > 0 ? { color: "var(--teal)" } : {}}
            >
              {product.stock > 0
                ? `In stock · ${product.stock} available`
                : "Currently unavailable"}
            </p>

            {product.description && (
              <p className="text-muted mb-8 leading-relaxed">{product.description}</p>
            )}

            {product.stock > 0 && (
              <div className="mb-8">
                <label className="mb-2 block text-sm font-medium">Quantity</label>
                <div
                  className="inline-flex items-center rounded-full"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-5 py-3 text-lg"
                  >
                    −
                  </button>
                  <span className="min-w-[3rem] text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-5 py-3 text-lg"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="btn-primary flex-1 py-4 disabled:opacity-50"
              >
                {product.stock > 0 ? "Add to bag" : "Sold out"}
              </button>
              <button
                onClick={handleWishlistToggle}
                className="btn-outline flex-1 py-4"
              >
                {inWishlist ? "♥ Saved" : "♡ Wishlist"}
              </button>
            </div>

            <ul className="text-muted mt-10 space-y-3 border-t pt-8 text-sm" style={{ borderColor: "var(--border)" }}>
              <li>✓ Free shipping on orders over ₹500</li>
              <li>✓ 30-day hassle-free returns</li>
              <li>✓ Secure payment · UPI, cards & COD</li>
              <li>✓ Authenticity guaranteed</li>
            </ul>
          </div>
        </div>

        <div className="mt-20">
          <Reviews productId={id} />
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;
