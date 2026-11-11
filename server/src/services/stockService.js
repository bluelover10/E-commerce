const Product = require("../models/Product");

/**
 * Stock service — atomic decrement with rollback, and one-shot restore.
 * Both order flows (payment verify + legacy/COD) share this so stock
 * integrity is identical everywhere.
 */

/**
 * Atomically decrement stock + increment sales for each item.
 * A per-item conditional update guarantees no oversell; if any item fails,
 * everything already decremented is restored before throwing.
 */
const decrementStock = async (items) => {
  const applied = [];
  for (const item of items) {
    if (!item.product) continue;
    const updated = await Product.findOneAndUpdate(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity, sales: item.quantity } }
    );
    if (!updated) {
      // roll back the partial decrement, then surface the failure
      for (const done of applied) {
        await Product.updateOne(
          { _id: done.product },
          { $inc: { stock: done.quantity, sales: -done.quantity } }
        ).catch(() => {});
      }
      const err = new Error(
        `Insufficient stock for "${item.name || "item"}". Available: unknown, Requested: ${item.quantity}`
      );
      err.stockFailed = true;
      throw err;
    }
    applied.push(item);
  }
};

/**
 * Restore stock (cancellation / return). Callers gate with order.stockRestored
 * so this is a one-shot operation per order.
 */
const restoreStock = async (items) => {
  for (const item of items) {
    const productId = item.product?._id || item.product;
    if (!productId) continue;
    await Product.updateOne(
      { _id: productId },
      { $inc: { stock: item.quantity, sales: -item.quantity } }
    );
  }
};

module.exports = { decrementStock, restoreStock };
