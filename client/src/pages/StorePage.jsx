import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getStoreBySlug } from "../services/vendorService";
import { formatPrice } from "../utils/format";
import ProductSkeleton from "../components/ui/ProductSkeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";

export default function StorePage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    getStoreBySlug(slug)
      .then((r) => {
        if (!alive) return;
        setData(r.data || r);
        setStatus("succeeded");
      })
      .catch(() => alive && setStatus("failed"));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="container-narrow grid gap-4 py-10 sm:grid-cols-3 lg:grid-cols-4">
        <ProductSkeleton count={8} />
      </div>
    );
  }
  if (status === "failed" || !data) {
    return (
      <div className="container-narrow py-10">
        <ErrorState message="Store not found or no longer available." />
      </div>
    );
  }

  const { vendor, products } = data;

  return (
    <div className="gradient-mesh min-h-screen py-10 sm:py-14">
      <div className="container-narrow">
        {/* Store banner card */}
        <div
          className="card-surface relative overflow-hidden p-8 sm:p-10"
          style={{ background: "var(--surface)" }}
        >
          {/* decorative glow */}
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-25"
            style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
            aria-hidden="true"
          />
          <div className="relative flex flex-wrap items-center gap-6">
            {vendor.logo ? (
              <img
                src={vendor.logo}
                alt={`${vendor.storeName} logo`}
                className="h-20 w-20 rounded-2xl object-cover"
                style={{ border: "1px solid var(--border)" }}
              />
            ) : (
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold"
                style={{
                  background: "color-mix(in srgb, var(--accent) 18%, transparent)",
                  color: "var(--accent-hover)",
                  fontFamily: "var(--font-display)",
                }}
                aria-hidden="true"
              >
                {vendor.storeName?.charAt(0)?.toUpperCase() || "🏪"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--accent-hover)" }}>
                Seller store
              </p>
              <h1 className="section-title mt-1.5">{vendor.storeName}</h1>
              <p className="text-muted mt-2 max-w-2xl text-sm leading-relaxed">
                {vendor.description ||
                  "This seller hasn't written their story yet."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="status-chip warning">★ {vendor.rating?.toFixed?.(1) || "New"}</span>
                <span className="status-chip neutral">{products?.length || 0} products</span>
                {vendor.address?.city && (
                  <span className="status-chip neutral">{vendor.address.city}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <h2 className="mt-10 mb-5 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Products
        </h2>

        {!products?.length ? (
          <EmptyState
            icon="📦"
            title="No products yet"
            message="This store hasn't listed anything — check back soon."
            action={
              <Link to="/products" className="btn-primary btn-sm">
                Browse all products
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p, i) => {
              const img = p.image?.url || p.image || p.images?.[0];
              return (
                <Link
                  key={p._id}
                  to={`/product/${p._id}`}
                  className="card-surface hover-lift micro-press overflow-hidden"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {img ? (
                    <img
                      src={img}
                      alt={p.name}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex aspect-square w-full items-center justify-center text-3xl opacity-40"
                      style={{ background: "color-mix(in srgb, var(--border) 45%, transparent)" }}
                      aria-hidden="true"
                    >
                      🖼
                    </div>
                  )}
                  <div className="p-4">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="text-muted mt-0.5 text-sm font-medium">{formatPrice(p.price)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
