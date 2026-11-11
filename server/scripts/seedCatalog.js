/**
 * Catalog seeder — turns the drop-shipped photo library in
 * uploads/products/<folder>/ into real, browsable products.
 *
 * Pipeline:
 *   1. Optimizes every source photo to an 800px webp next to the originals
 *      (uploads/products/<cat-code>-<n>-optimized.webp) — the same
 *      convention the manual upload flow uses (`*-optimized.webp`,
 *      served publicly at /api/images/products/<file>).
 *   2. Upserts 6 categories (Hoodies, Pants, Shirts, Shorts, Suits & Blazers,
 *      T-Shirts) with an image + icon for storefront cards.
 *   3. Upserts one product per photo, linked to the demo vendor
 *      (Panda Atelier), with a distinct name, category-specific description,
 *      price, tags, specifications and stock.
 *
 * Idempotent: keyed on the product `image` URL — re-running updates in place.
 * Excluded on purpose:
 *   - shirt/28.webp, suit/15.webp  (visible Shutterstock watermarks)
 *   - suit/u 1.jpg                 (SHA-identical duplicate of suit/26.jpg,
 *                                   kept — "Cocoa Hill Pocket-Square Suit")
 * Usage: node scripts/seedCatalog.js   (or npm run seed:catalog)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const User = require("../src/models/User");
const Vendor = require("../src/models/Vendor");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");

const UPLOADS = path.join(__dirname, "..", "uploads", "products");

const EXCLUDED = [
  { file: "shirt/28.webp", code: "shirt", reason: "visible Shutterstock watermark" },
  { file: "suit/15.webp",  code: "suit",  reason: "visible Shutterstock watermark" },
  { file: "suit/u 1.jpg",  code: "suit",  reason: "byte-identical duplicate of suit/26.jpg" },
];

/* ─── description templates (rotated per item so copy doesn't read stamped) ── */
const LINES = {
  Hoodies: [
    (n) => `${n.name} — mid-weight brushed-fleece pullover with a lined hood, kangaroo pocket and ribbed cuffs that keep their shape wash after wash. The relaxed cut layers cleanly over tees and shirts.`,
    (n) => `${n.name} — soft-loopback fleece with a double-lined hood and drop shoulders. Built for slow mornings, late drives and everything in between.`,
    (n) => `${n.name} — heavyweight cotton-blend fleece that traps warmth without the bulk. Split kangaroo pocket, flat drawcords, and a silhouette that stays sharp after the tenth wash.`,
    (n) => `${n.name} — garment-washed for a lived-in feel from day one. Roomy through the body, neat at the hip, and stitched to survive daily rotation.`,
  ],
  Pants: [
    (n) => `${n.name} — tailored on the hip and easy through the leg, with a mid-rise waistband that stays put all day. Pairs as well with sneakers as it does with formal shoes.`,
    (n) => `${n.name} — a clean, versatile trouser in structured weave. Finished with slanted pockets, a pressed crease and reinforced belt loops.`,
    (n) => `${n.name} — cut for movement with a touch of stretch. Doubles as your weekday trouser and your weekend staple.`,
    (n) => `${n.name} — mid-weight twill with a soft handle and a straight fall. Pre-shrunk, colourfast and quietly formal when it needs to be.`,
  ],
  Shirts: [
    (n) => `${n.name} — breathable weave, a polished collar and a fit that's trim without pulling. Button it to the collar for meetings, leave it open over a tee for weekends.`,
    (n) => `${n.name} — pre-washed for softness with mother-of-pearl-finish buttons and clean single-needle seams. Quiet enough to repeat weekly.`,
    (n) => `${n.name} — a do-everything shirt in a crisp handle. Twin chest pockets, a curved hem, and a collar that holds its shape without fussy ironing.`,
    (n) => `${n.name} — cut from air-flow fabric for long days and warm evenings. Straight-fit through the torso with just enough taper at the waist.`,
  ],
  Shorts: [
    (n) => `${n.name} — quick-drying weave with an elastic drawstring waist and deep phone-safe pockets. Vacation-ready straight out of the box.`,
    (n) => `${n.name} — mid-thigh cut in a soft, breathable blend that shrugs off holiday wear and tear. Lined pocket bags, zero cling.`,
    (n) => `${n.name} — from the pool to the boardwalk without a costume change. Lightweight, fast-drying and finished with a ward-off-flap rear pocket.`,
    (n) => `${n.name} — relaxed A-line short with a soft-touch finish. Pair with the day's simplest tee and you're done.`,
  ],
  "Suits & Blazers": [
    (n) => `${n.name} — half-canvassed construction with a natural shoulder line and a lapel that rolls, never sits. Tailored for weddings, presentations and the photos after.`,
    (n) => `${n.name} — a refined weave with a whisper of stretch so the fit survives a full day. Finished with a Bemberg lining and pick-stitched edges.`,
    (n) => `${n.name} — slim-with-room tailoring: cut close, but never at the cost of movement. Trousers finish unhemmed so you can set the exact break.`,
    (n) => `${n.name} — timeless two-piece in a travel-tolerant weave that resists creasing between the car and the conference.`,
  ],
  "T-Shirts": [
    (n) => `${n.name} — 220 GSM combed cotton with a collar that doesn't sag and a boxy-but-clean drop. The tee you'll re-buy in every colour.`,
    (n) => `${n.name} — bio-washed for zero shrinkage and a soft hand-feel. Twin-needle hems, taped neck, printed to survive the washer.`,
    (n) => `${n.name} — heavyweight regular fit with a clean chest line. Pre-shrunk, side-seamed and ready to be your hardest-working essential.`,
    (n) => `${n.name} — spun from 100% ringspun cotton, cut slightly long so it stays tucked or hangs right untucked.`,
  ],
};

