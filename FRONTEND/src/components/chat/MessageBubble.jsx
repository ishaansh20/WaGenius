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
      <mark
        key={i}
        className="rounded-sm bg-yellow-300 text-slate-900 not-italic"
        style={{ backgroundColor: "#fde047" }}
      >
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
      className={cn(
        "flex w-full items-end gap-2",
        isIncoming ? "justify-start" : "justify-end",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1",
          "max-w-[88%] sm:max-w-[80%] md:max-w-[72%] lg:max-w-[62%] xl:max-w-[55%]",
          isIncoming ? "items-start" : "items-end",
        )}
      >
        {senderLabel && (
          <span className="px-1 text-[11px] font-medium text-slate-400">
            {senderLabel}
          </span>
        )}

        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 shadow-sm transition-shadow",
            isIncoming
              ? "rounded-bl-sm border border-slate-200 bg-white text-slate-900"
              : "rounded-br-sm border border-[#c0e8c0] bg-[#d9fdd3] text-slate-900",
            isCurrentMatch && "ring-2 ring-yellow-400 ring-offset-1",
          )}
        >
          {message.mediaUrl && (
            <img
              src={resolveMediaUrl(message.mediaUrl)}
              alt=""
              className="mb-2 max-h-64 w-full rounded-lg object-cover"
            />
          )}
          <p className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.5]">
            {highlightText(message.content, searchQuery)}
          </p>
        </div>

        {/* Meta row */}
        <div
          className={cn(
            "flex items-center gap-1 px-1 text-[11px] text-slate-400",
            isIncoming ? "justify-start" : "justify-end",
          )}
        >
          <span className="tabular-nums">{formatTime(message.createdAt)}</span>

          {!isIncoming && !message.optimistic && (
            <>
              {message.status === "sent" && <Check className="h-3 w-3" />}
              {(message.status === "delivered" || message.status === "read") && (
                <CheckCheck
                  className={cn(
                    "h-3 w-3",
                    message.status === "read" ? "text-emerald-500" : "",
                  )}
                />
              )}
              {message.status === "failed" && (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
            </>
          )}

          {message.optimistic && <span className="opacity-60">Sending…</span>}
        </div>
      </div>
    </div>
  );
}
