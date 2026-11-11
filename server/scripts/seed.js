/**
 * Seed demo data for local development.
 * Usage: node scripts/seed.js
 *
 * Creates:
 * - admin@shop.com / Admin123!
 * - vendor@shop.com / Vendor123! (+ approved store "Panda Atelier")
 * - customer@shop.com / Customer123!
 * - categories, coupons, products (linked to vendor where relevant)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Vendor = require("../src/models/Vendor");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const Coupon = require("../src/models/Coupon");

const upsertUser = async ({ name, email, password, role }) => {
  let u = await User.findOne({ email: email.toLowerCase() });
  if (u) {
    u.name = name;
    u.password = password;
    u.role = role;
    u.isActive = true;
    u.isEmailVerified = true;
    await u.save();
    return u;
  }
  u = new User({ name, email: email.toLowerCase(), password, role, isActive: true, isEmailVerified: true });
  await u.save();
  return u;
};

const run = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce";
  await mongoose.connect(uri);
  console.log("Connected:", uri);

  const admin = await upsertUser({ name: "Store Admin", email: "admin@shop.com", password: "Admin123!", role: "admin" });
  const vendorUser = await upsertUser({ name: "Panda Seller", email: "vendor@shop.com", password: "Vendor123!", role: "vendor" });
  await upsertUser({ name: "Demo Customer", email: "customer@shop.com", password: "Customer123!", role: "customer" });

  let vendor = await Vendor.findOne({ user: vendorUser._id });
  if (!vendor) {
    vendor = await Vendor.create({
      user: vendorUser._id,
      storeName: "Panda Atelier",
      description: "Handpicked fashion & lifestyle essentials.",
      contactEmail: "vendor@shop.com",
      status: "approved",
      commissionRate: 10,
      rating: 4.8,
    });
  } else {
    vendor.status = "approved";
    vendor.storeName = vendor.storeName || "Panda Atelier";
    await vendor.save();
  }
  vendorUser.vendor = vendor._id;
  await vendorUser.save();

  const cats = ["Apparel", "Footwear", "Accessories", "Home", "Beauty"];
  for (const [i, name] of cats.entries()) {
    await Category.findOneAndUpdate(
      { name },
      { name, description: `${name} collection`, sortOrder: i, isActive: true },
      { upsert: true }
    );
  }

  await Coupon.findOneAndUpdate(
    { code: "WELCOME10" },
    { code: "WELCOME10", type: "percentage", value: 10, minOrderAmount: 499, expiresAt: new Date(Date.now() + 90 * 864e5), isActive: true, description: "10% off first order" },
    { upsert: true }
  );
  await Coupon.findOneAndUpdate(
    { code: "FLAT100" },
    { code: "FLAT100", type: "flat", value: 100, minOrderAmount: 999, expiresAt: new Date(Date.now() + 90 * 864e5), isActive: true, description: "Flat Rs.100 off" },
    { upsert: true }
  );

  const count = await Product.countDocuments();
  if (count === 0) {
    const samples = [
      { name: "Classic White Tee", price: 799, category: "Apparel", brand: "Panda Basics", stock: 120, rating: 4.5, sales: 320, tags: ["cotton", "tee"], description: "Premium cotton everyday tee." },
      { name: "Runner Sneakers", price: 2999, category: "Footwear", brand: "Stride", stock: 60, rating: 4.7, sales: 210, tags: ["sneakers", "running"], description: "Lightweight daily runners." },
      { name: "Leather Tote", price: 3499, category: "Accessories", brand: "Atelier", stock: 35, rating: 4.8, sales: 140, tags: ["leather", "bag"], description: "Full-grain leather tote." },
      { name: "Ceramic Vase Set", price: 1499, category: "Home", brand: "Casa", stock: 40, rating: 4.6, sales: 90, tags: ["decor", "vase"], description: "Hand-glazed ceramic vases (set of 2)." },
      { name: "Vitamin C Serum", price: 999, category: "Beauty", brand: "GlowLab", stock: 200, rating: 4.4, sales: 410, tags: ["skincare", "serum"], description: "Brightening daily serum." },
      { name: "Denim Jacket", price: 2499, category: "Apparel", brand: "Panda Basics", stock: 8, rating: 4.6, sales: 175, tags: ["denim", "jacket"], description: "Classic-fit denim jacket." },
    ];
    for (const s of samples) {
      await Product.create({ ...s, vendor: vendor._id, approvalStatus: "approved", isActive: true, isFeatured: true, images: [] });
    }
    console.log("Seeded sample products");
  }

  console.log("\n✅ Seed complete");
  console.log("Admin:    admin@shop.com / Admin123!");
  console.log("Vendor:   vendor@shop.com / Vendor123!");
  console.log("Customer: customer@shop.com / Customer123!");
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
