const Vendor = require("../models/Vendor");

/**
 * requireApprovedVendor — ensures req.user has an approved, active vendor profile.
 * Attaches req.vendor for downstream controllers.
 */
const requireApprovedVendor = async (req, res, next) => {
  try {
    const VendorModel = Vendor;
    let vendor = null;
    if (req.user.vendorId) {
      vendor = await VendorModel.findById(req.user.vendorId);
    } else {
      const User = require("../models/User");
      const u = await User.findById(req.user.id).select("vendor");
      if (u?.vendor) vendor = await VendorModel.findById(u.vendor);
      if (!vendor) vendor = await VendorModel.findOne({ user: req.user.id });
    }
    if (!vendor) return res.status(403).json({ success: false, message: "No vendor profile. Please register as a seller." });
    if (vendor.status !== "approved" || !vendor.isActive) {
      return res.status(403).json({ success: false, message: `Vendor account is ${vendor.status}. Contact support.` });
    }
    req.vendor = vendor;
    next();
  } catch (e) {
    next(e);
  }
};

module.exports = requireApprovedVendor;
