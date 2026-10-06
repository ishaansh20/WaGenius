import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button, Select } from "../ui";

const ROLES = [
  { value: "TEAM_LEAD", label: "Team lead" },
  { value: "CAMPAIGN_MANAGER", label: "Campaign manager" },
  { value: "SUPPORT_AGENT", label: "Support agent" },
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/40 sm:items-center sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-role-title"
        className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-surface shadow-[var(--shadow-pop)] sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 id="edit-role-title" className="text-[18px] font-semibold text-ink">Change role</h2>
            <p className="mt-0.5 text-[14px] text-ink-muted">
              Choose what this team member can do.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {/* User (read-only) */}
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-ink">Team member</p>
              <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas px-3.5 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[13px] font-semibold text-brand-800">
                  {(user.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">
                    {user.name}
                  </p>
                  <p className="truncate text-[13px] text-ink-muted">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Role select */}
            <Select
              id="edit-role"
              label="New role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save role
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
