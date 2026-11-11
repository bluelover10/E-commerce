// Temp coupons for verify_money_math.mjs (hyphen codes bypass the admin API
// validator by design, so they are seeded directly in the DB).
//   node scripts/zztst-coupons.js            → upsert the three ZZTST-* coupons
//   node scripts/zztst-coupons.js --cleanup  → delete coupons + math-test users
//                                              and their orders (test artifacts)
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Coupon = require("../src/models/Coupon");
const User = require("../src/models/User");
const Order = require("../src/models/Order");

const TEMP = [
  { code: "ZZTST-FLAT", type: "flat", value: 500 },                       // clamp test
  { code: "ZZTST-PCT", type: "percentage", value: 25, maxDiscount: 300 }, // cap test
  { code: "ZZTST-LEG", type: "flat", value: 150 },                        // legacy path test
];

const run = async () => {
  const cleanup = process.argv.includes("--cleanup");
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce";
  await mongoose.connect(uri);

  if (cleanup) {
    const users = await User.find({ email: /@ghostpanda\.test$/i });
    const ids = users.map((u) => u._id);
    const orders = await Order.deleteMany({ user: { $in: ids } });
    const usersDel = await User.deleteMany({ _id: { $in: ids } });
    const coupons = await Coupon.deleteMany({ code: { $in: TEMP.map((t) => t.code) } });
    console.log(`🧹 removed ${coupons.deletedCount} temp coupons, ${usersDel.deletedCount} test users, ${orders.deletedCount} test orders`);
    await mongoose.disconnect();
    return;
  }

  const far = new Date(Date.now() + 30 * 864e5);
  for (const t of TEMP) {
    await Coupon.updateOne(
      { code: t.code },
      { $set: { ...t, minOrderAmount: 0, maxUses: null, usedCount: 0, isActive: true, expiresAt: far }, $setOnInsert: { vendor: null, usedBy: [] } },
      { upsert: true }
    );
    console.log(`✅ upserted ${t.code}`);
  }
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e.message); process.exit(1); });
