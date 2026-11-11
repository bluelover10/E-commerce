import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import * as categoryService from "../services/categoryService";
import ProductCard from "../components/product/ProductCard";
import ProductSkeleton from "../components/ui/ProductSkeleton";
import EmptyState from "../components/ui/EmptyState";

const SORT_MAP = {
  newest: "-createdAt",
  name: "name",
  "price-low": "price",
  "price-high": "-price",
  rating: "-rating",
  popular: "-sales",
};

function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") || "all");
  const [priceMax, setPriceMax] = useState(searchParams.get("priceMax") || "");
  const [priceMin, setPriceMin] = useState(searchParams.get("priceMin") || "");
  const [minRating, setMinRating] = useState(searchParams.get("rating") || "");
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Category rail: pinned below the fixed navbar on desktop (top-24 =
  // 96px = 72px navbar + 24px gap). When the whole panel is taller than
  // the viewport it scrolls INTERNALLY with the scrollbar hidden, so the
  // rail still sticks AND every category stays reachable — with no extra
  // spacing or visual filler anywhere. Below 1024px the rail stays in
  // natural flow with the existing Filters toggle (no cap).
  // Measured on the panel's scrollHeight: identical with and without the
  // cap, so the ResizeObserver can never oscillate, and it only fires
  // from callbacks (never synchronously in the effect body).
  const asideRef = useRef(null);
  const panelRef = useRef(null);
  const [railScrolls, setRailScrolls] = useState(false);

  useEffect(() => {
    const aside = asideRef.current;
    const panel = panelRef.current;
    if (!aside || !panel) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const evaluate = () => {
      if (!mq.matches) {
        setRailScrolls(false); // mobile/tablet: natural flow, no cap
        return;
      }
      const available = window.innerHeight - 96 - 16; // sticky top + bottom gap
      setRailScrolls(panel.scrollHeight > available);
    };
    const ro = new ResizeObserver(evaluate);
    ro.observe(aside);
    window.addEventListener("resize", evaluate);
    mq.addEventListener("change", evaluate);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", evaluate);
      mq.removeEventListener("change", evaluate);
    };
  }, []);

  useEffect(() => {
    const q = searchParams.get("search");
    const c = searchParams.get("category");
    if (q !== null) setSearchTerm(q);
    if (c !== null) setSelectedCategory(c);
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [searchTerm, selectedCategory, selectedBrand, priceMin, priceMax, minRating, sortBy]);

  // Full category list for the sidebar — from /api/categories so it shows
  // every category in the store, not just the ones on the current page.
  // (Derived-from-results is kept only as an offline fallback.)
  useEffect(() => {
    let alive = true;
    categoryService
      .list()
      .then((res) => {
        if (!alive) return;
        const list = res?.data || res || [];
        const names = (Array.isArray(list) ? list : [])
          .map((c) => c?.name)
          .filter(Boolean);
        if (names.length) setCategories(names);
      })
      .catch(() => {
        /* fallback happens in fetchProducts */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Race guard: typing quickly fires several debounced requests; only the
  // newest may touch state, otherwise a slow stale response overwrites fresh
  // results.
  const reqIdRef = useRef(0);

  const fetchProducts = async () => {
    const id = ++reqIdRef.current;
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory !== "all") params.category = selectedCategory;
      if (selectedBrand !== "all") params.brand = selectedBrand;
      if (priceMin) params.priceMin = priceMin;
      if (priceMax) params.priceMax = priceMax;
      if (minRating) params.rating = minRating;
      params.sort = SORT_MAP[sortBy] || "-createdAt";
      params.limit = 48;
      const response = await api.get("/products", { params });
      if (id !== reqIdRef.current) return; // superseded — discard stale
      const data = response.data.products || response.data.data || [];
      setProducts(data);
      if (!categories.length) {
        const cats = [...new Set(data.map((p) => p.category))].filter(Boolean);
        if (cats.length) setCategories(cats);
      }
      const facetBrands = response.data.facets?.brands || [...new Set(data.map((p) => p.brand))].filter(Boolean);
      if (facetBrands.length) setBrands((prev) => [...new Set([...prev, ...facetBrands])]);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  };

  const applySearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (selectedBrand !== "all") params.set("brand", selectedBrand);
    if (priceMin) params.set("priceMin", priceMin);
    if (priceMax) params.set("priceMax", priceMax);
    if (minRating) params.set("rating", minRating);
    setSearchParams(params);
  };

  const selectCategory = (cat) => {
    setSelectedCategory(cat);
    // Keep the URL in sync so refreshing/back preserves the filter
    const params = new URLSearchParams(searchParams);
    if (cat !== "all") params.set("category", cat);
    else params.delete("category");
    setSearchParams(params, { replace: true });
  };

  const clearAll = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setPriceMin("");
    setPriceMax("");
    setMinRating("");
    setSearchParams({});
  };

  const categoryList = selectedCategory !== "all" && !categories.includes(selectedCategory)
    ? ["all", selectedCategory, ...categories]
    : ["all", ...categories];

  return (
    <div className="gradient-mesh flex flex-col pb-16 pt-8 lg:pt-10">
      <div className="container-narrow flex flex-col">
        <div className="mb-6 animate-fade-up">
          <h1 className="section-title">The collection</h1>
          <p className="text-muted mt-2">
            {loading ? "Loading..." : `${products.length} pieces curated for you`}
          </p>
        </div>

        {/* Toolbar */}
        <div
          className="mb-6 flex shrink-0 flex-col gap-4 rounded-2xl p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <input
              type="search"
              placeholder="Search products, brands, categories…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              className="input-field flex-1"
              aria-label="Search products"
            />
            <button onClick={applySearch} className="btn-primary shrink-0 sm:px-8">
              Search
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="btn-outline px-4 py-2 text-xs lg:hidden"
              onClick={() => setFiltersOpen(!filtersOpen)}
              aria-expanded={filtersOpen}
            >
              Filters {filtersOpen ? "▲" : "▼"}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field w-auto py-2.5 pr-8"
              aria-label="Sort products"
            >
              <option value="newest">Newest</option>
              <option value="popular">Most popular</option>
              <option value="name">Name A–Z</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
              <option value="rating">Top rated</option>
            </select>

            <div
              className="hidden rounded-full p-1 sm:flex"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              {["grid", "list"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === mode ? "shadow-sm" : ""
                  }`}
                  style={
                    viewMode === mode
                      ? { background: "var(--surface)", color: "var(--ink)" }
                      : { color: "var(--muted)" }
                  }
                >
                  {mode === "grid" ? "⊞" : "☰"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters + grid — the category rail is PINNED below the fixed
            navbar on desktop (72px tall → top-24 leaves a 24px gap) while
            the product grid scrolls with the page. If the whole panel is
            taller than the viewport, the panel scrolls internally with
            the scrollbar hidden, so the rail still sticks and every
            category stays reachable. On mobile/tablet the rail stays in
            natural flow with the existing Filters toggle. */}
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Sidebar filters */}
          <aside
            ref={asideRef}
            className={`shrink-0 lg:sticky lg:top-24 lg:block lg:w-60 lg:self-start ${
              filtersOpen ? "block w-full" : "hidden"
            }`}
            aria-label="Product filters"
          >
            <div
              className={`${
                railScrolls
                  ? "lg:max-h-[calc(100dvh_-_7rem)] lg:overflow-y-auto lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
                  : ""
              }`}
            >
            <div
              ref={panelRef}
              className="space-y-6 rounded-2xl p-5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Category</h3>
                <ul className="space-y-1">
                  {categoryList.map((cat) => (
                    <li key={cat}>
                      <button
                        onClick={() => selectCategory(cat)}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors"
                        style={
                          selectedCategory === cat
                            ? { background: "var(--accent)", color: "var(--ink)", fontWeight: 600 }
                            : { color: "var(--muted)" }
                        }
                        aria-current={selectedCategory === cat ? "true" : undefined}
                      >
                        {cat === "all" ? "All" : cat}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Brand</h3>
                <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="input-field" aria-label="Filter by brand">
                  <option value="all">All brands</option>
                  {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Min price</h3>
                <input type="number" min="0" placeholder="e.g. 500" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="input-field" aria-label="Min price" />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Max price</h3>
                <input type="number" min="0" placeholder="e.g. 2000" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="input-field" aria-label="Max price" />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Rating</h3>
                <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="input-field" aria-label="Minimum rating">
                  <option value="">Any rating</option>
                  <option value="4">4★ & up</option>
                  <option value="3">3★ & up</option>
                </select>
              </div>
              <button onClick={clearAll} className="btn-outline w-full !py-2 text-xs">Clear all</button>
            </div>
            </div>
          </aside>

          {/* Products — flows with the page; every card renders in full */}
          <section className="min-w-0 flex-1" aria-label="Product listing">
            {loading ? (
              <div className={viewMode === "grid" ? "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-4"}>
                <ProductSkeleton count={6} />
              </div>
            ) : products.length === 0 ? (
              <EmptyState title="No products match" message="Try a different search or clear filters." action={<button onClick={clearAll} className="btn-outline mt-2">Clear filters</button>} />
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 gap-6 pb-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-4 pb-4"}>
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default ProductsPage;
