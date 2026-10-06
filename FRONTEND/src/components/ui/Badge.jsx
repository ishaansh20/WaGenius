import { cn } from "../../utils/cn";

const TONES = {
  neutral: "bg-[#f1f2ee] text-ink-muted",
  brand: "bg-brand-100 text-brand-800",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  accent: "bg-accent-soft text-brand-900",
  dark: "bg-brand-900 text-white",
};

const DOTS = {
  neutral: "bg-ink-subtle",
  brand: "bg-brand-600",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  accent: "bg-brand-700",
  dark: "bg-accent",
};

export default function Badge({ tone = "neutral", dot = false, className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[tone])} />}
      {children}
    </span>
  );
}

// Maps the status strings used across campaigns/templates/messages to a tone.
const STATUS_TONES = {
  approved: "success",
  active: "success",
  completed: "success",
  done: "success",
  delivered: "success",
  read: "success",
  sent: "info",
  processing: "info",
  scheduled: "info",
  running: "info",
  pending: "warning",
  trial: "warning",
  paused: "warning",
  draft: "neutral",
  failed: "danger",
  error: "danger",
  rejected: "danger",
  cancelled: "neutral",
  expired: "danger",
  suspended: "danger",
};

export function StatusPill({ status, className }) {
  const key = String(status || "").toLowerCase();
  const label = key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ") : "—";
  return (
    <Badge tone={STATUS_TONES[key] || "neutral"} dot className={className}>
      {label}
    </Badge>
  );
}