/* ─── manifest: folder = category intent; per-item name/colour/price copy ──── */
const CATALOG = [
  // ── Hoodies ──────────────────────────────────────────────────────────────
  { cat: "Hoodies", code: "hoody", file: "hoodie/25.jpeg",  name: "Sage Collared Knit Hoodie",   color: "sage green", adj: "quarter-zip warmth", price: 1899 },
  { cat: "Hoodies", code: "hoody", file: "hoodie/h 1.jpg",  name: "Storm Heather Pullover Hoodie", color: "storm grey", price: 1699 },
  { cat: "Hoodies", code: "hoody", file: "hoodie/h 2.jpg",  name: "Blush Pink Classic Hoodie",  color: "blush pink", price: 1599 },
  { cat: "Hoodies", code: "hoody", file: "hoodie/h 3.jpg",  name: "Aubergine Heavy Fleece Hoodie", color: "deep aubergine", price: 1999 },
  { cat: "Hoodies", code: "hoody", file: "hoodie/h 4.jpg",  name: "Cream Everyday Pullover Hoodie", color: "cream", price: 1749 },
  { cat: "Hoodies", code: "hoody", file: "hoodie/h 5.jpg",  name: "Midnight Zip Hoodie",        color: "true black", price: 2199 },
  { cat: "Hoodies", code: "hoody", file: "hoodie/h 6.jpg",  name: "Caramel Fleece-Lined Hoodie", color: "caramel", price: 1899 },
  { cat: "Hoodies", code: "hoody", file: "hoodie/h 7.jpg",  name: "Drizzle Grey Overhead Hoodie", color: "grey-green", price: 1649 },
  { cat: "Hoodies", code: "hoody", file: "hoodie/h 8.jpg",  name: "Golden Hour Graphic Hoodie", color: "mustard yellow", adj: "statement graphic", price: 2099 },
  { cat: "Hoodies", code: "hoody", file: "hoodie/h 9.jpg",  name: "Redline Back-Print Hoodie",  color: "red", adj: "back-print streetwear", price: 2299 },
  { cat: "Hoodies", code: "hoody", file: "hoodie/h 10.jpg", name: "Steel Grey Lounge Hoodie",   color: "steel grey", price: 1699 },
  { cat: "Hoodies", code: "hoody", file: "hoodie/h 11.jpg", name: "Verve Green Chest-Print Hoodie", color: "verde green", adj: "tonal chest print", price: 2199 },
  { cat: "Hoodies", code: "hoody", file: "hoodie/h 12.jpg", name: "Toffee Suedette Hoodie",     color: "toffee brown", adj: "suedette finish", price: 2499 },

  // ── Pants ────────────────────────────────────────────────────────────────
  { cat: "Pants", code: "pant", file: "pant/27.jpg",  name: "Black Cargo Trousers",        color: "jet black", adj: "utility pockets", price: 1999 },
  { cat: "Pants", code: "pant", file: "pant/p 1.jpg", name: "Midnight Corduroy Trousers",  color: "midnight black", adj: "fine-wale corduroy", price: 2199 },
  { cat: "Pants", code: "pant", file: "pant/p 2.jpg", name: "Olive Chino Trousers",        color: "olive", price: 1599 },
  { cat: "Pants", code: "pant", file: "pant/p 3.jpg", name: "Pinstripe Tailored Trousers", color: "charcoal pinstripe", adj: "suit-ready tailoring", price: 2499 },
  { cat: "Pants", code: "pant", file: "pant/p 4.jpg", name: "Onyx Slim Tapered Jeans",     color: "onyx black", price: 1899 },
  { cat: "Pants", code: "pant", file: "pant/p 5.jpg", name: "Rose Cloud Co-ord Trousers",  color: "dusty rose", adj: "loungewear knit", price: 1499 },
  { cat: "Pants", code: "pant", file: "pant/p 6.jpg", name: "Stone Grey Straight Jeans",   color: "stone grey", price: 1799 },
  { cat: "Pants", code: "pant", file: "pant/p 7.jpg", name: "Statue Grey Relaxed Trousers", color: "statue grey", adj: "easy-fit", price: 1549 },
  { cat: "Pants", code: "pant", file: "pant/p 8.jpg", name: "Slate Dress Trousers",        color: "slate", adj: "commuter-ready", price: 2099 },
  { cat: "Pants", code: "pant", file: "pant/p 9.jpg", name: "Cloud White Straight Jeans",  color: "cloud white", price: 1899 },
  { cat: "Pants", code: "pant", file: "pant/p 10.jpg", name: "Ivory Flat-Front Trousers",  color: "ivory", adj: "co-ord suit pant", price: 2199 },
  { cat: "Pants", code: "pant", file: "pant/p 11.jpg", name: "Crimson Pleated Trousers",   color: "crimson", adj: "single pleat", price: 2299 },
  { cat: "Pants", code: "pant", file: "pant/p 12.jpg", name: "Walnut Wide-Leg Trousers",   color: "walnut", adj: "wide-leg", price: 1999 },

  // ── Shirts ───────────────────────────────────────────────────────────────
  { cat: "Shirts", code: "shirt", file: "shirt/7.png",   name: "Graphite Formal Shirt & Tie", color: "graphite", adj: "office-ready", price: 1699 },
  { cat: "Shirts", code: "shirt", file: "shirt/9.webp",  name: "Emerald Nights Shirt",     color: "deep emerald", price: 1449 },
  { cat: "Shirts", code: "shirt", file: "shirt/10.jpg",  name: "Marigold Paisley Print Shirt", color: "multicolour paisley", adj: "holiday staple", price: 1599 },
  { cat: "Shirts", code: "shirt", file: "shirt/13.jpg",  name: "Harbour Blue & Check Twin-Set Shirt", color: "harbour blue", adj: "twin-pack styling", price: 2199 },
  { cat: "Shirts", code: "shirt", file: "shirt/14.webp", name: "Noir Dinner Shirt",        color: "jet black", adj: "with tonal tie", price: 1799 },
  { cat: "Shirts", code: "shirt", file: "shirt/24.webp", name: "Burgundy Grandad-Collar Shirt", color: "burgundy", adj: "collarless", price: 1499 },
  { cat: "Shirts", code: "shirt", file: "shirt/29.avif", name: "Midnight Navy Dress Shirt", color: "midnight navy", adj: "slim fit", price: 1699 },
  { cat: "Shirts", code: "shirt", file: "shirt/31.webp", name: "Harvest Check Overshirt",  color: "harvest plaid", adj: "shacket cut", price: 1649 },
  { cat: "Shirts", code: "shirt", file: "shirt/s 1.jpg",  name: "Coastline White Relaxed Shirt", color: "crisp white", price: 1399 },
  { cat: "Shirts", code: "shirt", file: "shirt/s 2.jpg",  name: "Powder Blue Everyday Shirt", color: "powder blue", price: 1299 },
  { cat: "Shirts", code: "shirt", file: "shirt/s 3.jpg",  name: "Crimson Bloom Printed Shirt", color: "crimson floral", adj: "resort print", price: 1549 },
  { cat: "Shirts", code: "shirt", file: "shirt/s 4.jpg",  name: "Terracotta Camp-Collar Shirt", color: "terracotta", adj: "open collar", price: 1449 },
  { cat: "Shirts", code: "shirt", file: "shirt/s 5.jpg",  name: "Leopard Statement Shirt", color: "leopard print", adj: "statement piece", price: 1899 },
  { cat: "Shirts", code: "shirt", file: "shirt/s 6.jpg",  name: "Aubergine & Ivory Flat-Lay Shirt", color: "aubergine", adj: "dress-shirt flat lay", price: 1349 },
  { cat: "Shirts", code: "shirt", file: "shirt/s 7.jpg",  name: "Quintessential Navy Dress Shirt", color: "ink navy", price: 1599 },
  { cat: "Shirts", code: "shirt", file: "shirt/s 8.jpg",  name: "Ivory Linen-Feel Grandad Shirt", color: "ivory", adj: "linen feel", price: 1699 },
  { cat: "Shirts", code: "shirt", file: "shirt/s 9.jpg",  name: "Oxford Stripe Formal Shirt", color: "sky stripe", adj: "oxford weave", price: 1499 },
  { cat: "Shirts", code: "shirt", file: "shirt/s 10.jpg", name: "Scholar Navy Button-Down", color: "dark navy", adj: "button-down collar", price: 1399 },
  { cat: "Shirts", code: "shirt", file: "shirt/s 11.jpg", name: "Amber Flannel Check Shirt", color: "amber plaid", adj: "brushed flannel", price: 1849 },
  { cat: "Shirts", code: "shirt", file: "shirt/s 12.jpg", name: "Skyway Chambray Shirt",    color: "chambray blue", price: 1449 },

  // ── Shorts ───────────────────────────────────────────────────────────────
  { cat: "Shorts", code: "short", file: "shorts/r 1.jpg",  name: "Dune Black Travel Shorts",   color: "black", adj: "quick-dry", price: 999 },
  { cat: "Shorts", code: "short", file: "shorts/r 2.jpg",  name: "Shoreline Grey knit Shorts", color: "grey knit", price: 899 },
  { cat: "Shorts", code: "short", file: "shorts/r 3.jpg",  name: "Cliffside Khaki Cargo Shorts", color: "khaki", adj: "utility cargo", price: 1099 },
  { cat: "Shorts", code: "short", file: "shorts/r 4.jpg",  name: "Regatta Red Stripe Shorts",  color: "red stripe", adj: "swim-ready", price: 949 },
  { cat: "Shorts", code: "short", file: "shorts/r 5.jpg",  name: "Aqua Coast Weekend Shorts",  color: "aqua blue", price: 899 },
  { cat: "Shorts", code: "short", file: "shorts/r 6.jpg",  name: "Riviera Stone Shorts",       color: "stone", adj: "linen feel", price: 1049 },
  { cat: "Shorts", code: "short", file: "shorts/r 7.jpg",  name: "Safari Field Shorts",        color: "sungrown beige", adj: "ripstop", price: 1199 },
  { cat: "Shorts", code: "short", file: "shorts/r 8.jpg",  name: "Marina Aqua Swim Shorts",    color: "deep aqua", adj: "swim trunk", price: 849 },
  { cat: "Shorts", code: "short", file: "shorts/r 9.jpg",  name: "Fiesta Red Court Shorts",    color: "fiesta red", adj: "tennis fit", price: 949 },
  { cat: "Shorts", code: "short", file: "shorts/r 10.jpg", name: "Tropic Palm Print Shorts",   color: "navy palm print", price: 1049 },
  { cat: "Shorts", code: "short", file: "shorts/r 11.jpg", name: "Chase Olive Utility Shorts", color: "olive", adj: "drawstring", price: 999 },
  { cat: "Shorts", code: "short", file: "shorts/r 12.jpg", name: "Harbour Navy Board Shorts",  color: "harbour navy", adj: "board length", price: 1099 },

  // ── Suits & Blazers (+ verified misfiles moved here) ─────────────────────
  { cat: "Suits & Blazers", code: "suit", file: "suit/11.jfif",   name: "Onyx Two-Piece Business Suit",   color: "onyx black", price: 7999 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/12.jfif",   name: "Monochrome Polka Tuxedo",        color: "midnight black", adj: "polka-dot tie", price: 12999 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/17.jfif",   name: "Mauve Mist Three-Piece Suit",    color: "dusty mauve", adj: "with waistcoat", price: 11499 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/20.jpg",    name: "Marigold Statement Suit",        color: "marigold orange", adj: "statement cut", price: 8999 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/21.jpg",    name: "Amber Dusk Tailored Suit",       color: "amber", price: 9999 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/26.jpg",    name: "Cocoa Hill Pocket-Square Suit",  color: "cocoa brown", adj: "lapel-pin styling", price: 10499 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/30.webp",   name: "Midnight Shawl-Lapel Tuxedo",    color: "midnight blue", adj: "shawl lapel", price: 13999 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/u 2.jpg",   name: "Ashwood Tailored Two-Piece",     color: "ash grey", price: 9499 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/u 3.jpg",   name: "Pearl Grey Slim Suit",           color: "pearl grey", price: 8999 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/u 4.jpg",   name: "Ivory Coast Linen-Blend Blazer", color: "ivory", adj: "unstructured blazer", price: 6499 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/u 5.jpg",   name: "Graphite Edge Business Suit",    color: "graphite", adj: "with contrast tie", price: 9999 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/u 6.jpg",   name: "Vine Charm Blazer Set",          color: "bottle green", adj: "with wine shirt", price: 7499 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/u 7.jpg",   name: "Charcoal Ruby-Tie Suit",         color: "charcoal", price: 9499 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/u 8.jpg",   name: "Dove Grey Slim-Fit Suit",        color: "dove grey", adj: "with oxblood shirt", price: 10499 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/u 9.jpg",   name: "Silver Birch Three-Piece Suit",  color: "silver grey", adj: "three-piece", price: 12999 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/u 10.jpg",  name: "Indigo Roll Vest Ensemble",      color: "indigo", adj: "waistcoat + tie", price: 6999 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/u 11.jpg",  name: "Autumn Rust Casual Blazer",      color: "rust", adj: "knit-blazer", price: 5999 },
  { cat: "Suits & Blazers", code: "suit", file: "suit/u 12.jpg",  name: "Noir Slim-Fit Business Suit",    color: "jet black", adj: "slim fit", price: 10999 },
  // verified misfile — full bandhgala photo that lived in shirt/
  { cat: "Suits & Blazers", code: "suit", file: "shirt/16.jfif",  name: "Ivory Bandhgala Evening Suit",   color: "ivory white", adj: "bandhgala collar", price: 12499 },

  // ── T-Shirts (+ knit top verified from shirt/4.webp) ─────────────────────
  { cat: "T-Shirts", code: "tee", file: "t-shirt/t 1.jpg",  name: "Canvas White Oversized Tee",  color: "off-white", adj: "oversized fit", price: 899 },
  { cat: "T-Shirts", code: "tee", file: "t-shirt/t 2.jpg",  name: "Pure White Daily Tee",        color: "white", price: 699 },
  { cat: "T-Shirts", code: "tee", file: "t-shirt/t 3.jpg",  name: "Sunset Graphic Tee",          color: "rust orange", adj: "artwork print", price: 849 },
  { cat: "T-Shirts", code: "tee", file: "t-shirt/t 4.jpg",  name: "Sage Line-Art Graphic Tee",   color: "sage", adj: "minimal print", price: 849 },
  { cat: "T-Shirts", code: "tee", file: "t-shirt/t 5.jpg",  name: "Hocus Black Print Tee",       color: "black", adj: "playful print", price: 799 },
  { cat: "T-Shirts", code: "tee", file: "t-shirt/t 6.jpg",  name: "Bone White Essential Tee",    color: "bone white", price: 649 },
  { cat: "T-Shirts", code: "tee", file: "t-shirt/t 7.jpg",  name: "Ultraviolet UNFRIEND Tee",    color: "ultraviolet", adj: "typographic print", price: 949 },
  { cat: "T-Shirts", code: "tee", file: "t-shirt/t 8.jpg",  name: "Moss Green V-Neck Tee",       color: "moss green", adj: "v-neck", price: 699 },
  { cat: "T-Shirts", code: "tee", file: "t-shirt/t 9.jpg",  name: "Graphite Muscle-Fit Tee",     color: "graphite", adj: "muscle fit", price: 749 },
  { cat: "T-Shirts", code: "tee", file: "t-shirt/t 11.jpg", name: "One & Only Jet Graphic Tee",  color: "jet black", adj: "statement graphic", price: 899 },
  { cat: "T-Shirts", code: "tee", file: "t-shirt/t 12.jpg", name: "Forest Print Island Tee",     color: "indigo print", adj: "gallery print", price: 899 },
  { cat: "T-Shirts", code: "tee", file: "t-shirt/t10.jpg",  name: "But First White Typography Tee", color: "white", adj: "typography print", price: 799 },
  { cat: "T-Shirts", code: "tee", file: "shirt/4.webp",     name: "Charcoal Knit Textured Tee",  color: "charcoal", adj: "jacquard knit", price: 999 },
];

