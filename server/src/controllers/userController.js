const mongoose = require("mongoose");
const crypto = require("crypto");
const User = require("../models/User");
const Order = require("../models/Order");
const jwt = require("jsonwebtoken");
const { sendEmail, emailTemplates } = require("../config/email");
const { generateOTP } = require("../utils/generateOTP");
const { issueAuthForUser, setRefreshCookie } = require("./authController");

const isProduction = process.env.NODE_ENV === "production";
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

// ── Generate JWT Token ────────────────────────────────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d"
  });
};

// ── Register User (OTP flow — ported from Local/auth project) ─────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // OTP (Local: 6-digit, 5-min expiry) + legacy link token for old clients
    const otp = generateOTP();
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");

    const user = new User({
      name,
      email,
      password,
      emailVerificationToken,
      verificationOTP: otp,
      verificationOTPExpireAt: Date.now() + 5 * 60 * 1000,
      verificationAttempts: 0,
      lastOTPSentAt: Date.now()
    });
    await user.save();

    // Send OTP verification email (non-blocking, log-only if no SMTP)
    try {
      const template = emailTemplates.verificationOTP(otp);
      await sendEmail({ to: email, ...template });
    } catch (emailErr) {
      console.error("Verification email failed:", emailErr.message);
    }

    const token = generateToken(user._id);

    // Issue refresh-token pair (httpOnly cookie). Access token stays in body for compat.
    try {
      const { accessToken, refreshToken } = await issueAuthForUser(user);
      setRefreshCookie(res, refreshToken);
      return res.status(201).json({
        success: true,
        token: accessToken,
        accessToken,
        refreshToken,
        user: user.toJSON(),
        // Only expose OTP in non-production for local testing (same as Local project)
        ...(isProduction ? {} : { otp })
      });
    } catch {
      // Fallback to legacy single-token if refresh issuance fails
    }

    res.status(201).json({
      success: true,
      token,
      user: user.toJSON(),
      // Only expose OTP in non-production for local testing (same as Local project)
      ...(isProduction ? {} : { otp })
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

// ── Login User ────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account has been deactivated. Please contact support." });
    }

    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    try {
      const { accessToken, refreshToken } = await issueAuthForUser(user);
      setRefreshCookie(res, refreshToken);
      return res.json({
        success: true,
        token: accessToken,
        accessToken,
        refreshToken,
        user: user.toJSON()
      });
    } catch {
      // fallback below
    }

    res.json({
      success: true,
      token,
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// ── Get Current User ──────────────────────────────────────────────────────────
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("wishlist");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user", error: error.message });
  }
};

// ── Update User Profile ───────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const allowed = ["name", "phone", "address", "profileImage"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide your email address" });
    }

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return res.json({
        success: true,
        message: "If that email is registered, you will receive a reset link shortly."
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${resetToken}`;

    try {
      const template = emailTemplates.forgotPassword(user.name, resetUrl);
      await sendEmail({ to: user.email, ...template });
    } catch (emailErr) {
      // Roll back the token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: "Failed to send reset email. Please try again." });
    }

    res.json({
      success: true,
      message: "If that email is registered, you will receive a reset link shortly."
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to process request", error: error.message });
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "Please provide password and confirmation" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpire: { $gt: Date.now() }
    }).select("+passwordResetToken +passwordResetExpire");

    if (!user) {
      return res.status(400).json({ message: "Password reset link is invalid or has expired" });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    // Invalidate every existing session — refresh tokens issued before this
    // change must stop working immediately.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.refreshTokenHash = undefined;
    await user.save({ validateBeforeSave: false });

    // Notify user of password change
    try {
      const template = emailTemplates.passwordChanged(user.name);
      await sendEmail({ to: user.email, ...template });
    } catch (err) {
      // Non-critical — log but don't fail
      console.error("Password change notification email failed:", err.message);
    }

    res.json({ success: true, message: "Password reset successfully. Please log in." });
  } catch (error) {
    res.status(500).json({ message: "Password reset failed", error: error.message });
  }
};

// ── Change Password (authenticated) ──────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    // Invalidate every existing session after a successful change
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.refreshTokenHash = undefined;
    await user.save({ validateBeforeSave: false });

    try {
      const template = emailTemplates.passwordChanged(user.name);
      await sendEmail({ to: user.email, ...template });
    } catch (err) {
      console.error("Password change notification email failed:", err.message);
    }

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to change password", error: error.message });
  }
};

// ── Verify Email via OTP (ported from Local/auth project) ─────────────────────
// POST /api/users/verify-email { code, email }
const verifyEmail = async (req, res) => {
  const { code, email } = req.body;

  try {
    if (!code) {
      return res.status(400).json({ success: false, message: "Verification code is required" });
    }

    let user = null;
    if (email) {
      user = await User.findOne({ email }).select("+verificationOTP +verificationOTPExpireAt +verificationAttempts +isEmailVerified");
      if (!user) {
        return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
      }
      if (user.isEmailVerified) {
        return res.status(400).json({ success: false, message: "Email is already verified" });
      }
      if ((user.verificationAttempts || 0) >= MAX_OTP_ATTEMPTS) {
        return res.status(429).json({ success: false, message: "Too many wrong attempts. Please request a new code." });
      }
      const isMatch =
        user.verificationOTP === code &&
        user.verificationOTPExpireAt &&
        new Date(user.verificationOTPExpireAt).getTime() > Date.now();
      if (!isMatch) {
        user.verificationAttempts = (user.verificationAttempts || 0) + 1;
        const lockedOut = user.verificationAttempts >= MAX_OTP_ATTEMPTS;
        if (lockedOut) {
          user.verificationOTP = undefined;
          user.verificationOTPExpireAt = undefined;
        }
        await user.save({ validateBeforeSave: false });
        return res.status(lockedOut ? 429 : 400).json({
          success: false,
          message: lockedOut ? "Too many wrong attempts. Please request a new code." : "Invalid or expired OTP"
        });
      }
    } else {
      // Fallback: code-only lookup for backwards compatibility
      user = await User.findOne({
        verificationOTP: code,
        verificationOTPExpireAt: { $gt: Date.now() }
      }).select("+verificationOTP +verificationOTPExpireAt +verificationAttempts +isEmailVerified");
      if (!user) {
        return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
      }
    }

    user.isEmailVerified = true;
    user.verificationOTP = undefined;
    user.verificationOTPExpireAt = undefined;
    user.verificationAttempts = 0;
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    // Greeting email after successful verification (non-blocking)
    try {
      const template = emailTemplates.welcomeGreeting(user.name);
      await sendEmail({ to: user.email, ...template });
    } catch (e) {
      console.error("Greeting email failed:", e.message);
    }

    res.json({ success: true, message: "OTP verified successfully", user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: "Email verification failed", error: error.message });
  }
};

// ── Verify Email via legacy link (kept for old emails) ────────────────────────
// GET /api/users/verify-email/:token
const verifyEmailByLink = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ emailVerificationToken: token })
      .select("+emailVerificationToken");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification link" });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.verificationOTP = undefined;
    user.verificationOTPExpireAt = undefined;
    user.verificationAttempts = 0;
    await user.save({ validateBeforeSave: false });

    try {
      const template = emailTemplates.welcomeGreeting(user.name);
      await sendEmail({ to: user.email, ...template });
    } catch (e) {
      console.error("Greeting email failed:", e.message);
    }

    res.json({ success: true, message: "Email verified successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Email verification failed", error: error.message });
  }
};

// ── Resend Verification OTP (ported from Local/auth project) ──────────────────
// POST /api/users/resend-verification { email } — works with or without auth
const resendVerification = async (req, res) => {
  try {
    let user = null;
    const bodyEmail = req.body?.email;
    if (bodyEmail) {
      user = await User.findOne({ email: bodyEmail }).select("+isEmailVerified +verificationOTP +verificationOTPExpireAt +verificationAttempts +lastOTPSentAt");
    } else if (req.user?.id) {
      user = await User.findById(req.user.id).select("+isEmailVerified +verificationOTP +verificationOTPExpireAt +verificationAttempts +lastOTPSentAt");
    } else {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified" });
    }

    if (user.lastOTPSentAt && Date.now() - new Date(user.lastOTPSentAt).getTime() < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - new Date(user.lastOTPSentAt).getTime())) / 1000);
      return res.status(429).json({ success: false, message: `Please wait ${retryAfter}s before requesting a new code.`, retryAfter });
    }

    const otp = generateOTP();
    user.verificationOTP = otp;
    user.verificationOTPExpireAt = Date.now() + 5 * 60 * 1000;
    user.verificationAttempts = 0;
    user.lastOTPSentAt = Date.now();
    await user.save({ validateBeforeSave: false });

    try {
      await sendEmail({ to: user.email, ...emailTemplates.verificationOTP(otp) });
    } catch (emailError) {
      console.log("verification email failed:", emailError.message);
    }

    if (isProduction) {
      return res.status(200).json({ success: true, message: "Verification code resent successfully" });
    }

    res.status(200).json({ success: true, message: "Verification code resent successfully", otp });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send verification email", error: error.message });
  }
};

// ── Add to Wishlist ───────────────────────────────────────────────────────────
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { wishlist: productId } },
      { new: true }
    ).populate("wishlist");

    res.json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: "Failed to add to wishlist", error: error.message });
  }
};

// ── Remove from Wishlist ──────────────────────────────────────────────────────
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { wishlist: productId } },
      { new: true }
    ).populate("wishlist");

    res.json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove from wishlist", error: error.message });
  }
};

// ── Add Address ───────────────────────────────────────────────────────────────
const ADDRESS_FIELDS = ["name", "street", "city", "state", "country", "zipCode", "phone", "isDefault"];

const addAddress = async (req, res) => {
  try {
    // Only accept known address fields — never raw req.body
    const address = {};
    for (const key of ADDRESS_FIELDS) {
      if (req.body[key] !== undefined) address[key] = req.body[key];
    }

    if (!address.name || !address.street || !address.city) {
      return res.status(400).json({ message: "Name, street and city are required" });
    }

    // Enforce a single default address
    if (address.isDefault) {
      await User.updateOne(
        { _id: req.user.id, "addresses.isDefault": true },
        { $set: { "addresses.$.isDefault": false } }
      );
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { addresses: address } },
      { new: true }
    );

    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: "Failed to add address", error: error.message });
  }
};

// ── Get User Addresses ────────────────────────────────────────────────────────
const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.addresses);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch addresses", error: error.message });
  }
};

// ── Update Address ────────────────────────────────────────────────────────────
const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    // Whitelist fields instead of spreading raw body
    const updatedAddress = {};
    for (const key of ADDRESS_FIELDS) {
      if (req.body[key] !== undefined) updatedAddress[key] = req.body[key];
    }

    const user = await User.findById(req.user.id);
    const addressIndex = user.addresses.findIndex(
      (a) => a._id.toString() === addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({ message: "Address not found" });
    }

    user.addresses[addressIndex] = {
      ...user.addresses[addressIndex].toObject(),
      ...updatedAddress,
      _id: user.addresses[addressIndex]._id
    };
    await user.save();

    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: "Failed to update address", error: error.message });
  }
};

// ── Delete Address ────────────────────────────────────────────────────────────
const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    );

    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete address", error: error.message });
  }
};

// ── Set Default Address ───────────────────────────────────────────────────────
const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user.id);

    user.addresses = user.addresses.map((addr) => ({
      ...addr.toObject(),
      isDefault: addr._id.toString() === addressId
    }));

    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: "Failed to set default address", error: error.message });
  }
};

// ── User Dashboard Stats ──────────────────────────────────────────────────────
const getUserDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [user, orders, spentAgg] = await Promise.all([
      User.findById(userId).populate("wishlist", "name image price").lean(),
      Order.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Order.aggregate([
        { $match: { user: userObjectId, orderStatus: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
      ])
    ]);

    const orderStats = spentAgg[0] || { total: 0, count: 0 };

    res.json({
      wishlistCount: user?.wishlist?.length || 0,
      addressCount: user?.addresses?.length || 0,
      orderCount: orderStats.count,
      totalSpent: orderStats.total,
      recentOrders: orders,
      wishlistPreview: (user?.wishlist || []).slice(0, 4),
      memberSince: user?.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch dashboard stats", error: error.message });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  verifyEmailByLink,
  resendVerification,
  addToWishlist,
  removeFromWishlist,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getUserDashboardStats
};
