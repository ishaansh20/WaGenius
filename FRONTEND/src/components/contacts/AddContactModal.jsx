import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createContact } from "../../services/api";

const FIELD_CLASS =
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100";

const LABEL_CLASS = "mb-1.5 block text-[12px] font-medium text-slate-700";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Add Contact</h2>
            <p className="mt-0.5 text-[12px] text-slate-400">
              Add someone to your address book manually.
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

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
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
              Phone Number <span className="text-red-400">*</span>
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
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-700">
              {error}
            </p>
          )}

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
              {loading ? "Adding…" : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
