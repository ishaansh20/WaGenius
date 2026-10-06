import { FileText, Image as ImageIcon, Pencil, Video } from "lucide-react";
import { resolveMediaUrl } from "../../utils/media";
import { Badge, Button, Modal } from "../ui";
import { BubbleBody, BubbleButtons, ChatBubble, EmptyBubble, PhoneFrame } from "./WhatsAppPreview";

// Shared WhatsApp-style preview modal. Callers pass whichever badges make
// sense for their context (local category/status on the Templates page,
// Meta category/status on the Approved Templates pages) so this component
// stays agnostic of which template "track" it's previewing.
// Each badge is { label, tone } where tone is a Badge tone
// (neutral | success | warning | danger | info | brand).
export default function TemplatePreviewModal({ template, badges = [], onClose, onEdit }) {
  if (!template) return null;

  return (
    <Modal
      open={Boolean(template)}
      onClose={onClose}
      title={template.name}
      size="md"
      footer={
        <>
          {onEdit && (
            <Button variant="secondary" leftIcon={Pencil} onClick={onEdit}>
              Edit
            </Button>
          )}
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      {badges.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {badges.map((badge) => (
            <Badge key={badge.label} tone={badge.tone || "neutral"} dot={badge.tone && badge.tone !== "neutral"}>
              {badge.label}
            </Badge>
          ))}
        </div>
      )}

      <PhoneFrame name={template.name} minHeight="min-h-[200px]">
        {template.description ? (
          <ChatBubble>
            {/* Header: IMAGE */}
            {template.headerType === "IMAGE" && (() => {
              const imgUrl = template.headerMediaUrl || template.mediaUrl || (/^https?:\/\//i.test(template.headerHandle) ? template.headerHandle : "");
              return imgUrl ? (
                <div className="relative">
                  <img
                    src={resolveMediaUrl(imgUrl)}
                    alt=""
                    className="max-h-56 w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.classList.remove("hidden");
                      }
                    }}
                  />
                  <div className="hidden flex-col items-center justify-center bg-black/5 py-8 text-center text-ink-muted">
                    <ImageIcon className="mb-1 h-7 w-7" />
                    <span className="text-[13px] font-medium">Image unavailable</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center bg-black/5 py-7 text-center">
                  <span className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-brand-700">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                  <p className="text-[13px] font-semibold text-ink">Header image</p>
                  <p className="text-[12px] text-ink-muted">Approved and hosted on Meta</p>
                </div>
              );
            })()}

            {/* Header: VIDEO */}
            {template.headerType === "VIDEO" && (() => {
              const videoUrl = template.headerMediaUrl || template.mediaUrl || (/^https?:\/\//i.test(template.headerHandle) ? template.headerHandle : "");
              return videoUrl ? (
                <video src={resolveMediaUrl(videoUrl)} controls className="max-h-56 w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center bg-black/5 py-7 text-center">
                  <Video className="mb-1 h-6 w-6 text-brand-700" />
                  <p className="text-[13px] font-semibold text-ink">Header video</p>
                </div>
              );
            })()}

            {/* Header: DOCUMENT */}
            {template.headerType === "DOCUMENT" && (
              <div className="m-2.5 flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-ink-muted">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">Document attached</p>
                  <p className="text-[12px] text-ink-muted">PDF document</p>
                </div>
              </div>
            )}

            {/* Header: TEXT */}
            {template.headerType === "TEXT" && template.headerText && (
              <p className="px-3 pt-2.5 text-[14px] font-semibold text-ink">{template.headerText}</p>
            )}

            {/* Legacy or fallback mediaUrl without explicit headerType */}
            {(!template.headerType || template.headerType === "NONE") && template.mediaUrl && (
              <img src={resolveMediaUrl(template.mediaUrl)} alt="" className="max-h-56 w-full object-cover" />
            )}

            <BubbleBody>{template.description}</BubbleBody>
            <BubbleButtons buttons={template.buttons} />
          </ChatBubble>
        ) : (
          <EmptyBubble text="No message content" />
        )}
      </PhoneFrame>

      {template.subject && (
        <p className="mt-4 text-[14px] text-ink-muted">
          <span className="font-medium text-ink">Subject:</span> {template.subject}
        </p>
      )}
      {template.rejectionReason && (
        <div className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-[14px] text-danger">
          Rejected by Meta: {template.rejectionReason}
        </div>
      )}
    </Modal>
  );
}
