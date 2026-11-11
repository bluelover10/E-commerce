import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import PasswordInput from "../../components/ui/PasswordInput";
import api from "../../services/api";

export default function DashboardProfile() {
  const { user, updateProfile, changePassword } = useContext(AuthContext);
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || "", phone: user.phone || "" });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    const result = await updateProfile(formData);
    if (result.success) {
      showToast("Profile updated", "success");
      setEditing(false);
    } else {
      showToast(result.message || "Update failed", "error");
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      showToast("New passwords do not match", "error");
      return;
    }
    setPwLoading(true);
    const res = await changePassword(pwForm.currentPassword, pwForm.newPassword, pwForm.confirm);
    if (res.success) {
      showToast("Password changed successfully", "success");
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } else {
      showToast(res.message, "error");
    }
    setPwLoading(false);
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file", "error");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast("Image must be under 3MB", "error");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setAvatarLoading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await api.post("/images/upload/profile", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.imageUrl;
      if (!url) throw new Error("Upload failed");
      const result = await updateProfile({ profileImage: url });
      if (result.success) showToast("Profile picture updated", "success");
      else showToast(result.message || "Update failed", "error");
    } catch (err) {
      showToast(err.response?.data?.message || "Upload failed", "error");
    } finally {
      setAvatarLoading(false);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarLoading(true);
    try {
      const result = await updateProfile({ profileImage: "" });
      if (result.success) showToast("Profile picture removed", "success");
      else showToast(result.message || "Remove failed", "error");
    } catch {
      showToast("Remove failed", "error");
    } finally {
      setAvatarLoading(false);
    }
  };

  const avatarSrc = preview || user?.profileImage || null;

  return (
    <div className="atelier-card p-6 sm:p-8">
      <h2 className="mb-6 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        Profile settings
      </h2>

      <div className="mb-8 flex items-center gap-6">
        <div className="relative">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Profile"
              className="h-20 w-20 rounded-full object-cover"
              style={{ border: "2px solid var(--border)" }}
            />
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{ background: "var(--atelier-accent)" }}
            >
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          {avatarLoading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs font-semibold text-white">
              ...
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm" style={{ color: "var(--atelier-muted)" }}>
            {user?.email}
          </p>
          <span
            className="mt-2 inline-block rounded-full px-2 py-0.5 text-xs capitalize"
            style={{ background: "color-mix(in srgb, var(--atelier-accent) 15%, transparent)" }}
          >
            {user?.role}
          </span>
          <div className="mt-3 flex gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} aria-label="Upload profile picture" />
            <button onClick={() => fileRef.current?.click()} disabled={avatarLoading} className="btn-outline !px-3 !py-1.5 text-xs">
              {user?.profileImage ? "Change photo" : "Upload photo"}
            </button>
            {user?.profileImage && (
              <button onClick={handleAvatarRemove} disabled={avatarLoading} className="rounded-full px-3 py-1.5 text-xs text-red-600 hover:underline">
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {!editing ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--atelier-muted)" }}>
              Phone
            </p>
            <p>{user?.phone || "Not set"}</p>
          </div>
          <button onClick={() => setEditing(true)} className="btn-primary">
            Edit profile
          </button>
        </div>
      ) : (
        <div className="max-w-md space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input
              className="input-field"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={loading} className="btn-primary">
              {loading ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="btn-outline">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-10 border-t pt-8" style={{ borderColor: "color-mix(in srgb, var(--atelier-ink) 10%, transparent)" }}>
        <h3 className="mb-4 text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>Change password</h3>
        <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
          <PasswordInput label="Current password" name="currentPassword" id="profile-current" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required autoComplete="current-password" />
          <PasswordInput label="New password (min 8)" name="newPassword" id="profile-new" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={8} autoComplete="new-password" />
          <PasswordInput label="Confirm new password" name="confirm" id="profile-confirm" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required autoComplete="new-password" />
          <button type="submit" disabled={pwLoading} className="btn-outline">{pwLoading ? "Updating..." : "Update password"}</button>
        </form>
      </div>
    </div>
  );
}
