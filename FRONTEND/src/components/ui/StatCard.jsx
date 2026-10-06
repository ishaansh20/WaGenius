import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "../../utils/cn";

export default function StatCard({ label, value, icon: Icon, hint, trend, className }) {
  const trendUp = typeof trend === "number" && trend >= 0;

  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-muted">{label}</p>
        {Icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon size={18} />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-[28px] font-semibold leading-none text-ink tabular-nums">{value}</p>
      {(hint || typeof trend === "number") && (
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          {typeof trend === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                trendUp ? "text-success" : "text-danger",
              )}
            >
              {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(trend)}%
            </span>
          )}
          {hint && <span className="text-ink-muted">{hint}</span>}
        </div>
      )}
    </div>
  );
}
