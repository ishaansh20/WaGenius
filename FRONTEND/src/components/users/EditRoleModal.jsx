import { useEffect, useState } from "react";
import { X } from "lucide-react";

const ROLES = [
  { value: "TEAM_LEAD", label: "Team Lead" },
  { value: "CAMPAIGN_MANAGER", label: "Campaign Manager" },
  { value: "SUPPORT_AGENT", label: "Support Agent" },
];

export default function EditRoleModal({ isOpen, onClose, user, onUpdate }) {
  const [role, setRole] = useState("");

  useEffect(() => {
    if (user) setRole(user.role);
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(user._id, role);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Change Role</h2>
            <p className="mt-0.5 text-[12px] text-slate-400">
              Update role for this user.
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
          {/* User (read-only) */}
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
              User
            </label>
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
                {(user.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-slate-800">
                  {user.name}
                </p>
                <p className="truncate text-[11px] text-slate-400">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Role select */}
          <div>
            <label htmlFor="edit-role" className="mb-1.5 block text-[12px] font-medium text-slate-700">
              New Role
            </label>
            <select
              id="edit-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13.5px] text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
            >
              {ROLES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

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
              className="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-emerald-700"
            >
              Update Role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
