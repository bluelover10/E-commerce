const mongoose = require("mongoose");

/**
 * Notification — powers in-app bell + Socket.IO realtime pushes.
 */
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["order", "payment", "vendor", "coupon", "review", "system", "stock"],
      default: "system",
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
