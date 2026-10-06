import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createContact } from "../../services/api";
import { Button } from "../ui";

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-subtle hover:border-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12";

const LABEL_CLASS = "mb-1.5 block text-[13px] font-medium text-ink";

export default function AddContactModal({ isOpen, onClose, onContactCreated }) {
  const [formData, setFormData] = useState({ name: "", phone: "", tags: "" });
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

    if (!formData.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    try {
      setLoading(true);
      const tags = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await createContact({ name: formData.name, phone: formData.phone, tags });
      setFormData({ name: "", phone: "", tags: "" });
      onContactCreated();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create contact.");
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
        aria-labelledby="add-contact-title"
        className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-surface shadow-[var(--shadow-pop)] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 id="add-contact-title" className="text-[18px] font-semibold text-ink">Add contact</h2>
            <p className="mt-0.5 text-[14px] text-ink-muted">
              Add someone to your address book manually.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label htmlFor="contact-name" className={LABEL_CLASS}>Name</label>
              <input
                id="contact-name"
                type="text"
                name="name"
                placeholder="Jane Smith"
                value={formData.name}
                onChange={handleChange}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label htmlFor="contact-phone" className={LABEL_CLASS}>
                Phone number <span className="text-danger">*</span>
              </label>
              <input
                id="contact-phone"
                type="text"
                name="phone"
                placeholder="e.g. 919876543210"
                value={formData.phone}
                onChange={handleChange}
                required
                className={FIELD_CLASS}
              />
              <p className="mt-1.5 text-[13px] text-ink-muted">Include the country code, e.g. 91 for India.</p>
            </div>

            <div>
              <label htmlFor="contact-tags" className={LABEL_CLASS}>Tags</label>
              <input
                id="contact-tags"
                type="text"
                name="tags"
                placeholder="e.g. hot, vip (comma separated)"
                value={formData.tags}
                onChange={handleChange}
                className={FIELD_CLASS}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="disabled:cursor-not-allowed">
              {loading ? "Adding…" : "Add contact"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
