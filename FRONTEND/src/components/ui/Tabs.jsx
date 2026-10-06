import { cn } from "../../utils/cn";

/**
 * Controlled segmented tabs.
 * items: [{ value, label, count? }]
 */
export default function Tabs({ items, value, onChange, className }) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[#f1f2ee] p-1 scrollbar-hide", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-[13px] font-medium transition-colors",
              active ? "bg-surface text-ink shadow-[0_1px_3px_rgba(11,59,46,0.12)]" : "text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
            {typeof item.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[12px] tabular-nums",
                  active ? "bg-brand-100 text-brand-800" : "bg-white/70 text-ink-muted",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
