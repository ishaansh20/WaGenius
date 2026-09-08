import { useNavigate } from "react-router-dom";
import usePlan from "../../hooks/usePlan";

/**
 * Reusable Plan Usage Progress Bar:
 * Displays real-time usage (e.g. 432 / 500 Contacts) with visual threshold colors.
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

  // Status color based on threshold
  let barColor = "bg-emerald-500";
  let statusText = null;

  if (percent >= 100) {
    barColor = "bg-red-500";
    statusText = "Limit reached";
  } else if (percent >= 80) {
    barColor = "bg-amber-500";
    statusText = "Approaching limit";
  }

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center justify-between text-slate-700">
        <span className="font-semibold">{label || resourceKey}</span>
        <span className="text-slate-500 font-mono text-[11px]">
          {usage.toLocaleString()} / {isUnlimited ? "Unlimited" : limit.toLocaleString()}
        </span>
      </div>

      {!isUnlimited && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/80">
          <div
            className={`h-full transition-all duration-300 ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {statusText && (
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px] font-bold text-amber-700">{statusText}</span>
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            className="text-[10px] font-bold text-emerald-700 hover:underline"
          >
            Upgrade Plan →
          </button>
        </div>
      )}
    </div>
  );
}