const CATEGORY_META = [
  { name: "Hoodies",        desc: "Brushed fleece hoodies and statement pullovers — warmth without the bulk.",           icon: "🧥", sort: 10 },
  { name: "Pants",          desc: "Chinos, corduroys, jeans and tailoring — trousers built for the whole week.",         icon: "👖", sort: 11 },
  { name: "Shirts",         desc: "Oxfords, flannels, prints and grandad collars — shirting for every hour.",            icon: "👔", sort: 12 },
  { name: "Shorts",         desc: "Travel-ready shorts with quick-dry weaves and holiday detailing.",                    icon: "🩳", sort: 13 },
  { name: "Suits & Blazers",desc: "Half-canvassed tailoring, tuxedos and unstructured blazers for the big days.",        icon: "🕴️", sort: 14 },
  { name: "T-Shirts",       desc: "Heavyweight combed-cotton tees — graphics, essentials and everything between.",       icon: "👕", sort: 15 },
];

const BRAND_BY_CAT = {
  Hoodies: "Ghost Panda Core",
  Pants: "Panda Basics",
  Shirts: "Ghost Panda Selection",
  Shorts: "Panda Summer",
  "Suits & Blazers": "Atelier by Ghost Panda",
  "T-Shirts": "Panda Basics",
};

/* Stable pseudo-random from a string so re-runs are deterministic */
const hash = (s) => {
  let h = 2166136261;
  for (const ch of s) h = (Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0);
  return h;
};
const pick = (n, offset = 0) => hash(n) % 4; // rotate template lines
const invent = (n) => {
  const h = hash(n);
  return {
    stock: 8 + (h % 33),             // 8..40
    rating: +(4.1 + (h % 81) / 100).toFixed(1), // 4.1..4.9
    sales: 15 + (h % 386),
    ship: 2 + (h % 3),
  };
};

