import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, MessageSquareText, Pencil, Users, X } from "lucide-react";
import { Badge } from "../ui";

const SOURCE_CONFIG = {
  whatsapp: { label: "WhatsApp", tone: "brand" },
  manual: { label: "Manual", tone: "neutral" },
  imported: { label: "Imported", tone: "neutral" },
  campaign: { label: "Campaign", tone: "neutral" },
};

const COLUMNS = ["Name", "Phone", "Tags", "Source", "Consent", "Added", ""];

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function initialFor(contact) {
  const source = (contact.name || "").trim() || String(contact.phone || "").trim();
  return source ? source.charAt(0).toUpperCase() : "?";
}

// A contact's name otherwise only ever comes from WhatsApp's own profile
// name (or a CSV import) — this lets a human correct it in place. Once
// saved, the backend's existing name-merge rule (findOrCreateContact) never
// overwrites it again with a later WhatsApp profile update, since it only
// touches `name` when the stored value is still the phone placeholder.
function EditableName({ contact, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(contact.name || "");
  const [saving, setSaving] = useState(false);

  async function commit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === contact.name) {
      setValue(contact.name || "");
      setEditing(false);
      return;
    }
    try {
      setSaving(true);
      await onSave(contact._id, trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setValue(contact.name || "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type="text"
          value={value}
          aria-label="Contact name"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          className="h-9 w-44 rounded-lg border border-brand-600 bg-surface px-2.5 text-[14px] text-ink outline-none focus:ring-4 focus:ring-brand-600/12"
        />
        <button
          type="button"
          disabled={saving}
          onClick={commit}
          aria-label="Save name"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 transition hover:bg-brand-50 disabled:opacity-55"
        >
          <Check size={16} />
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel editing"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex min-w-0 items-center gap-1.5 text-left"
      title="Click to edit name"
    >
      <span className="truncate text-[14px] font-medium text-ink">{contact.name || "Unknown"}</span>
      <Pencil size={13} className="shrink-0 text-ink-muted opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}

export default function ContactsTable({ contacts, selectedIds, onToggleSelect, onToggleSelectAll, onUpdateName }) {
  const navigate = useNavigate();
  const allSelected = contacts.length > 0 && contacts.every((c) => selectedIds.has(c._id));

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-[#f6f7f6]">
              <th scope="col" className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Select all contacts on this page"
                  className="h-4 w-4 cursor-pointer rounded border-line-strong accent-brand-700"
                />
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col || "actions"}
                  scope="col"
                  className="px-4 py-3 text-[13px] font-medium text-ink-muted"
                >
                  {col || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-5 sm:p-6">
                  <div className="flex flex-col items-center justify-center rounded-xl bg-canvas px-6 py-12 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-muted shadow-[var(--shadow-card)]">
                      <Users size={20} />
                    </span>
                    <p className="mt-4 text-[15px] font-semibold text-ink">No contacts found</p>
                    <p className="mt-1 max-w-sm text-[14px] text-ink-muted">
                      Try adjusting your search or filters, or add or import contacts using the buttons above.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              contacts.map((contact) => {
                const source = SOURCE_CONFIG[contact.source] || SOURCE_CONFIG.whatsapp;
                const selected = selectedIds.has(contact._id);

                return (
                  <tr
                    key={contact._id}
                    className={`transition-colors hover:bg-canvas ${selected ? "bg-brand-50/60" : ""}`}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleSelect(contact._id)}
                        aria-label={`Select ${contact.name || contact.phone}`}
                        className="h-4 w-4 cursor-pointer rounded border-line-strong accent-brand-700"
                      />
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[14px] font-semibold text-brand-800"
                        >
                          {initialFor(contact)}
                        </span>
                        <EditableName contact={contact} onSave={onUpdateName} />
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-[14px] tabular-nums text-ink">
                      {contact.phone}
                    </td>

                    <td className="px-4 py-3.5">
                      {contact.tags?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {contact.tags.map((tag) => (
                            <Badge key={tag} tone="neutral">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[14px] text-ink-subtle">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge tone={source.tone}>{source.label}</Badge>
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge tone={contact.optedOut ? "danger" : "success"} dot>
                        {contact.optedOut ? "Opted out" : "Opted in"}
                      </Badge>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-[14px] text-ink-muted">
                      {formatDate(contact.createdAt)}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => navigate("/inbox", { state: { targetPhone: contact.phone } })}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-muted transition hover:bg-brand-50 hover:text-brand-800"
                        title="View in Inbox"
                      >
                        <MessageSquareText size={15} />
                        <span className="hidden xl:inline">Chat</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
