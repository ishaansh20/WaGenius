import { Send, Smile } from "lucide-react";
import { useRef, useEffect } from "react";

export function ChatInput({ value, onChange, onSend, sending }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [value]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (sending || !value.trim()) return;
      onSend();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSend();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 border-t border-line bg-surface px-3 py-3 sm:px-4"
    >
      <div className="flex items-end gap-2">
        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
          title="Emoji"
          aria-label="Emoji"
        >
          <Smile className="h-5 w-5" />
        </button>

        <div className="relative flex-1">
          <label htmlFor="inbox-composer" className="sr-only">
            Type a message
          </label>
          <textarea
            id="inbox-composer"
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="block min-h-[44px] w-full resize-none rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[15px] leading-[1.5] text-ink outline-none transition-colors placeholder:text-ink-subtle hover:border-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
          />
        </div>

        <button
          type="submit"
          disabled={sending || !value.trim()}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-900 px-4 text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(11,59,46,0.2)] transition-colors hover:bg-brand-800 active:bg-brand-950 disabled:cursor-not-allowed disabled:opacity-55"
          title="Send"
          aria-label="Send message"
        >
          {sending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>
    </form>
  );
}
