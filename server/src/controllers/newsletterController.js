const Newsletter = require("../models/Newsletter");
const { sendEmail, emailTemplates } = require("../config/email");

const subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }
    const normalized = email.toLowerCase().trim();
    let doc = await Newsletter.findOne({ email: normalized });
    if (!doc) {
      doc = await Newsletter.create({ email: normalized });
      sendEmail({ to: normalized, ...emailTemplates.newsletterWelcome(normalized) }).catch((e) => console.error("Newsletter welcome failed:", e.message));
    } else if (!doc.isActive) {
      doc.isActive = true;
      await doc.save();
    }
    res.json({ success: true, message: "Welcome to the circle! Check your email. 🎉" });
  } catch (error) {
    if (error.code === 11000) return res.json({ success: true, message: "Already subscribed ✅" });
    res.status(500).json({ message: "Subscribe failed", error: error.message });
  }
};

const listSubscribers = async (req, res) => {
  try {
    const subs = await Newsletter.find().sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, subscribers: subs, total: subs.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch subscribers", error: error.message });
  }
};

module.exports = { subscribe, listSubscribers };
