import { useEffect, useState } from "react";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function AdminMessages() {
  const { showToast } = useToast();
  const [tab, setTab] = useState("contact");
  const [contacts, setContacts] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [c, n] = await Promise.all([
          api.get("/contact/admin/all"),
          api.get("/newsletter/admin/all")
        ]);
        setContacts(c.data.messages || []);
        setSubs(n.data.subscribers || []);
      } catch (e) {
        showToast(e.response?.data?.message || "Failed to load messages", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="admin-skeleton h-10 w-48 opacity-60" />
        <div className="admin-panel p-6">
          <div className="admin-skeleton h-32 w-full opacity-60" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="admin-page-head">
        <h1>Messages</h1>
        <p>Contact inbox + newsletter subscribers</p>
      </div>
      <div className="flex gap-2" role="tablist" aria-label="Message type">
        {["contact", "newsletter"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-semibold capitalize transition-all ${
              tab === t
                ? "text-[var(--dash-on-accent)]"
                : "text-[var(--dash-muted)] hover:text-[var(--dash-text)]"
            }`}
            style={
              tab === t
                ? { background: "var(--dash-accent)" }
                : { background: "var(--dash-tile-bg)", boxShadow: "var(--dash-inset)", border: "1px solid var(--dash-border)" }
            }
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "contact" ? (
        <div className="admin-panel overflow-hidden">
          <div className="overflow-x-auto">
          <table className="admin-table min-w-[640px]">
            <thead><tr><th>Date</th><th>Name</th><th>Subject</th><th>Message</th></tr></thead>
            <tbody>
              {contacts.map((m) => (
                <tr key={m._id}>
                  <td className="text-xs whitespace-nowrap text-[var(--dash-muted)]">{new Date(m.createdAt).toLocaleString()}</td>
                  <td>{m.name}<br /><span className="text-xs text-[var(--dash-muted)] break-all">{m.email}</span></td>
                  <td className="break-words font-medium">{m.subject}</td>
                  <td className="max-w-md truncate text-[var(--dash-muted)]" title={m.message}>{m.message}</td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr><td colSpan={4}><div className="admin-empty"><span className="admin-empty-icon">📭</span>No messages yet</div></td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div className="admin-panel overflow-hidden">
          <div className="overflow-x-auto">
          <table className="admin-table min-w-[480px]">
            <thead><tr><th>Email</th><th>Date</th><th>Active</th></tr></thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s._id}>
                  <td className="break-all">{s.email}</td>
                  <td className="text-xs whitespace-nowrap text-[var(--dash-muted)]">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td><span className={`admin-chip ${s.isActive ? "success" : "muted"}`}>{s.isActive ? "Active" : "Inactive"}</span></td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr><td colSpan={3}><div className="admin-empty"><span className="admin-empty-icon">📨</span>No subscribers yet</div></td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
