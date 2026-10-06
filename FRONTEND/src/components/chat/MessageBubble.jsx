import { Check, CheckCheck, AlertCircle } from "lucide-react";
import { cn } from "../../utils/cn";
import { resolveMediaUrl } from "../../utils/media";

function formatTime(value) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function highlightText(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  const lower = query.toLowerCase();
  return parts.map((part, i) =>
    part.toLowerCase() === lower ? (
      <mark key={i} className="rounded-sm bg-accent px-0.5 text-ink">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function getSenderLabel(message) {
  if (message.sender === "ai") return "AI Assistant";
  if (message.sender === "agent") return message.senderName || "Agent";
  return null;
}

export function MessageBubble({ message, searchQuery, isCurrentMatch, showSenderLabel }) {
  const isIncoming = message.sender === "user";
  const senderLabel = !isIncoming && showSenderLabel ? getSenderLabel(message) : null;

  return (
    <div
      data-message-id={message.id}
      className={cn("flex w-full", isIncoming ? "justify-start" : "justify-end")}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1",
          "max-w-[88%] sm:max-w-[80%] md:max-w-[72%] lg:max-w-[62%] xl:max-w-[55%]",
          isIncoming ? "items-start" : "items-end",
        )}
      >
        {senderLabel && (
          <span className="px-1 text-[13px] font-medium text-ink-muted">{senderLabel}</span>
        )}

        <div
          className={cn(
            "min-w-[88px] rounded-2xl px-3.5 pb-1.5 pt-2.5 shadow-[0_1px_1px_rgba(15,28,23,0.06)] transition-shadow",
            isIncoming
              ? "rounded-tl-md border border-line bg-surface text-ink"
              : "rounded-tr-md border border-[#c6e9be] bg-[#dcf5d6] text-ink",
            isCurrentMatch && "ring-2 ring-brand-500 ring-offset-2 ring-offset-[#f6f5f1]",
          )}
        >
          {message.mediaUrl && (
            <img
              src={resolveMediaUrl(message.mediaUrl)}
              alt=""
              className="mb-2 max-h-64 w-full rounded-lg object-cover"
            />
          )}
          <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.5]">
            {highlightText(message.content, searchQuery)}
          </p>

          {/* Meta row */}
          <div className="mt-1 flex items-center justify-end gap-1 text-[12px] text-ink-muted">
            <span className="tabular-nums">{formatTime(message.createdAt)}</span>

            {!isIncoming && !message.optimistic && (
              <>
                {message.status === "sent" && (
                  <Check className="h-3.5 w-3.5" aria-label="Sent" />
                )}
                {(message.status === "delivered" || message.status === "read") && (
                  <CheckCheck
                    className={cn("h-3.5 w-3.5", message.status === "read" && "text-brand-600")}
                    aria-label={message.status === "read" ? "Read" : "Delivered"}
                  />
                )}
                {message.status === "failed" && (
                  <span className="inline-flex items-center gap-1 font-medium text-danger">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Not sent
                  </span>
                )}
              </>
            )}

            {message.optimistic && <span>Sending…</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
