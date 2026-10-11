import { Check, CheckCheck, Clock3, AlertCircle } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * WhatsApp-style delivery ticks.
 *   sent → one grey tick · delivered → two grey ticks · read → two blue ticks
 * The colour change eases in, so a status update visibly "turns blue".
 */
export default function Ticks({ status, size = 15, className }) {
  const key = String(status || "").toLowerCase();
  const base = "shrink-0 transition-colors duration-500";

  if (key === "failed") return <AlertCircle size={size} className={cn(base, "text-danger", className)} />;
  if (key === "sending" || key === "pending") return <Clock3 size={size} className={cn(base, "text-ink-subtle", className)} />;
  if (key === "read") return <CheckCheck size={size} className={cn(base, "text-[#34b7f1]", className)} />;
  if (key === "delivered") return <CheckCheck size={size} className={cn(base, "text-ink-subtle", className)} />;
  return <Check size={size} className={cn(base, "text-ink-subtle", className)} />;
}
