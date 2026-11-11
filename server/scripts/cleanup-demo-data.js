/* Cleanup: remove the API-verification test orders/demo drafts from the
 * local database, then the seed script restores product stock levels. */
const mongoose = require("mongoose");
const Order = require("../src/models/Order");
const PaymentDraft = require("../src/models/PaymentDraft");

(async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce";
  await mongoose.connect(uri);
  const o = await Order.deleteMany({});
  const d = await PaymentDraft.deleteMany({});
  console.log(`deleted orders=${o.deletedCount} drafts=${d.deletedCount}`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error("cleanup failed:", e.message);
  process.exit(1);
});
