import { FileText, X } from "lucide-react";
import { resolveMediaUrl } from "../../utils/media";

// Shared WhatsApp-style preview modal. Callers pass whichever badges make
// sense for their context (local category/status on the Templates page,
// Meta category/status on the Approved Templates pages) so this component
// stays agnostic of which template "track" it's previewing.
export default function TemplatePreviewModal({ template, badges = [], onClose, onEdit }) {
  if (!template) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">{template.name}</h2>
            {badges.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {badges.map((badge) => (
                  <span
                    key={badge.label}
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="min-h-[100px] rounded-xl border border-slate-200 bg-[#ece5dc] p-3">
            <div className="flex justify-end">
              {template.description ? (
                <div className="max-w-[90%] rounded-xl rounded-br-sm bg-[#d9fdd3] px-3 py-2.5 shadow-sm">
                  {template.headerType === "IMAGE" && template.headerMediaUrl && (
                    <img
                      src={resolveMediaUrl(template.headerMediaUrl)}
                      alt=""
                      className="mb-2 max-h-48 w-full rounded-lg object-cover"
                    />
                  )}
                  {template.headerType === "VIDEO" && template.headerMediaUrl && (
                    <video
                      src={resolveMediaUrl(template.headerMediaUrl)}
                      controls
                      className="mb-2 max-h-48 w-full rounded-lg object-cover"
                    />
                  )}
                  {template.headerType === "DOCUMENT" && template.headerMediaUrl && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate text-[12px] text-slate-600">Document attached</span>
                    </div>
                  )}
                  {template.headerType === "TEXT" && template.headerText && (
                    <p className="mb-1.5 text-[13px] font-semibold text-slate-800">
                      {template.headerText}
                    </p>
                  )}
                  {(!template.headerType || template.headerType === "NONE") && template.mediaUrl && (
                    <img
                      src={resolveMediaUrl(template.mediaUrl)}
                      alt=""
                      className="mb-2 max-h-48 w-full rounded-lg object-cover"
                    />
                  )}
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-800">
                    {template.description}
                  </p>
                  <p className="mt-0.5 text-right text-[10px] text-emerald-500">✓✓</p>
                </div>
              ) : (
                <div className="rounded-xl rounded-br-sm bg-slate-100 px-3 py-2">
                  <p className="text-[13px] italic text-slate-400">No message content</p>
                </div>
              )}
            </div>
          </div>
          {template.subject && (
            <p className="mt-3 text-[12px] text-slate-400">
              <span className="font-medium text-slate-600">Subject:</span> {template.subject}
            </p>
          )}
          {template.rejectionReason && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
              Rejected by Meta: {template.rejectionReason}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
