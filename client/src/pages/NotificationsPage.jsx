import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchNotifications, markAllReadLocal, markReadLocal, removeLocal } from "../store/slices/notificationsSlice";
import * as notificationService from "../services/notificationService";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../context/ToastContext";

const TYPE_ICON = {
  order: "📦",
  payment: "💳",
  system: "🔔",
  offer: "🎁",
};

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const { items, unread } = useSelector((s) => s.notifications);
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchNotifications())
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dispatch]);

  const markRead = async (id) => {
    setBusyId(id);
    try {
      await notificationService.markRead(id);
      dispatch(markReadLocal(id)); // Navbar badge updates instantly
    } catch {
      showToast("Could not mark notification read", "error");
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async () => {
    try {
      await notificationService.markAllRead();
      dispatch(markAllReadLocal());
      showToast("All caught up!", "success");
    } catch {
      showToast("Could not mark all as read", "error");
    }
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await notificationService.remove(id);
      dispatch(removeLocal(id));
    } catch {
      showToast("Could not delete notification", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="gradient-mesh min-h-screen py-10 sm:py-14">
      <div className="container-narrow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="section-title flex items-center gap-3">
              Notifications
              {unread > 0 && <span className="badge">{unread} new</span>}
            </h1>
            <p className="text-muted mt-1 text-sm">Order updates, vendor decisions and offers land here.</p>
          </div>
          {items.length > 0 && (
            <button onClick={markAll} className="btn-outline btn-sm" disabled={unread === 0}>
              Mark all read
            </button>
          )}
        </div>

        <div className="mt-8 space-y-3">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-24 rounded-2xl" />
              ))}
            </>
          ) : (
            <>
              {!items.length && (
                <EmptyState
                  icon="🔔"
                  title="No notifications"
                  message="You're all caught up — order updates and offers will appear here as they happen."
                />
              )}
              {items.map((n) => (
                <div
                  key={n._id}
                  className="hover-lift card-surface flex items-start justify-between gap-4 p-5"
                  style={{
                    borderLeft: n.isRead
                      ? "1px solid var(--border)"
                      : "3px solid var(--accent)",
                  }}
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                      style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
                      aria-hidden="true"
                    >
                      {TYPE_ICON[n.type] || "🔔"}
                    </span>
                    <div className="min-w-0">
                      <p className={`truncate font-semibold ${n.isRead ? "opacity-60" : ""}`}>{n.title}</p>
                      <p className="text-muted mt-0.5 text-sm leading-relaxed">{n.message}</p>
                      <p className="text-muted mt-1 text-xs opacity-70">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                      {n.link && (
                        <Link
                          to={n.link}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-80"
                          style={{ color: "var(--accent-hover)" }}
                        >
                          View
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12h14m-6-6 6 6-6 6" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {!n.isRead && (
                      <button
                        onClick={() => markRead(n._id)}
                        disabled={busyId === n._id}
                        className="btn-outline btn-sm !px-3 !py-1 text-xs"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => remove(n._id)}
                      disabled={busyId === n._id}
                      className="text-xs transition-opacity hover:opacity-70"
                      style={{ color: "var(--danger)" }}
                      aria-label={`Delete notification: ${n.title}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
