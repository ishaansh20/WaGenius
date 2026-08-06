import { motion } from "framer-motion";
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
      className="sticky bottom-0 border-t border-slate-200 bg-white px-3 py-2.5 sm:px-4"
    >
      <div className="flex items-end gap-2">
        <button
          type="button"
          className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          title="Emoji"
        >
          <Smile className="h-5 w-5" />
        </button>

        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="min-h-[40px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
          />
        </div>

        <motion.button
          whileHover={{ scale: sending ? 1 : 1.03 }}
          whileTap={{ scale: sending ? 1 : 0.97 }}
          type="submit"
          disabled={sending || !value.trim()}
          className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          title="Send"
        >
          {sending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </motion.button>
      </div>
    </form>
  );
}
