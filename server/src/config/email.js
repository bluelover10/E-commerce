const nodemailer = require("nodemailer");

// ── Nodemailer Transporter ────────────────────────────────────────────────────
// Priority:
// 1. EMAIL_USER + EMAIL_PASS (Gmail App Password)
// 2. SMTP_HOST/PORT/USER/PASS (generic SMTP)
// 3. Dev fallback: log-only (no network) so contact/newsletter/order emails
//    never hang the request when credentials are missing (old code tried
//    Ethereal createTestAccount which needs internet and made emails "not work").
let transporter;
let transporterMode = null;

const createTransporter = async () => {
  if (transporter) return { transporter, mode: transporterMode };

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password (not your account password)
      },
    });
    transporterMode = "gmail";
  } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: (process.env.SMTP_PORT || "587") === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    transporterMode = "smtp";
  } else {
    transporterMode = "log";
    console.log("📧 Email: no SMTP credentials — running in LOG-ONLY mode. Set EMAIL_USER/EMAIL_PASS in server/.env to send real emails.");
  }
  return { transporter, mode: transporterMode };
};

// ── Send Email Helper (never throws for missing config) ───────────────────────
const sendEmail = async ({ to, subject, html }) => {
  const { transporter: tp, mode } = await createTransporter();

  if (mode === "log" || !tp) {
    console.log("--------------------------------------------------");
    console.log(`📧 [LOG-ONLY EMAIL] To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Preview: ${(html || "").replace(/<[^>]+>/g, " ").slice(0, 300)}...`);
    console.log("--------------------------------------------------");
    return { success: true, logged: true };
  }

  const mailOptions = {
    from: `"${process.env.STORE_NAME || process.env.FROM_NAME || "ShopAtelier"}" <${
      process.env.EMAIL_USER || process.env.SMTP_USER || process.env.FROM_EMAIL || "noreply@shopatelier.com"
    }>`,
    to,
    subject,
    html,
  };

  const info = await tp.sendMail(mailOptions);

  if (mode !== "gmail" && mode !== "smtp") {
    console.log("📧 Email preview URL:", nodemailer.getTestMessageUrl(info));
  }

  return info;
};

// ── Email Templates ───────────────────────────────────────────────────────────
// Includes Local/auth OTP template (6-digit, 5-min) + legacy link template.
const emailTemplates = {
  // OTP verification — ported from Local/server/email/emailTemplates.js
  verificationOTP: (otp) => ({
    subject: "Verify your email",
    html: `
<!DOCTYPE html>
<html lang="en">
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Verify Your Email</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px;">
    <p>Hello,</p>
    <p>Thank you for signing up! Your verification code is:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50;">${otp}</span>
    </div>
    <p>Enter this code on the verification page to complete your registration.</p>
    <p>This code will expire in 5 minutes for security reasons.</p>
    <p>If you didn't create an account with us, please ignore this email.</p>
  </div>
</body>
</html>`,
  }),
  forgotPassword: (name, resetUrl) => ({
    subject: "Reset Your Password",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
        <h2 style="margin-bottom: 8px;">Hi, ${name} 👋</h2>
        <p>You requested to reset your password. Click the button below to proceed.</p>
        <p style="color: #666; font-size: 14px;">This link expires in <strong>1 hour</strong>. If you did not request this, please ignore this email.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="background: #1a1a1a; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #999; font-size: 12px;">Or paste this link in your browser:<br/><a href="${resetUrl}" style="color: #1a1a1a;">${resetUrl}</a></p>
      </div>
    `,
  }),

  emailVerification: (name, verifyUrl) => ({
    subject: "Verify Your Email — Welcome!",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
        <h2 style="margin-bottom: 8px;">Welcome, ${name}! 🎉</h2>
        <p>Thank you for creating an account at <strong>${process.env.STORE_NAME || "ShopAtelier"}</strong>. Please verify your email address to get started.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}"
             style="background: #1a1a1a; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p style="color: #999; font-size: 12px;">Or paste this link in your browser:<br/><a href="${verifyUrl}" style="color: #1a1a1a;">${verifyUrl}</a></p>
      </div>
    `,
  }),

  welcomeGreeting: (name) => ({
    subject: `Welcome to ${process.env.STORE_NAME || "ShopAtelier"} 🎉`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
        <h2>Hi ${name}! 👋</h2>
        <p>Your email is verified — welcome to the <strong>${process.env.STORE_NAME || "ShopAtelier"}</strong> family.</p>
        <p>Browse new drops, track orders, and enjoy free shipping over ₹500.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/products"
             style="background: #1a1a1a; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Start Shopping
          </a>
        </div>
      </div>
    `,
  }),

  passwordChanged: (name) => ({
    subject: "Password Changed Successfully",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
        <h2>Hi, ${name} 👋</h2>
        <p>Your password was changed successfully.</p>
        <p>If you did not make this change, please contact our support team immediately.</p>
      </div>
    `,
  }),

  orderPlaced: (name, order) => ({
    subject: `Order Placed — #${String(order._id).slice(-8).toUpperCase()} 🎉`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
        <h2>Thank you, ${name}! 🙏</h2>
        <p>Your order <strong>#${String(order._id).slice(-8).toUpperCase()}</strong> has been placed successfully.</p>
        <p>Items: ${order.items.length} | Total: <strong>₹${order.totalAmount}</strong> | Payment: ${order.paymentMethod} (${order.paymentStatus})</p>
        <p>We will email you again when your order ships. Track it here:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/order/${order._id}"
             style="background: #1a1a1a; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Track Order
          </a>
        </div>
      </div>
    `,
  }),

  orderStatusUpdated: (name, order) => ({
    subject: `Order Update — #${String(order._id).slice(-8).toUpperCase()} is ${order.orderStatus}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
        <h2>Hi ${name} 📦</h2>
        <p>Your order <strong>#${String(order._id).slice(-8).toUpperCase()}</strong> status is now: <strong style="text-transform: capitalize;">${order.orderStatus.replace(/_/g, " ")}</strong></p>
        ${order.trackingId ? `<p>Tracking ID: <strong>${order.trackingId}</strong></p>` : ""}
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/order/${order._id}"
             style="background: #1a1a1a; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            View Order
          </a>
        </div>
      </div>
    `,
  }),

  contactNotifyAdmin: ({ name, email, subject, message }) => ({
    subject: `New Contact: ${subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <h3>New contact message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p style="background:#f5f5f5;padding:12px;border-radius:8px;">${message}</p>
      </div>
    `,
  }),

  contactAutoReply: (name) => ({
    subject: "We received your message ✅",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
        <h2>Thanks, ${name}! 🙏</h2>
        <p>We received your message and will reply within 24 hours.</p>
        <p>— ${process.env.STORE_NAME || "ShopAtelier"} team</p>
      </div>
    `,
  }),

  newsletterWelcome: (email) => ({
    subject: "Welcome to the circle 🎉",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
        <h2>Welcome! 🎉</h2>
        <p><strong>${email}</strong> is now subscribed. Early access to drops & exclusive offers coming your way.</p>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
