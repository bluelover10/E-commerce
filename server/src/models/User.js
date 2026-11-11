const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    phone: {
      type: String
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    profileImage: {
      type: String
    },
    role: {
      type: String,
      enum: ["user", "customer", "vendor", "admin"],
      default: "customer"
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null
    },
    // ── Refresh-token rotation (httpOnly cookie + hashed copy in DB) ──────────
    refreshTokenHash: {
      type: String,
      select: false
    },
    tokenVersion: {
      type: Number,
      default: 0,
      select: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    wishlist: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    }],
    addresses: [{
      name: String,
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      phone: String,
      isDefault: Boolean
    }],
    // ── Password Reset ──────────────────────────────────────────────────────
    passwordResetToken: {
      type: String,
      select: false  // never included in queries by default
    },
    passwordResetExpire: {
      type: Date,
      select: false
    },
    // ── Email Verification (OTP — ported from Local/auth project) ─────────────
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String,
      select: false
    },
    // OTP fields (Local: 6-digit, 5-min expiry, max 5 attempts, 60s resend cooldown)
    verificationOTP: {
      type: String,
      select: false
    },
    verificationOTPExpireAt: {
      type: Date,
      select: false
    },
    verificationAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    lastOTPSentAt: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);

// ── Hash password before saving ───────────────────────────────────────────────
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcryptjs.genSalt(12); // increased from 10 to 12
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ── Method to compare passwords ───────────────────────────────────────────────
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

// ── Remove password from response ─────────────────────────────────────────────
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  // Normalize legacy "user" role to "customer" for the API contract
  if (obj.role === "user") obj.role = "customer";
  delete obj.password;
  delete obj.refreshTokenHash;
  delete obj.tokenVersion;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpire;
  delete obj.emailVerificationToken;
  delete obj.verificationOTP;
  delete obj.verificationOTPExpireAt;
  delete obj.verificationAttempts;
  delete obj.lastOTPSentAt;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
