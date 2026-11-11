import { Link } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatPrice } from "../../utils/format";

function ProductCard({ product }) {
  const { addToCart } = useContext(CartContext);
  const { user, addToWishlist, removeFromWishlist } = useContext(AuthContext);
  const { showToast } = useToast();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [wishlisted, setWishlisted] = useState(
    () => user?.wishlist?.some((w) => w._id === product._id || w === product._id) ?? false
  );

  // Image may be a plain string (legacy docs) or a { url } sub-document.
  const imageUrl = typeof product.image === "string" ? product.image : product.image?.url;

  // Re-sync when user logs in/out or wishlist changes elsewhere
  useEffect(() => {
    setWishlisted(user?.wishlist?.some((w) => (w._id || w) === product._id) ?? false);
  }, [user, product._id]);

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;
    addToCart(product);
    showToast(`${product.name} added to bag`, "success");
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast("Sign in to save to wishlist", "info");
      return;
    }
    try {
      if (wishlisted) {
        await removeFromWishlist(product._id);
        setWishlisted(false);
        showToast("Removed from wishlist", "info");
      } else {
        await addToWishlist(product._id);
        setWishlisted(true);
        showToast("Saved to wishlist", "success");
      }
    } catch {
      showToast("Could not update wishlist", "error");
    }
  };

  return (
    <article className="group card-surface overflow-hidden">
      <Link to={`/product/${product._id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-[var(--border)]">
          {!imgLoaded && <div className="skeleton absolute inset-0" />}
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-105 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted text-sm">
              No image
            </div>
          )}

          {discount && (
            <span className="badge absolute top-3 left-3">−{discount}%</span>
          )}

          {product.stock > 0 && product.stock < 5 && (
            <span
              className="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
              style={{ background: "var(--teal)", color: "#fff" }}
            >
              Low stock
            </span>
          )}

          {product.stock <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="rounded-full bg-white/90 px-4 py-1 text-xs font-semibold text-black">
                Sold out
              </span>
            </div>
          )}

          {/* Action row — always visible. The old hover-reveal translated it
              out of the card (clipped by overflow-hidden) and never showed it
              on touch devices, hiding the primary actions. */}
          <div className="absolute inset-x-0 bottom-0 flex gap-2 p-3">
            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className="btn-primary flex-1 py-2.5 text-xs disabled:opacity-50"
            >
              Quick add
            </button>
            <button
              onClick={handleWishlist}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--surface)", color: wishlisted ? "#e11" : "var(--ink)" }}
              aria-label="Wishlist"
            >
              {wishlisted ? "♥" : "♡"}
            </button>
          </div>
        </div>

        <div className="p-5">
          {product.category && (
            <p className="text-muted mb-1 text-xs uppercase tracking-wider">{product.category}</p>
          )}
          <h3
            className="mb-2 line-clamp-2 text-base font-semibold leading-snug"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {product.name}
          </h3>

          {product.rating > 0 && (
            <div className="mb-2 flex items-center gap-1 text-xs text-muted">
              <span style={{ color: "var(--accent)" }}>★</span>
              <span>{Number(product.rating).toFixed(1)}</span>
              {product.totalReviews > 0 && <span>({product.totalReviews})</span>}
            </div>
          )}

          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold" style={{ color: "var(--ink)" }}>
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-muted line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

export default ProductCard;
