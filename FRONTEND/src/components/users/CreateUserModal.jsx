import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createUser } from "../../services/userService";

const FIELD_CLASS =
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100";

const LABEL_CLASS = "mb-1.5 block text-[12px] font-medium text-slate-700";

export default function CreateUserModal({ isOpen, onClose, onUserCreated }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "SUPPORT_AGENT",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setError("");
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      await createUser(formData);
      setFormData({ name: "", email: "", password: "", role: "SUPPORT_AGENT" });
      onUserCreated();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Create User</h2>
            <p className="mt-0.5 text-[12px] text-slate-400">
              Add a new member to your workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label htmlFor="create-name" className={LABEL_CLASS}>
              Full Name
            </label>
            <input
              id="create-name"
              type="text"
              name="name"
              placeholder="Jane Smith"
              value={formData.name}
              onChange={handleChange}
              required
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor="create-email" className={LABEL_CLASS}>
              Email Address
            </label>
            <input
              id="create-email"
              type="email"
              name="email"
              placeholder="jane@company.com"
              value={formData.email}
              onChange={handleChange}
              required
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor="create-password" className={LABEL_CLASS}>
              Password
            </label>
            <input
              id="create-password"
              type="password"
              name="password"
              placeholder="Min. 8 characters"
              value={formData.password}
              onChange={handleChange}
              required
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor="create-role" className={LABEL_CLASS}>
              Role
            </label>
            <select
              id="create-role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={FIELD_CLASS}
            >
              <option value="TEAM_LEAD">Team Lead</option>
              <option value="CAMPAIGN_MANAGER">Campaign Manager</option>
              <option value="SUPPORT_AGENT">Support Agent</option>
            </select>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-700">
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