const slugify = (file) => {
  const base = path.basename(file, path.extname(file));
  return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
};

const imageUrlFor = (code, file) =>
  `/api/images/products/${code}-${slugify(file)}-optimized.webp`;

/* ─── step 1: optimize images ─────────────────────────────────────────────── */
async function optimizeAll() {
  let made = 0, skipped = 0, failed = 0;
  for (const item of CATALOG) {
    const src = path.join(UPLOADS, item.file);
    const destName = `${item.code}-${slugify(item.file)}-optimized.webp`;
    const dest = path.join(UPLOADS, destName);
    item.imageUrl = imageUrlFor(item.code, item.file);
    item.dest = dest;

    if (!fs.existsSync(src)) {
      console.error(`  missing source: ${item.file}`);
      failed++;
      continue;
    }
    if (fs.existsSync(dest)) {
      const sT = fs.statSync(src).mtimeMs, dT = fs.statSync(dest).mtimeMs;
      if (dT >= sT) { skipped++; continue; } // already optimized & current
    }
    try {
      await sharp(src)
        .rotate() // honour EXIF orientation (phone photos)
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(dest);
      made++;
    } catch (e) {
      console.error(`  sharp failed on ${item.file}: ${e.message}`);
      failed++;
    }
  }
  console.log(`Images: ${made} optimized, ${skipped} already current, ${failed} failed`);
  return failed;
}

