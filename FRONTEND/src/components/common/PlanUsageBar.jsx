import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import usePlan from "../../hooks/usePlan";
import { cn } from "../../utils/cn";

/**
 * Reusable Plan Usage Progress Bar:
 * Displays real-time usage (e.g. 432 / 500 Contacts). The bar is brand green,
 * and turns red only once the limit is reached.
 *
 * @example
 *   <PlanUsageBar resourceKey="contacts" label="Contacts" />
 */
export default function PlanUsageBar({ resourceKey, label }) {
  const navigate = useNavigate();
  const { getUsage, getLimit } = usePlan();

  const usage = getUsage(resourceKey);
  const limit = getLimit(resourceKey);

  const isUnlimited = limit === -1 || limit >= 999999;
  const percent = isUnlimited ? 0 : Math.min(Math.round((usage / limit) * 100), 100);

  // Bar stays brand green until the limit is reached.
  let barColor = "bg-brand-600";
  let statusText = null;
  let statusColor = "text-warning";

  if (percent >= 100) {
    barColor = "bg-danger";
    statusText = "Limit reached";
    statusColor = "text-danger";
  } else if (percent >= 80) {
    statusText = "Approaching limit";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">{label || resourceKey}</span>
        <span className="text-[13px] text-ink-muted tabular-nums">
          {usage.toLocaleString()} / {isUnlimited ? "Unlimited" : limit.toLocaleString()}
        </span>
      </div>

      {!isUnlimited && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#eceeed]">
          <div
            className={cn("h-full rounded-full transition-all duration-300", barColor)}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {statusText && (
        <div className="flex items-center justify-between gap-3">
          <span className={cn("text-[13px] font-medium", statusColor)}>{statusText}</span>
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-900 hover:underline"
          >
            Upgrade plan
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
