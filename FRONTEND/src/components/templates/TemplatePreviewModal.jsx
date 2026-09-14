import { FileText, Image as ImageIcon, Video, X } from "lucide-react";
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
                <div className="max-w-[90%] overflow-hidden rounded-xl rounded-br-sm bg-[#d9fdd3] shadow-sm">
                  {/* Header: IMAGE */}
                  {template.headerType === "IMAGE" && (
                    (template.headerMediaUrl || template.mediaUrl) ? (
                      <div className="relative">
                        <img
                          src={resolveMediaUrl(template.headerMediaUrl || template.mediaUrl)}
                          alt=""
                          className="max-h-56 w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.classList.remove("hidden");
                            }
                          }}
                        />
                        <div className="hidden flex-col items-center justify-center bg-slate-200/80 py-8 text-center text-slate-500">
                          <ImageIcon className="mb-1 h-7 w-7 text-slate-400" />
                          <span className="text-[12px] font-medium">Image unavailable</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center border-b border-emerald-200/60 bg-emerald-100/50 py-7 text-center">
                        <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <p className="text-[12px] font-semibold text-emerald-900">Header Image</p>
                        <p className="text-[10.5px] text-emerald-700/80">Approved and hosted on Meta</p>
                      </div>
                    )
                  )}

                  {/* Header: VIDEO */}
                  {template.headerType === "VIDEO" && (
                    (template.headerMediaUrl || template.mediaUrl) ? (
                      <video
                        src={resolveMediaUrl(template.headerMediaUrl || template.mediaUrl)}
                        controls
                        className="max-h-56 w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center border-b border-emerald-200/60 bg-emerald-100/50 py-7 text-center">
                        <Video className="mb-1 h-6 w-6 text-emerald-600" />
                        <p className="text-[12px] font-semibold text-emerald-900">Header Video</p>
                      </div>
                    )
                  )}

                  {/* Header: DOCUMENT */}
                  {template.headerType === "DOCUMENT" && (
                    <div className="m-2.5 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="truncate text-[12.5px] font-medium text-slate-700">Document Attached</span>
                        <p className="text-[10.5px] text-slate-400">PDF document</p>
                      </div>
                    </div>
                  )}

                  {/* Header: TEXT */}
                  {template.headerType === "TEXT" && template.headerText && (
                    <div className="px-3 pt-2.5">
                      <p className="text-[13px] font-bold text-slate-900">
                        {template.headerText}
                      </p>
                    </div>
                  )}

                  {/* Legacy or fallback mediaUrl without explicit headerType */}
                  {(!template.headerType || template.headerType === "NONE") && template.mediaUrl && (
                    <img
                      src={resolveMediaUrl(template.mediaUrl)}
                      alt=""
                      className="max-h-56 w-full object-cover"
                    />
                  )}

                  {/* Body message */}
                  <div className="px-3 py-2.5">
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-800">
                      {template.description}
                    </p>
                    <p className="mt-0.5 text-right text-[10px] text-emerald-600">✓✓</p>
                  </div>

                  {/* Buttons */}
                  {template.buttons?.length > 0 && (
                    <div className="divide-y divide-slate-200/70 border-t border-slate-200/70">
                      {template.buttons.map((btn, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 text-center text-[12.5px] font-medium text-sky-700"
                        >
                          {btn.text || "Button"}
                        </div>
                      ))}
                    </div>
                  )}
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
