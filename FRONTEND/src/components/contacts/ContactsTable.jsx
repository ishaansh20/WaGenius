import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, MessageSquareText, Pencil, X } from "lucide-react";

const SOURCE_CONFIG = {
  whatsapp: { label: "WhatsApp", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  manual: { label: "Manual", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  imported: { label: "Imported", className: "bg-violet-50 text-violet-700 border border-violet-200" },
  campaign: { label: "Campaign", className: "bg-amber-50 text-amber-700 border border-amber-200" },
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
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
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          className="h-7 w-36 rounded-md border border-emerald-300 bg-white px-2 text-[13px] outline-none focus:ring-1 focus:ring-emerald-200"
        />
        <button
          type="button"
          disabled={saving}
          onClick={commit}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={cancel}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 text-left"
      title="Click to edit name"
    >
      <p className="truncate text-[13.5px] font-medium text-slate-900">{contact.name || "Unknown"}</p>
      <Pencil className="h-3 w-3 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}

export default function ContactsTable({ contacts, selectedIds, onToggleSelect, onToggleSelectAll, onUpdateName }) {
  const navigate = useNavigate();
  const allSelected = contacts.length > 0 && contacts.every((c) => selectedIds.has(c._id));

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300"
                />
              </th>
              {["Name", "Phone", "Tags", "Source", "Consent", "Added", ""].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <p className="text-sm font-medium text-slate-800">No contacts found</p>
                  <p className="mt-1 text-[13px] text-slate-400">
                    Try adjusting your search or filters, or add/import contacts.
                  </p>
                </td>
              </tr>
            ) : (
              contacts.map((contact) => {
                const source = SOURCE_CONFIG[contact.source] || SOURCE_CONFIG.whatsapp;

                return (
                  <tr key={contact._id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contact._id)}
                        onChange={() => onToggleSelect(contact._id)}
                        className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300"
                      />
                    </td>

                    <td className="px-4 py-3.5">
                      <EditableName contact={contact} onSave={onUpdateName} />
                    </td>

                    <td className="px-4 py-3.5 text-[13px] tabular-nums text-slate-600">
                      {contact.phone}
                    </td>

                    <td className="px-4 py-3.5">
                      {contact.tags?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[12px] text-slate-300">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${source.className}`}
                      >
                        {source.label}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          contact.optedOut
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${contact.optedOut ? "bg-rose-500" : "bg-emerald-500"}`} />
                        {contact.optedOut ? "Opted out" : "Opted in"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-[13px] text-slate-500">
                      {formatDate(contact.createdAt)}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => navigate("/inbox", { state: { targetPhone: contact.phone } })}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 transition hover:text-emerald-700"
                        title="View in Inbox"
                      >
                        <MessageSquareText className="h-3.5 w-3.5" />
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
