import { useContext, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import ProductCard from "../components/product/ProductCard";
import EmptyState from "../components/ui/EmptyState";

function Wishlist({ embedded = false }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    if (!user) {
      if (!embedded) navigate("/login");
      return;
    }
    setWishlist(user.wishlist || []);
  }, [user, navigate, embedded]);

  if (!user) return null;

  const content = (
    <>
        {!embedded && (
          <>
            <h1 className="section-title mb-2">Wishlist</h1>
            <p className="text-muted mb-10">{wishlist.length} saved piece{wishlist.length !== 1 ? "s" : ""}</p>
          </>
        )}
        {embedded && (
          <p className="mb-6 text-sm" style={{ color: "var(--atelier-muted)" }}>
            {wishlist.length} saved piece{wishlist.length !== 1 ? "s" : ""}
          </p>
        )}

        {wishlist.length === 0 ? (
          <EmptyState
            icon="♡"
            title="Nothing saved yet"
            message="Tap the heart on any product to keep it here for later."
            action={
              <Link to="/products" className="btn-primary btn-sm">
                Discover products
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {wishlist.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
    </>
  );

  if (embedded) {
    return (
      <div>
        <h2 className="mb-2 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Wishlist
        </h2>
        {content}
      </div>
    );
  }

  return (
    <div className="gradient-mesh min-h-screen py-10 sm:py-16">
      <div className="container-narrow">{content}</div>
    </div>
  );
}

export default Wishlist;
