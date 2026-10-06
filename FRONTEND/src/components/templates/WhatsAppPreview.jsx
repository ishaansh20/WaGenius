import { CheckCheck, FileText, Image as ImageIcon, Video } from "lucide-react";
import { resolveMediaUrl } from "../../utils/media";
import { cn } from "../../utils/cn";

const HEADER_MEDIA_ICON = {
  IMAGE: ImageIcon,
  VIDEO: Video,
  DOCUMENT: FileText,
};

/* ── Shared phone-preview building blocks ──────────────────────────────
   Exported so the classic template form (CreateTemplatePage) can render
   its own preview logic inside the exact same frame and bubble styles. */

// White phone frame with a WhatsApp-style chat header and a subtle chat
// background. `children` is the conversation content (usually a bubble).
export function PhoneFrame({ name, minHeight = "min-h-[260px]", className, children }) {
  const initial = (name || "").trim().charAt(0).toUpperCase() || "W";
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[360px] rounded-[28px] border border-line bg-surface p-2.5 shadow-[0_1px_2px_rgba(11,59,46,0.05),0_16px_40px_rgba(11,59,46,0.08)]",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[20px] border border-line">
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[14px] font-semibold text-brand-800">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{name || "Template preview"}</p>
            <p className="text-[12px] text-ink-muted">Message template</p>
          </div>
        </div>
        <div className={cn("bg-[#f2eee8] px-3 py-4", minHeight)}>{children}</div>
      </div>
    </div>
  );
}

// Outgoing message bubble container.
export function ChatBubble({ className, children }) {
  return (
    <div className="flex justify-end">
      <div
        className={cn(
          "w-full max-w-[88%] overflow-hidden rounded-xl rounded-tr-sm bg-[#dcf8c6] shadow-[0_1px_1px_rgba(11,59,46,0.08)]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Placeholder bubble shown before anything has been written.
export function EmptyBubble({ text = "Your message preview will appear here." }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] rounded-xl rounded-tr-sm bg-surface/80 px-3 py-2.5">
        <p className="text-[14px] text-ink-muted">{text}</p>
      </div>
    </div>
  );
}

// Body text + read ticks.
export function BubbleBody({ children, placeholder = "Your message preview will appear here." }) {
  return (
    <div className="px-3 py-2">
      <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink">
        {children || <span className="text-ink-muted">{placeholder}</span>}
      </p>
      <p className="mt-0.5 flex justify-end text-brand-600" aria-hidden="true">
        <CheckCheck size={14} />
      </p>
    </div>
  );
}

// Reply/link buttons rendered under the bubble, WhatsApp-style.
export function BubbleButtons({ buttons = [] }) {
  if (!buttons?.length) return null;
  return (
    <div className="divide-y divide-black/5 border-t border-black/5 bg-white/40">
      {buttons.map((button, index) => (
        <p key={index} className="px-3 py-2 text-center text-[14px] font-medium text-brand-700">
          {button.text || "Button"}
        </p>
      ))}
    </div>
  );
}

// Shared WhatsApp-style preview — used by the approved-template wizard.
// Deliberately shows the raw {{token}} text rather than substituting it —
// this previews the template's literal shape, not a specific contact's
// resolved message.
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

  const containerMinHeight = size === "large" ? "min-h-[320px]" : "min-h-[260px]";

  return (
    <PhoneFrame name={name} minHeight={containerMinHeight}>
      {body.trim() || headerType !== "NONE" ? (
        <ChatBubble>
          {isMediaHeader && (
            <div className="relative flex h-36 w-full items-center justify-center bg-black/5">
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
              <div className={`flex flex-col items-center gap-1 text-ink-muted ${mediaPreviewUrl ? "hidden" : ""}`}>
                <MediaIcon className="h-6 w-6" />
                <span className="text-[13px] font-medium">
                  {headerType === "IMAGE" ? "Header image" : headerType.charAt(0) + headerType.slice(1).toLowerCase()}
                </span>
                {!mediaPreviewUrl && headerType === "IMAGE" && (
                  <span className="text-[12px] text-ink-muted">(Configured on Meta)</span>
                )}
              </div>
            </div>
          )}

          {headerType === "TEXT" && headerText && (
            <p className="px-3 pt-2 text-[14px] font-semibold text-ink">{headerText}</p>
          )}
          <BubbleBody>{body}</BubbleBody>
          <BubbleButtons buttons={buttons} />
        </ChatBubble>
      ) : (
        <EmptyBubble />
      )}
    </PhoneFrame>
  );
}