/* ─── step 1b: prune products tied to excluded images (self-healing re-runs) ── */
async function pruneExcluded() {
  let pruned = 0;
  for (const ex of EXCLUDED) {
    const url = imageUrlFor(ex.code, ex.file);
    const del = await Product.deleteOne({ image: url });
    if (del.deletedCount) {
      pruned += del.deletedCount;
      console.log(`  pruned [${ex.reason}]: ${url}`);
      const orphan = path.join(UPLOADS, path.basename(url));
      if (fs.existsSync(orphan)) {
        fs.unlinkSync(orphan); // remove the webp too — no unlinked files left behind
      }
    }
  }
  if (pruned) console.log(`Pruned ${pruned} product(s) pointing at excluded images`);
  return pruned;
}

/* ─── step 2+3: categories + products ─────────────────────────────────────── */
async function seedDb() {
  await mongoose.connect(
    process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce"
  );
  console.log("Connected for catalog seeding");
  await pruneExcluded();

  const vendorUser = await User.findOne({ email: "vendor@shop.com" });
  let vendor = vendorUser ? await Vendor.findOne({ user: vendorUser._id }) : null;
  if (!vendor) {
    // seed.js hasn't run — create the demo vendor to attach products to
    vendor = await Vendor.create({
      storeName: "Panda Atelier",
      description: "Handpicked fashion & lifestyle essentials.",
      contactEmail: vendorUser?.email || "vendor@shop.com",
      status: "approved",
      commissionRate: 10,
      rating: 4.8,
      user: vendorUser?._id,
    });
    if (vendorUser) { vendorUser.vendor = vendor._id; await vendorUser.save(); }
  }

  // Categories first pass (without image), so products can be created
  for (const c of CATEGORY_META) {
    await Category.findOneAndUpdate(
      { name: c.name },
      { name: c.name, description: c.desc, icon: c.icon, sortOrder: c.sort, isActive: true },
      { upsert: true }
    );
  }

  let created = 0, updated = 0;
  for (const item of CATALOG) {
    if (!item.imageUrl) continue; // optimization failed earlier
    const r = invent(item.name);
    const name = item.name; // manifest names are already title-cased correctly
    const template = LINES[item.cat][pick(name)];

    const doc = {
      name,
      description: template({ name }),
      sku: `GP-${item.code.toUpperCase()}-${String(hash(item.file) % 100000).padStart(5, "0")}`,
      price: item.price,
      originalPrice: Math.round((item.price * (1.25 + pick(item.file) * 0.05)) / 10) * 10, // 25–40% off
      image: item.imageUrl,
      images: [{ url: item.imageUrl, uploadedAt: new Date() }],
      category: item.cat,
      brand: BRAND_BY_CAT[item.cat],
      vendor: vendor._id,
      approvalStatus: "approved",
      isActive: true,
      stock: r.stock,
      rating: r.rating,
      sales: r.sales,
      shippingDays: r.ship,
      returnPolicy: "30-day easy returns — tags intact, original packaging.",
      specifications: {
        Fabric: item.cat === "Suits & Blazers" ? "Poly-viscose blend, half-canvas" : "Cotton-blend, pre-shrunk",
        Fit: /oversized|relaxed|wide-leg|muscle/.test(name.toLowerCase()) ? "Relaxed fit" : "Regular fit",
        Care: "Machine wash cold, do not bleach, warm iron if needed",
        Origin: "Designed by Ghost Panda",
      },
      tags: [item.cat.toLowerCase(), ...name.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((w) => w.length > 3)],
    };

    const res = await Product.findOneAndUpdate(
      { image: item.imageUrl }, // image URL is unique per source file ⇒ stable key
      doc,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // isFeatured for the first item of every category
    const first = CATALOG.find((c) => c.cat === item.cat)?.file === item.file;
    if (first !== res.isFeatured) {
      res.isFeatured = first;
      await res.save({ validateBeforeSave: false });
    }
    created++;
  }

  // Categories second pass: set category card image to its first product photo
  for (const c of CATEGORY_META) {
    const firstItem = CATALOG.find((i) => i.cat === c.name && i.imageUrl);
    if (firstItem) {
      await Category.findOneAndUpdate({ name: c.name }, { image: firstItem.imageUrl });
    }
  }

  const total = await Product.countDocuments({ vendor: vendor._id });
  console.log(`Products: processed=${created} · vendor catalog now ${total} active`);
  await mongoose.disconnect();
}

(async () => {
  const clashes = CATALOG.filter((i) => EXCLUDED.some((e) => e.file === i.file));
  if (clashes.length) {
    throw new Error(`Manifest references excluded files: ${clashes.map((c) => c.file).join(", ")}`);
  }
  const failed = await optimizeAll();
  if (failed > 0) console.warn(`${failed} image(s) could not be optimized — those products were skipped.`);
  await seedDb();
  console.log("\n✅ Catalog seed complete");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
