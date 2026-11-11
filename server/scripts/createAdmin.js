// Usage:
//   node scripts/createAdmin.js "Admin Name" admin@shop.com StrongPass123
//   npm run create-admin -- "Admin Name" admin@shop.com StrongPass123
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../src/models/User");

const run = async () => {
  const [name = "Admin", email = "admin@shop.com", password = "Admin123!"] = process.argv.slice(2);

  if (!email || !password || password.length < 8) {
    console.error("Usage: node scripts/createAdmin.js \"Name\" email password(min 8 chars)");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce";
  await mongoose.connect(uri);

  let user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    user.name = name;
    user.password = password; // pre-save hook hashes
    user.role = "admin";
    user.isActive = true;
    user.isEmailVerified = true;
    await user.save();
    console.log(`✅ Promoted existing user to admin: ${email}`);
  } else {
    user = new User({ name, email: email.toLowerCase(), password, role: "admin", isActive: true, isEmailVerified: true });
    await user.save();
    console.log(`✅ Created admin user: ${email}`);
  }
  console.log(`Login at ${process.env.FRONTEND_URL || "http://localhost:5173"}/login then visit /admin`);
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e.message); process.exit(1); });
