import { useState } from "react";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

// Existing store contact details — kept verbatim from the original page
// (do not invent new ones).
const CONTACT_INFO = [
  {
    label: "Email us",
    value: "hello@ghostpanda.shop",
    href: "mailto:hello@ghostpanda.shop",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    ),
  },
  {
    label: "Call us",
    value: "+91 1800-5748-01",
    href: "tel:+911800574801",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.3-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.4A2 2 0 0 1 4.5 2.3h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.6 10a16 16 0 0 0 6 6l1-1.1a2 2 0 0 1 2.1-.5c1 .3 2 .6 2.9.7a2 2 0 0 1 1.7 2Z" />
      </svg>
    ),
  },
  {
    label: "Support hours",
    value: "Mon–Sun, 10am–10pm IST",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
];

function Contact() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/contact", formData);
      showToast(res.data?.message || "Message sent! We'll reply within 24 hours.", "success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gradient-mesh min-h-screen py-14 sm:py-20">
      <div className="container-narrow">
        {/* Hero */}
        <div className="animate-fade-up mx-auto mb-14 max-w-2xl text-center">
          <span className="badge mb-4 inline-flex">We'd love to hear from you</span>
          <h1 className="section-title mb-4 text-4xl sm:text-5xl">Get in touch</h1>
          <p className="text-muted text-base leading-relaxed sm:text-lg">
            Questions, feedback, or partnership inquiries — our team is here and
            replies within 24 hours.
          </p>
        </div>

        {/* Contact info cards */}
        <div className="animate-fade-up mb-12 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {CONTACT_INFO.map((item) => {
            const Tag = item.href ? "a" : "div";
            return (
              <Tag
                key={item.label}
                {...(item.href ? { href: item.href } : {})}
                className="card-surface hover-lift group flex items-center gap-4 p-6"
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                    color: "var(--accent-hover)",
                  }}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="text-muted block text-xs font-semibold uppercase tracking-wider">
                    {item.label}
                  </span>
                  <span className="mt-1 block truncate text-sm font-semibold sm:text-base">
                    {item.value}
                  </span>
                </span>
              </Tag>
            );
          })}
        </div>

        {/* Form */}
        <div className="animate-fade-up mx-auto max-w-3xl">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl p-6 sm:p-10"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
            }}
            noValidate={false}
          >
            <h2
              className="mb-1.5 text-xl font-bold sm:text-2xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Send us a message
            </h2>
            <p className="text-muted mb-8 text-sm">
              Fill in the form below and we'll get back to you by email.
            </p>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium">
                  Your name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium">
                  Email address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  placeholder="jane@example.com"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-medium">
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                name="subject"
                placeholder="How can we help?"
                value={formData.subject}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            <div className="mt-5">
              <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                placeholder="Tell us what's on your mind…"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                className="input-field resize-none"
              />
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-muted order-2 text-center text-xs sm:order-1 sm:text-left">
                By sending, you agree to be contacted about your inquiry.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary order-1 w-full sm:order-2 sm:w-auto sm:min-w-[200px] disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send message"}
                {!loading && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Contact;
