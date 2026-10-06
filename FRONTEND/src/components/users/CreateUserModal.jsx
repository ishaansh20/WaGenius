import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createUser } from "../../services/userService";
import { Button, Input, Select } from "../ui";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/40 sm:items-center sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-title"
        className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-surface shadow-[var(--shadow-pop)] sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 id="create-user-title" className="text-[18px] font-semibold text-ink">Add team member</h2>
            <p className="mt-0.5 text-[14px] text-ink-muted">
              They can sign in with this email and password.
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
            <Input
              id="create-name"
              label="Full name"
              type="text"
              name="name"
              placeholder="Jane Smith"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <Input
              id="create-email"
              label="Email address"
              type="email"
              name="email"
              placeholder="jane@company.com"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <Input
              id="create-password"
              label="Password"
              help="At least 8 characters. Share it with them privately."
              type="password"
              name="password"
              placeholder="Min. 8 characters"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <Select
              id="create-role"
              label="Role"
              help="You can change this later."
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="TEAM_LEAD">Team lead</option>
              <option value="CAMPAIGN_MANAGER">Campaign manager</option>
              <option value="SUPPORT_AGENT">Support agent</option>
            </Select>

            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {loading ? "Adding…" : "Add team member"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
