import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { CheckCircle2, Sparkles } from "lucide-react";
import { fetchPlans, fetchMySubscription, selectPlan } from "../../services/api";
import { Badge, Button, Card, Skeleton } from "../ui";
import { cn } from "../../utils/cn";

const statusTones = {
  TRIAL: "warning",
  ACTIVE: "brand",
  PENDING: "neutral",
  SUSPENDED: "danger",
  CANCELLED: "danger",
  EXPIRED: "danger",
};

function formatStatus(value = "") {
  const text = String(value).toLowerCase().replace(/_/g, " ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

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
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-[96px] w-full rounded-[var(--radius-card)]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[260px] rounded-[var(--radius-card)]" />
          ))}
        </div>
      </div>
    );
  }

  const currentPlanId = subscription?.planId?._id;

  return (
    <div className="space-y-5">
      {subscription && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-ink-muted">Current plan</p>
              <p className="mt-1 text-[20px] font-semibold text-ink">
                {subscription.planId?.name || "—"}
              </p>
            </div>
            <Badge tone={statusTones[subscription.status] || "neutral"} dot className="text-[13px]">
              {formatStatus(subscription.status)}
            </Badge>
          </div>
          {subscription.status === "TRIAL" && subscription.trialEndsAt && (
            <p className="mt-2 text-[14px] text-ink-muted">
              Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan._id === currentPlanId;

          return (
            <Card
              key={plan._id}
              className={cn("flex flex-col", isCurrent && "border-brand-600 ring-1 ring-brand-600")}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[17px] font-semibold text-ink">{plan.name}</h3>
                {isCurrent && <Badge tone="brand" className="text-[13px]">Current</Badge>}
              </div>
              <p className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-ink tabular-nums">
                ₹{plan.pricing?.monthly ?? 0}
                <span className="ml-1 text-[14px] font-normal text-ink-muted">/month</span>
              </p>

              <ul className="mt-4 flex-1 space-y-2 text-[14px] text-ink">
                <li>{plan.limits?.users ?? 0} Users</li>
                <li>{plan.limits?.contacts ?? 0} Contacts</li>
                <li>{plan.limits?.campaigns ?? 0} Campaigns</li>
                {plan.features?.whatsapp && (
                  <li className="flex items-center gap-1.5 text-brand-700">
                    <CheckCircle2 size={16} /> WhatsApp
                  </li>
                )}
                {plan.features?.ai && (
                  <li className="flex items-center gap-1.5 text-brand-700">
                    <Sparkles size={16} /> AI
                  </li>
                )}
              </ul>

              <Button
                variant={isCurrent ? "secondary" : "primary"}
                disabled={isCurrent || selectingId === plan._id}
                onClick={() => handleSelect(plan)}
                className="mt-5 w-full disabled:cursor-not-allowed"
              >
                {isCurrent ? "Current Plan" : selectingId === plan._id ? "Selecting..." : plan.trialDays > 0 ? "Start Trial" : "Select Plan"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
