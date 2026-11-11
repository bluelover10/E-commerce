import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import ProductCard from "../components/product/ProductCard";
import ProductSkeleton from "../components/ui/ProductSkeleton";
import { useReveal } from "../hooks/useReveal";
import bannerImage from "../assets/banner.jpg";

const MARQUEE_ITEMS = [
  "Free shipping over ₹500",
  "30-day returns",
  "Curated quality",
  "Secure checkout",
  "Carbon-neutral packaging",
  "24/7 support",
];

// Categories showcased on the homepage. Names must match the database
// EXACTLY — the cards link to /products?category=<name> — so they're
// cross-checked against the live /api/categories response and only rendered
// when they really exist (no duplicate or invented categories).
const HOMEPAGE_CATEGORIES = ["Shirts", "Suits & Blazers", "Shorts", "T-Shirts"];

function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const heroRef = useReveal();
  const featuredRef = useReveal();
  const perksRef = useReveal();

  useEffect(() => {
    fetchFeaturedProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await api.get("/categories");
      const all = res.data?.data || res.data || [];
      const byName = new Map(all.map((c) => [c.name, c]));
      // Only categories that exist in the DB AND carry an image can be cards
      setCategories(
        HOMEPAGE_CATEGORIES.map((name) => byName.get(name)).filter((c) => c?.image)
      );
    } catch {
      // Section renders nothing rather than fake cards
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/products/featured");
      setFeaturedProducts(response.data);
    } catch {
      const fallback = await api.get("/products").catch(() => null);
      const list = fallback?.data?.products || fallback?.data?.data || fallback?.data;
      if (Array.isArray(list)) {
        setFeaturedProducts(list.slice(0, 8));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gradient-mesh">
      {/* Hero */}
      <section className="relative overflow-hidden pt-8 pb-20 sm:pt-16 sm:pb-28">
        <div
          className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--accent)" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--teal)" }}
        />

        <div className="container-narrow relative">
          <div ref={heroRef} className="reveal grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="badge mb-6 inline-flex">New season · 2026</span>
              <h1
                className="mb-6 text-4xl leading-[1.05] font-bold tracking-tight break-words sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Curated for
                <br />
                <span style={{ color: "var(--accent)" }}>the discerning</span>
              </h1>
              <p className="text-muted mb-8 max-w-md text-lg leading-relaxed">
                Discover exceptional pieces handpicked for quality, design, and lasting value. Your
                next favorite find awaits.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/products" className="btn-primary">
                  Explore collection
                </Link>
                <Link to="/about" className="btn-outline">
                  Our story
                </Link>
              </div>
              <div className="mt-12 flex flex-wrap gap-6 sm:gap-10">
                {[
                  { value: "500+", label: "Products" },
                  { value: "50k+", label: "Happy clients" },
                  { value: "4.9", label: "Avg rating" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p
                      className="text-2xl font-bold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {stat.value}
                    </p>
                    <p className="text-muted text-sm">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div
                className="animate-float aspect-square max-w-md rounded-3xl p-1 mx-auto"
                style={{
                  background: `linear-gradient(135deg, var(--accent), var(--teal))`,
                }}
              >
                <div
                  className="h-full w-full overflow-hidden rounded-[22px]"
                  style={{ background: "var(--surface)" }}
                >
                  <img
                    src={bannerImage}
                    alt="Banner"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div
        className="overflow-hidden border-y py-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex animate-marquee whitespace-nowrap">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="mx-8 flex items-center gap-3 text-sm font-medium text-muted">
              <span style={{ color: "var(--accent)" }}>◆</span>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Categories — live from the database */}
      <section className="container-narrow py-16 sm:py-20">
        <div className="mb-10 text-center">
          <h2 className="section-title">Shop by category</h2>
          <p className="text-muted mt-2">Find exactly what speaks to you</p>
        </div>
        {categoriesLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {HOMEPAGE_CATEGORIES.map((name) => (
              <div
                key={name}
                className="skeleton aspect-[4/5] rounded-2xl opacity-40"
                aria-label={`Loading ${name}`}
              />
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {categories.map((cat, i) => (
              <Link
                key={cat.name}
                to={`/products?category=${encodeURIComponent(cat.name)}`}
                className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none sm:rounded-3xl"
                style={{ animationDelay: `${i * 0.08}s` }}
                aria-label={`Shop ${cat.name}`}
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                {/* Readability scrim — text stays legible over any photo */}
                <div
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(10,10,14,0.82) 0%, rgba(10,10,14,0.25) 45%, rgba(10,10,14,0.05) 70%)",
                  }}
                />
                <div className="relative flex items-end justify-between gap-2 p-5 sm:p-6">
                  <div className="min-w-0">
                    <h3
                      className="truncate text-lg font-bold text-white sm:text-xl"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {cat.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-white/75 transition-colors group-hover:text-white">
                      Shop the collection
                    </p>
                  </div>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm text-white transition-all duration-300 group-hover:translate-x-1"
                    style={{
                      background: "rgba(255,255,255,0.14)",
                      border: "1px solid rgba(255,255,255,0.25)",
                      backdropFilter: "blur(4px)",
                    }}
                    aria-hidden="true"
                  >
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {/* Featured */}
      <section className="container-narrow pb-20 sm:pb-28">
        <div ref={featuredRef} className="reveal mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="section-title">Featured picks</h2>
            <p className="text-muted mt-2">Hand-selected pieces our community loves</p>
          </div>
          <Link to="/products" className="btn-outline text-sm">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ProductSkeleton count={4} />
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl border py-16 text-center"
            style={{ borderColor: "var(--border)" }}
          >
            <p className="text-muted mb-4">No featured products yet.</p>
            <Link to="/products" className="btn-accent">
              Browse catalog
            </Link>
          </div>
        )}
      </section>

      {/* Perks */}
      <section
        ref={perksRef}
        className="reveal border-t py-16 sm:py-20"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="container-narrow">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: "🚚",
                title: "Swift delivery",
                desc: "Express shipping on orders over ₹500. Track every step.",
              },
              {
                icon: "🔒",
                title: "Secure payments",
                desc: "UPI, cards, wallets & COD. Your data stays protected.",
              },
              {
                icon: "↩",
                title: "Easy returns",
                desc: "30-day hassle-free returns. We make it simple.",
              },
            ].map((perk) => (
              <div
                key={perk.title}
                className="rounded-2xl p-8 transition-colors"
                style={{ background: "var(--bg)" }}
              >
                <span className="mb-4 block text-3xl">{perk.icon}</span>
                <h3
                  className="mb-2 text-lg font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {perk.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-narrow pb-20">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16 sm:py-20"
          style={{ background: "var(--ink)" }}
        >
          {/* Ambient glows — matches the hero treatment */}
          <div
            className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: "var(--accent)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-28 right-1/5 h-72 w-72 rounded-full opacity-25 blur-3xl"
            style={{ background: "var(--teal)" }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              background:
                "repeating-linear-gradient(45deg, transparent, transparent 10px, var(--bg) 10px, var(--bg) 11px)",
            }}
          />
          <span
            className="relative mb-6 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
            style={{
              background: "color-mix(in srgb, var(--accent) 22%, transparent)",
              color: "var(--accent)",
            }}
          >
            New season · 2026
          </span>
          <h2
            className="relative mb-4 text-3xl leading-tight font-bold sm:text-4xl"
            style={{ fontFamily: "var(--font-display)", color: "var(--bg)" }}
          >
            Ready to elevate your everyday?
          </h2>
          <p
            className="relative mx-auto mb-9 max-w-md text-base leading-relaxed sm:text-lg"
            style={{ color: "var(--bg)", opacity: 0.78 }}
          >
            Join thousands who shop smarter with Ghost Panda.
          </p>
          <Link to="/register" className="btn-accent relative">
            Create free account
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
