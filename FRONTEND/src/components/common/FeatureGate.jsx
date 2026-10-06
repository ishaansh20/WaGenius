import { Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import usePlan from "../../hooks/usePlan";
import { Button } from "../ui";

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
      <div
        className="relative inline-flex cursor-not-allowed items-center gap-1.5 opacity-60"
        title={`Available on the ${requiredPlan} plan`}
      >
        {children}
        <Lock className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-xl bg-canvas px-5 py-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-brand-700 shadow-[var(--shadow-card)]">
        <Lock size={18} />
      </span>
      <h4 className="mt-3 text-[15px] font-semibold text-ink">
        {title ? `${title} is locked` : "This feature is locked"}
      </h4>
      <p className="mx-auto mt-1 max-w-xs text-[14px] text-ink-muted">
        Available on the <span className="font-medium text-ink">{requiredPlan}</span> plan and above.
      </p>
      <Button size="sm" className="mt-4" rightIcon={ArrowRight} onClick={() => navigate("/pricing")}>
        View plans
      </Button>
    </div>
  );
}
