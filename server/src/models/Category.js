const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: { type: String },
    image: { type: String },
    icon: { type: String },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

categorySchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }
  next();
});

// Upserts and findOneAndUpdate bypass pre("save") — without this every
// seeded / admin-updated category had slug: null and collided on the
// unique slug index (E11000 on the second create).
categorySchema.pre(["findOneAndUpdate", "updateOne"], function (next) {
  const update = this.getUpdate() || {};
  const incomingName = update.name ?? update.$set?.name ?? update.$update?.name;
  if (incomingName && update.slug === undefined) {
    this.set(
      "slug",
      String(incomingName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    );
  }
  next();
});

module.exports = mongoose.models.Category || mongoose.model("Category", categorySchema);
