import { cn } from "../../utils/cn";

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {Icon && (
        <div className="relative mb-5">
          <div className="absolute -inset-3 rounded-full bg-brand-50" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-100 bg-surface text-brand-700 shadow-[var(--shadow-card)]">
            <Icon size={24} />
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
