import { useEffect, useState } from "react";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function AdminUsers() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null); // user about to be deleted

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/users?search=${encodeURIComponent(search)}`);
      setUsers(res.data.users || []);
    } catch (e) {
      showToast(e.response?.data?.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const deleteUser = async () => {
    const userId = pendingDelete?._id;
    setPendingDelete(null);
    if (!userId) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      showToast("User deleted", "success");
      fetchUsers();
    } catch (e) {
      showToast(e.response?.data?.message || "Failed to delete user", "error");
    }
  };

  const toggleRole = async (userId, currentRole) => {
    const role = currentRole === "admin" ? "user" : "admin";
    try {
      await api.put(`/admin/users/${userId}/role`, { role });
      showToast(`User is now ${role}`, "success");
      fetchUsers();
    } catch (e) {
      showToast(e.response?.data?.message || "Failed to update role", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="admin-page-head">
        <h1>Customers</h1>
        <p>Manage accounts and roles</p>
      </div>

      <input
        type="search"
        placeholder="Search by name or email…"
        aria-label="Search users"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="admin-input max-w-md"
      />

      {loading ? (
        <div className="admin-panel p-6">
          <div className="admin-skeleton h-4 w-48 opacity-60" />
          <div className="admin-skeleton mt-4 h-24 w-full opacity-60" />
        </div>
      ) : (
        <div className="admin-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="admin-empty">
                        <span className="admin-empty-icon">👥</span>
                        No users match your search
                      </div>
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="font-medium">{u.name}</td>
                    <td className="text-[var(--dash-muted)]">{u.email}</td>
                    <td>
                      <span className={`admin-chip ${u.role === "admin" ? "info" : "muted"}`}>{u.role}</span>
                    </td>
                    <td className="text-xs text-[var(--dash-muted)]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => toggleRole(u._id, u.role)} className="admin-btn-ghost !px-3 !py-1.5 !text-xs">
                          {u.role === "admin" ? "Revoke admin" : "Make admin"}
                        </button>
                        <button onClick={() => setPendingDelete(u)} className="admin-btn-danger !px-3 !py-1.5 !text-xs">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete ${pendingDelete?.name}?`}
        message="This permanently removes the account and its data. It cannot be undone."
        confirmLabel="Delete user"
        cancelLabel="Keep user"
        variant="danger"
        onConfirm={deleteUser}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
