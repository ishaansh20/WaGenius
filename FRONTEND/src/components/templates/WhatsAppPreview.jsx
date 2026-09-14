import { FileText, Image as ImageIcon, Video } from "lucide-react";
import { resolveMediaUrl } from "../../utils/media";

const HEADER_MEDIA_ICON = {
  IMAGE: ImageIcon,
  VIDEO: Video,
  DOCUMENT: FileText,
};

// Shared WhatsApp-style preview bubble — extracted from the exact markup
// already used in CreateTemplatePage.jsx (WA-green chat background, outgoing
// bubble color) so both the classic template form and the new wizard render
// an identical, familiar preview. Deliberately shows the raw {{token}} text
// rather than substituting it — this previews the template's literal shape,
// not a specific contact's resolved message.
export default function WhatsAppPreview({
  name,
  headerType = "NONE",
  headerText = "",
  headerMediaFile = null,
  headerMediaUrl = "",
  body = "",
  buttons = [],
  size = "default", // "default" | "large" — large is used on the wizard's Review step
}) {
  const isMediaHeader = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType);
  const MediaIcon = HEADER_MEDIA_ICON[headerType];

  const mediaPreviewUrl = (() => {
    if (!isMediaHeader || headerType !== "IMAGE") return null;
    if (headerMediaFile instanceof File || headerMediaFile instanceof Blob) {
      return URL.createObjectURL(headerMediaFile);
    }
    if (typeof headerMediaFile === "string" && headerMediaFile) {
      return resolveMediaUrl(headerMediaFile);
    }
    if (headerMediaUrl) {
      return resolveMediaUrl(headerMediaUrl);
    }
    return null;
  })();

  const bubbleTextSize = size === "large" ? "text-[13.5px]" : "text-[12.5px]";
  const containerMinHeight = size === "large" ? "min-h-[220px]" : "min-h-[120px]";

  return (
    <div className={`rounded-lg border border-slate-200 bg-[#ece5dc] p-3 ${containerMinHeight}`}>
      <div className="mb-2.5 flex items-center gap-2 border-b border-slate-200/60 pb-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
          WA
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-slate-800">
            {name || "Template Preview"}
          </p>
          <p className="text-[10px] text-emerald-600">template</p>
        </div>
      </div>

      <div className="flex justify-end">
        {body.trim() || headerType !== "NONE" ? (
          <div className="max-w-[90%] overflow-hidden rounded-xl rounded-br-sm bg-[#d9fdd3] shadow-sm">
            {isMediaHeader && (
              <div className="relative flex h-32 w-full items-center justify-center bg-slate-200/70">
                {mediaPreviewUrl ? (
                  <img
                    src={mediaPreviewUrl}
                    alt="Header preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.classList.remove("hidden");
                      }
                    }}
                  />
                ) : null}
                <div className={`flex flex-col items-center gap-1 text-slate-400 ${mediaPreviewUrl ? "hidden" : ""}`}>
                  <MediaIcon className="h-6 w-6" />
                  <span className="text-[11px] font-medium">{headerType === "IMAGE" ? "Header Image" : headerType}</span>
                  {!mediaPreviewUrl && headerType === "IMAGE" && (
                    <span className="text-[10px] text-slate-400/80">(Configured on Meta)</span>
                  )}
                </div>
              </div>
            )}

            <div className="px-3 py-2">
              {headerType === "TEXT" && headerText && (
                <p className="mb-1 text-[12.5px] font-semibold text-slate-900">{headerText}</p>
              )}
              <p className={`whitespace-pre-wrap break-words leading-relaxed text-slate-800 ${bubbleTextSize}`}>
                {body || (
                  <span className="italic text-slate-400">Message preview will appear here…</span>
                )}
              </p>
              <p className="mt-0.5 text-right text-[10px] text-emerald-500">✓✓</p>
            </div>

            {buttons.length > 0 && (
              <div className="divide-y divide-slate-200/70 border-t border-slate-200/70">
                {buttons.map((button, index) => (
                  <p
                    key={index}
                    className="px-3 py-2 text-center text-[12px] font-medium text-sky-700"
                  >
                    {button.text || "Button"}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-[90%] rounded-xl rounded-br-sm bg-slate-100 px-3 py-2">
            <p className="text-[12.5px] italic text-slate-400">Message preview will appear here…</p>
          </div>
        )}
      </div>
    </div>
  );
}
