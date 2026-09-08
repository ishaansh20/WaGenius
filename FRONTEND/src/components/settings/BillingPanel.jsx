import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { CheckCircle2, Sparkles } from "lucide-react";
import { fetchPlans, fetchMySubscription, selectPlan } from "../../services/api";

const statusClasses = {
  TRIAL: "border-amber-200 bg-amber-50 text-amber-700",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-slate-200 bg-slate-50 text-slate-500",
  SUSPENDED: "border-red-200 bg-red-50 text-red-600",
  CANCELLED: "border-red-200 bg-red-50 text-red-600",
  EXPIRED: "border-red-200 bg-red-50 text-red-600",
};

export default function BillingPanel() {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const [plansRes, subRes] = await Promise.all([
        fetchPlans(),
        fetchMySubscription().catch(() => ({ data: null })),
      ]);
      setPlans(plansRes.data || []);
      setSubscription(subRes.data || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load billing info");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSelect(plan) {
    try {
      setSelectingId(plan._id);
      await selectPlan({ planId: plan._id, billingCycle: "monthly" });
      toast.success(
        plan.trialDays > 0
          ? `${plan.trialDays}-day trial started`
          : "Plan selected — pending activation",
      );
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to select plan");
    } finally {
      setSelectingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
      </div>
    );
  }

  const currentPlanId = subscription?.planId?._id;

  return (
    <div className="space-y-5">
      {subscription && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Current Plan</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {subscription.planId?.name || "—"}
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[subscription.status] || statusClasses.PENDING}`}>
              {subscription.status}
            </span>
          </div>
          {subscription.status === "TRIAL" && subscription.trialEndsAt && (
            <p className="mt-2 text-xs text-slate-500">
              Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan._id === currentPlanId;

          return (
            <div key={plan._id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">{plan.name}</h3>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                ₹{plan.pricing?.monthly ?? 0}
                <span className="text-sm font-normal text-slate-400">/month</span>
              </p>

              <ul className="mt-4 flex-1 space-y-1.5 text-xs text-slate-600">
                <li>{plan.limits?.users ?? 0} Users</li>
                <li>{plan.limits?.contacts ?? 0} Contacts</li>
                <li>{plan.limits?.campaigns ?? 0} Campaigns</li>
                {plan.features?.whatsapp && (
                  <li className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> WhatsApp
                  </li>
                )}
                {plan.features?.ai && (
                  <li className="flex items-center gap-1 text-emerald-600">
                    <Sparkles className="h-3 w-3" /> AI
                  </li>
                )}
              </ul>

              <button
                disabled={isCurrent || selectingId === plan._id}
                onClick={() => handleSelect(plan)}
                className={`mt-4 rounded-lg py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
                  isCurrent
                    ? "bg-slate-100 text-slate-400"
                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                }`}
              >
                {isCurrent ? "Current Plan" : selectingId === plan._id ? "Selecting..." : plan.trialDays > 0 ? "Start Trial" : "Select Plan"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
