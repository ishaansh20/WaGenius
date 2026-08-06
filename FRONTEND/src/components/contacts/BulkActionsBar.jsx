import { useState } from "react";
import { Tag, Trash2, Download, Send, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { bulkDeleteContacts, bulkUpdateContactTags } from "../../services/api";

export default function BulkActionsBar({ selectedContacts, onClearSelection, onChanged, onBroadcast }) {
  const [tagInput, setTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(null); // "add" | "remove" | null
  const [busy, setBusy] = useState(false);

  if (selectedContacts.length === 0) return null;

  const ids = selectedContacts.map((c) => c._id);

  async function handleTagAction(action) {
    const tags = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (tags.length === 0) return;

    try {
      setBusy(true);
      await bulkUpdateContactTags({ ids, tags, action });
      toast.success(action === "add" ? "Tags added" : "Tags removed");
      setTagInput("");
      setShowTagInput(null);
      onChanged();
    } catch {
      toast.error("Failed to update tags");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${ids.length} contact(s)? This can't be undone.`)) return;

    try {
      setBusy(true);
      const res = await bulkDeleteContacts(ids);
      if (res.skipped?.length > 0) {
        toast.error(`${res.skipped.length} contact(s) have message history and weren't deleted`);
      }
      if (res.deletedCount > 0) {
        toast.success(`${res.deletedCount} contact(s) deleted`);
      }
      onChanged();
    } catch {
      toast.error("Failed to delete contacts");
    } finally {
      setBusy(false);
    }
  }

  function handleExport() {
    const header = "name,phone,tags";
    const rows = selectedContacts.map(
      (c) => `${c.name || ""},${c.phone},"${(c.tags || []).join(",")}"`,
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
      <span className="text-[13px] font-medium text-emerald-800">
        {selectedContacts.length} selected
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {showTagInput ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleTagAction(showTagInput); }}
              placeholder="tag1, tag2"
              className="h-8 w-40 rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] outline-none focus:border-emerald-300"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => handleTagAction(showTagInput)}
              className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-700"
            >
              {showTagInput === "add" ? "Add" : "Remove"}
            </button>
            <button
              type="button"
              onClick={() => { setShowTagInput(null); setTagInput(""); }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowTagInput("add")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Tag className="h-3.5 w-3.5" /> Add Tag
            </button>
            <button
              type="button"
              onClick={() => setShowTagInput("remove")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Tag className="h-3.5 w-3.5" /> Remove Tag
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button
              type="button"
              onClick={() => onBroadcast(selectedContacts)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12.5px] font-medium text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Send className="h-3.5 w-3.5" /> Broadcast
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-medium text-red-600 shadow-sm transition hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-700 hover:bg-white"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
