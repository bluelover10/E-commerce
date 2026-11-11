const ContactMessage = require("../models/ContactMessage");
const { sendEmail, emailTemplates } = require("../config/email");

const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "Name, email, subject and message are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const doc = await ContactMessage.create({ name: name.trim(), email: email.toLowerCase().trim(), subject: subject.trim(), message: message.trim() });

    // Notify support + auto-reply (non-blocking, log-only if no SMTP)
    // CONTACT_NOTIFY_TO / ADMIN_EMAIL lets you direct inbox mail to a real
    // address (e.g. your Gmail) independent of FROM_EMAIL.
    const supportTo =
      process.env.CONTACT_NOTIFY_TO ||
      process.env.ADMIN_EMAIL ||
      process.env.SMTP_USER ||
      process.env.EMAIL_USER ||
      process.env.FROM_EMAIL;
    if (supportTo) {
      sendEmail({ to: supportTo, ...emailTemplates.contactNotifyAdmin({ name, email, subject, message }) }).catch((e) => console.error("Contact notify failed:", e.message));
    } else {
      console.log(`📩 Contact from ${name} <${email}>: ${subject}`);
    }
    sendEmail({ to: email, ...emailTemplates.contactAutoReply(name) }).catch((e) => console.error("Contact auto-reply failed:", e.message));

    res.status(201).json({ success: true, message: "Message sent! We'll reply within 24 hours.", id: doc._id });
  } catch (error) {
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};

const listContacts = async (req, res) => {
  try {
    const msgs = await ContactMessage.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, messages: msgs });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages", error: error.message });
  }
};

module.exports = { submitContact, listContacts };
