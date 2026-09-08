import { Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import usePlan from "../../hooks/usePlan";

/**
 * Reusable Feature Gate Component:
 * Wraps any UI button/section that requires a specific plan feature flag.
 *
 * If the user's plan has the feature, children are rendered normally.
 * If not, renders a locked/faded version with a prompt to upgrade to Pro/Enterprise.
 *
 * @example
 *   <FeatureGate feature="contactImport" title="Bulk Import">
 *     <button onClick={openImportModal}>Import CSV</button>
 *   </FeatureGate>
 */
export default function FeatureGate({
  feature,
  children,
  fallback = null,
  title,
  requiredPlan = "Pro",
  inline = false,
}) {
  const navigate = useNavigate();
  const { canUse } = usePlan();

  if (canUse(feature)) {
    return children;
  }

  if (fallback) {
    return fallback;
  }

  if (inline) {
    return (
      <div className="relative inline-flex items-center gap-1.5 opacity-60 cursor-not-allowed">
        {children}
        <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-center">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-700 mb-2">
        <Lock className="h-4 w-4" />
      </div>
      <h4 className="text-xs font-bold text-slate-800">
        {title ? `${title} is Locked` : "Feature Locked"}
      </h4>
      <p className="mt-1 text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
        Available on the <strong>{requiredPlan}</strong> plan and above.
      </p>
      <button
        type="button"
        onClick={() => navigate("/pricing")}
        className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-lg transition"
      >
        <span>View Plans</span>
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
