import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Check,
  X,
  Minus,
  Sparkles,
  Zap,
  Shield,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Users,
  BarChart3,
  Smartphone,
  CheckCircle2,
  Lock,
  LogOut,
} from "lucide-react";
import {
  fetchPlans,
  fetchPlanAccess,
  selectPlan,
} from "../../services/api";
import useAuthStore from "../../store/authStore";
import useSubscriptionStore from "../../store/subscriptionStore";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Badge, Button, Card, Logo, Skeleton } from "../../components/ui";
import { cn } from "../../utils/cn";

/* ─── Comparison Matrix Definitions ───────────────────────────────────── */
const COMPARISON_SECTIONS = [
  {
    icon: Smartphone,
    title: "WhatsApp & Messaging",
    rows: [
      { label: "WhatsApp Business Connection", free: true, pro: true, enterprise: true },
      { label: "WhatsApp Embedded Signup", free: true, pro: true, enterprise: true },
      { label: "WhatsApp Shared Inbox", free: true, pro: true, enterprise: true },
      { label: "Send & Receive Messages", free: true, pro: true, enterprise: true },
      { label: "Connected WhatsApp Numbers", free: "1", pro: "1", enterprise: "5" },
      { label: "Meta Messaging Capacity", free: "Subject to Meta", pro: "Subject to Meta", enterprise: "Subject to Meta" },
    ],
  },
  {
    icon: Users,
    title: "Contacts & Audience",
    rows: [
      { label: "Contact Limit", free: "500", pro: "5,000", enterprise: "50,000" },
      { label: "Contact Management & Search", free: true, pro: true, enterprise: true },
      { label: "Bulk Contact Import (CSV)", free: false, pro: true, enterprise: true },
      { label: "Contact Export (CSV)", free: false, pro: true, enterprise: true },
      { label: "Advanced Segmentation & Groups", free: false, pro: true, enterprise: true },
    ],
  },
  {
    icon: MessageSquare,
    title: "Broadcast Campaigns",
    rows: [
      { label: "Monthly Broadcast Campaigns", free: "Unlimited", pro: "Unlimited", enterprise: "Unlimited" },
      { label: "Create & Send Campaigns", free: true, pro: true, enterprise: true },
      { label: "Campaign Scheduling", free: false, pro: true, enterprise: true },
      { label: "Pause & Resume Campaigns", free: false, pro: true, enterprise: true },
      { label: "Campaign Delivery Analytics", free: "Basic", pro: "Advanced", enterprise: "Advanced" },
    ],
  },
  {
    icon: Sparkles,
    title: "Templates & AI",
    rows: [
      { label: "WhatsApp Template Limit", free: "5", pro: "100", enterprise: "500" },
      { label: "Template Management & Sync", free: true, pro: true, enterprise: true },
      { label: "AI Template Drafting", free: false, pro: true, enterprise: true },
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    rows: [
      { label: "Dashboard Analytics", free: "Basic", pro: "Advanced", enterprise: "Advanced" },
      { label: "Campaign Performance Analytics", free: "Basic", pro: "Advanced", enterprise: "Advanced" },
      { label: "Analytics & Report Export (CSV)", free: false, pro: true, enterprise: true },
    ],
  },
  {
    icon: Users,
    title: "Team & Access Control",
    rows: [
      { label: "Team Members (Users)", free: "1", pro: "5", enterprise: "20" },
      { label: "Team Management & Roles", free: false, pro: true, enterprise: true },
      { label: "User Invitations", free: false, pro: true, enterprise: true },
    ],
  },
  {
    icon: Zap,
    title: "Developer, API & Support",
    rows: [
      { label: "Public API Access", free: false, pro: false, enterprise: true },
      { label: "Custom Webhooks", free: false, pro: false, enterprise: true },
      { label: "Customer Support", free: "Standard", pro: "Priority", enterprise: "Priority + Onboarding" },
      { label: "Dedicated Onboarding", free: false, pro: false, enterprise: true },
    ],
  },
];

/* ─── FAQs ────────────────────────────────────────────────────────────── */
const FAQS = [
  {
    q: "Is the Free Plan truly free forever?",
    a: "Yes — the Free Plan is 100% free forever, no credit card required. It gives you full WhatsApp messaging capabilities for up to 500 contacts, 5 campaigns/month, and 5 templates.",
  },
  {
    q: "How does annual billing work?",
    a: "Annual billing gives you a 20% discount across all paid plans. Pro is ₹1,599/month (billed ₹19,188/year) and Enterprise is ₹3,999/month (billed ₹47,988/year).",
  },
  {
    q: "How are WhatsApp messaging charges billed?",
    a: "Meta charges separately for WhatsApp Business Platform messages on a per-delivered-message basis depending on recipient country and message category (Marketing, Utility, Authentication, Service). Wagenius charges 0% commission markup on Meta's official messaging rates, which are billed directly via your Meta Business Manager payment method.",
  },
  {
    q: "What is the difference between Wagenius plan limits and Meta limits?",
    a: "Your Wagenius subscription plan controls your platform features and resource limits (e.g. contacts stored, campaign broadcasts, template slots, team members, and connected WhatsApp numbers). Meta independently controls message delivery, account quality tiers, and rolling 24-hour business-initiated messaging capacity. Wagenius cannot override Meta-imposed limits.",
  },
  {
    q: "Can I upgrade or change my plan anytime?",
    a: "Yes, you can upgrade, downgrade, or switch between monthly and annual billing at any point. Your new limits and features take effect immediately.",
  },
  {
    q: "What if my company already has more contacts than a lower plan limit?",
    a: "Your existing contacts and history are never deleted. However, to create new contacts or import files once you exceed a tier's limit, you will need to upgrade to a plan with sufficient capacity.",
  },
];

/* ─── Comparison Cell Helper ──────────────────────────────────────────── */
function Cell({ value }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center" aria-label="Included">
        <Check className="h-[18px] w-[18px] stroke-[2.5] text-brand-600" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center" aria-label="Not included">
        <Minus className="h-4 w-4 text-ink-subtle" />
      </span>
    );
  }
  return <span className="text-[14px] font-medium text-ink">{value}</span>;
}

/* ─── Card Feature Row Helpers ────────────────────────────────────────── */
function FeatureRow({ children }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <Check className="h-3 w-3 stroke-[3]" />
      </span>
      <span className="text-[14px] leading-snug text-ink">{children}</span>
    </li>
  );
}

function MissingRow({ children }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center text-ink-subtle">
        <X className="h-3.5 w-3.5" />
      </span>
      <span className="text-[14px] leading-snug text-ink-muted">{children}</span>
    </li>
  );
}

/* ─── Setup Step (progress stepper) ───────────────────────────────────── */
function SetupStep({ number, title, caption, state, lockedIcon: LockedIcon }) {
  // state: "done" | "current" | "upcoming"
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3.5",
        state === "done" && "border-brand-100 bg-brand-50",
        state === "current" && "border-brand-600 bg-surface ring-2 ring-brand-600/15",
        state === "upcoming" && "border-line bg-canvas",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums",
          state === "done" && "bg-brand-600 text-white",
          state === "current" && "bg-brand-900 text-white",
          state === "upcoming" && "border border-line-strong bg-surface text-ink-muted",
        )}
      >
        {state === "done" ? (
          <Check className="h-4 w-4 stroke-[2.5]" />
        ) : LockedIcon && state === "upcoming" ? (
          <LockedIcon className="h-4 w-4" />
        ) : (
          number
        )}
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold leading-tight text-ink">{title}</p>
        <p className="mt-0.5 truncate text-[13px] text-ink-muted">{caption}</p>
      </div>
    </div>
  );
}

/* ─── Section heading ─────────────────────────────────────────────────── */
function SectionHeading({ title, description, className }) {
  return (
    <div className={cn("mb-4", className)}>
      <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-ink">{title}</h2>
      {description && <p className="mt-1 text-[14px] text-ink-muted">{description}</p>}
    </div>
  );
}

/* ─── Meta message category ───────────────────────────────────────────── */
function MetaCategory({ name, plain, examples }) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-4">
      <p className="text-[15px] font-semibold text-ink">{name}</p>
      <p className="mt-0.5 text-[13px] font-medium text-brand-700">{plain}</p>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{examples}</p>
    </div>
  );
}

/* ─── Dynamic Bullets per Plan ────────────────────────────────────────── */
function getPlanBullets(plan) {
  const s = plan.slug;
  if (s === "free") {
    return {
      included: [
        `${plan.limits?.users ?? 1} Team Member`,
        `${(plan.limits?.contacts ?? 500).toLocaleString()} Contacts`,
        "Unlimited Broadcast Campaigns",
        `${plan.limits?.templates ?? 5} Templates`,
        `${plan.limits?.whatsappNumbers ?? 1} WhatsApp Number`,
        "WhatsApp Inbox",
        "Contact Management",
        "Basic Analytics",
      ],
      excluded: [
        "Bulk Contact Import",
        "Contact Export",
        "Advanced Segmentation",
        "Campaign Scheduling",
        "AI Template Drafting",
        "Team Management",
      ],
    };
  }
  if (s === "pro") {
    return {
      included: [
        `${plan.limits?.users ?? 5} Team Members`,
        `${(plan.limits?.contacts ?? 5000).toLocaleString()} Contacts`,
        "Unlimited Broadcast Campaigns",
        `${plan.limits?.templates ?? 100} Templates`,
        `${plan.limits?.whatsappNumbers ?? 1} WhatsApp Number`,
        "Bulk Contact Import & Export",
        "Advanced Segmentation",
        "Campaign Scheduling",
        "Pause & Resume Campaigns",
        "AI Template Drafting",
        "Advanced Analytics",
        "Analytics Export",
        "Team Management",
        "Priority Support",
      ],
      excluded: [
        "Public API Access",
        "Custom Webhooks",
      ],
    };
  }
  // Enterprise
  return {
    included: [
      `${plan.limits?.users ?? 20} Team Members`,
      `${(plan.limits?.contacts ?? 50000).toLocaleString()} Contacts`,
      "Unlimited Broadcast Campaigns",
      `${plan.limits?.templates ?? 500} Templates`,
      `${plan.limits?.whatsappNumbers ?? 5} WhatsApp Numbers`,
      "Everything in Pro",
      "Public API Access",
      "Custom Webhooks",
      "Advanced Integrations",
      "Priority Support",
      "Dedicated Onboarding",
    ],
    excluded: [],
  };
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function BillingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setupStatus = useAuthStore((state) => state.setupStatus);
  const logout = useAuthStore((state) => state.logout);
  const loadSubscription = useSubscriptionStore((state) => state.loadSubscription);

  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [justActivatedPlan, setJustActivatedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [selectingPlanId, setSelectingPlanId] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      const [plansRes, planAccessRes] = await Promise.all([
        fetchPlans(),
        user ? fetchPlanAccess().catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      ]);
      setPlans(plansRes.data || []);
      if (planAccessRes.data) {
        setCurrentPlan(planAccessRes.data.plan);
      }
    } catch (error) {
      console.error("Billing page load error:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  async function handleSelectPlan(plan) {
    if (!user) {
      navigate("/signup");
      return;
    }

    try {
      setSelectingPlanId(plan._id);
      const res = await selectPlan({ planId: plan._id, billingCycle });

      const newStatus = res?.setupStatus || "WHATSAPP_ONBOARDING_REQUIRED";
      useAuthStore.getState().setSetupStatus(newStatus);
      setJustActivatedPlan(plan);

      if (plan.isFree || plan.pricing?.monthly === 0) {
        toast.success("Free Plan activated successfully!");
      } else {
        toast.success(`${plan.name} plan activated successfully!`);
      }

      await loadSubscription();
      await loadData();
      // Per Wagenius flow: User remains on Billing page to review and deliberately click next step!
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update plan");
    } finally {
      setSelectingPlanId(null);
    }
  }

  function isCurrent(plan) {
    // If no plan has been explicitly chosen, no plan should be treated as current
    if (!currentPlan) return false;
    return Boolean(
      (plan._id && currentPlan?._id && String(plan._id) === String(currentPlan._id)) ||
        (plan.slug && currentPlan?.slug && plan.slug === currentPlan.slug)
    );
  }

  function getPrice(plan) {
    if (plan.isFree || plan.pricing?.monthly === 0) return 0;
    return billingCycle === "yearly"
      ? Math.round((plan.pricing?.yearly ?? 0) / 12)
      : (plan.pricing?.monthly ?? 0);
  }

  function getPlanCtaLabel(plan) {
    if (plan.isFree || plan.pricing?.monthly === 0) return "Get Started Free";
    return `Start ${plan.name}`;
  }


  /* ── Derived presentation state for the setup stepper ──────────────── */
  const planStepDone =
    currentPlan || justActivatedPlan || setupStatus === "WHATSAPP_ONBOARDING_REQUIRED" || setupStatus === "READY";
  const whatsappStepActive =
    currentPlan || justActivatedPlan || setupStatus === "WHATSAPP_ONBOARDING_REQUIRED" || setupStatus === "PAYMENT_REQUIRED";
  const showActivatedNotice =
    (currentPlan || justActivatedPlan || setupStatus === "WHATSAPP_ONBOARDING_REQUIRED" || setupStatus === "PAYMENT_REQUIRED") &&
    setupStatus !== "READY";

  /* ── Content Body ───────────────────────────────────────────────────── */
  const content = (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* ── Page header + billing cycle toggle ───────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">
            Choose the plan that fits your business
          </h1>
          <p className="mt-1.5 max-w-2xl text-[15px] text-ink-muted">
            Simple, transparent pricing. Start free and upgrade as you grow. Every plan uses your own WhatsApp Business
            account, with no hidden commission.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Billing cycle"
          className="inline-flex shrink-0 self-start rounded-lg border border-line bg-surface p-1 md:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={billingCycle === "monthly"}
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "h-9 whitespace-nowrap rounded-md px-4 text-[14px] font-medium transition-colors",
              billingCycle === "monthly" ? "bg-brand-900 text-white" : "text-ink-muted hover:bg-canvas hover:text-ink",
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={billingCycle === "yearly"}
            onClick={() => setBillingCycle("yearly")}
            className={cn(
              "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md px-4 text-[14px] font-medium transition-colors",
              billingCycle === "yearly" ? "bg-brand-900 text-white" : "text-ink-muted hover:bg-canvas hover:text-ink",
            )}
          >
            Yearly
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[12px] font-semibold",
                billingCycle === "yearly" ? "bg-white/15 text-white" : "bg-brand-100 text-brand-800",
              )}
            >
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* ── Setup progress (when signed in) ──────────────────────────── */}
      {user && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] text-ink-muted">Company setup progress</p>
              <h2 className="mt-1 text-[17px] font-semibold text-ink">
                {setupStatus === "READY"
                  ? "Setup complete. You have full access to Wagenius."
                  : setupStatus === "PAYMENT_REQUIRED"
                  ? "Step 2: Add a payment method in Meta"
                  : setupStatus === "WHATSAPP_ONBOARDING_REQUIRED" || currentPlan || justActivatedPlan
                  ? "Step 2: Connect your WhatsApp Business account"
                  : "Step 1: Choose a plan"}
              </h2>
            </div>
            {currentPlan ? (
              <Badge tone="brand" className="self-start px-3 py-1 text-[13px]">
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                Current plan: {currentPlan.name}
              </Badge>
            ) : (
              <Badge tone="neutral" className="self-start px-3 py-1 text-[13px]">
                No plan selected
              </Badge>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SetupStep
              number="1"
              title="Choose a plan"
              state={planStepDone ? "done" : "current"}
              caption={
                currentPlan || justActivatedPlan
                  ? `${(justActivatedPlan || currentPlan).name} plan active`
                  : "Pick a plan below"
              }
            />
            <SetupStep
              number="2"
              title="Connect WhatsApp"
              state={setupStatus === "READY" ? "done" : whatsappStepActive ? "current" : "upcoming"}
              caption={
                setupStatus === "READY"
                  ? "Connected and active"
                  : setupStatus === "PAYMENT_REQUIRED"
                  ? "Meta payment method needed"
                  : "Needed to continue"
              }
            />
            <SetupStep
              number="3"
              title="Start using Wagenius"
              state={setupStatus === "READY" ? "done" : "upcoming"}
              lockedIcon={Lock}
              caption={setupStatus === "READY" ? "Full access is on" : "Unlocks after setup"}
            />
          </div>

          {showActivatedNotice && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <p className="text-[14px] font-semibold text-ink">
                  {justActivatedPlan?.name || currentPlan?.name || "Selected"} plan activated
                </p>
                <p className="mt-0.5 text-[14px] text-ink-muted">
                  Your plan is active. Next, connect WhatsApp using the button on your plan card below.
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Plan cards ───────────────────────────────────────────────── */}
      <div id="plan-cards">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-11 w-full" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
            {plans.map((plan) => {
              const current = isCurrent(plan);
              const price = getPrice(plan);
              const bullets = getPlanBullets(plan);

              return (
                <Card
                  key={plan._id}
                  className={cn("relative flex flex-col", current && "border-2 border-brand-600 ring-4 ring-brand-600/10")}
                >
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[19px] font-semibold text-ink">{plan.name}</h3>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                        {current && (
                          <Badge tone="dark">
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            Current plan
                          </Badge>
                        )}
                        {plan.isFree && <Badge tone="brand">Free forever</Badge>}
                      </div>
                    </div>
                    <p className="mt-1.5 min-h-[42px] text-[14px] leading-snug text-ink-muted">{plan.description}</p>

                    {/* Price */}
                    <div className="mt-5 border-b border-line pb-5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[36px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">
                          ₹{price?.toLocaleString()}
                        </span>
                        <span className="text-[14px] text-ink-muted">/ month</span>
                      </div>
                      {billingCycle === "yearly" && plan.pricing?.yearly > 0 && (
                        <p className="mt-2 text-[13px] font-medium text-brand-700">
                          Billed ₹{plan.pricing.yearly.toLocaleString()} once a year
                        </p>
                      )}
                      {billingCycle === "monthly" && !plan.isFree && plan.pricing?.yearly > 0 && (
                        <p className="mt-2 text-[13px] text-ink-muted">
                          or ₹{Math.round(plan.pricing.yearly / 12).toLocaleString()}/month if you pay yearly
                        </p>
                      )}
                    </div>

                    {/* Feature bullets */}
                    <ul className="mt-5 space-y-2.5">
                      {bullets.included.map((item, i) => (
                        <FeatureRow key={i}>{item}</FeatureRow>
                      ))}
                    </ul>
                    {bullets.excluded.length > 0 && (
                      <>
                        <p className="mt-5 border-t border-line pt-4 text-[13px] text-ink-muted">Not included</p>
                        <ul className="mt-2.5 space-y-2">
                          {bullets.excluded.map((item, i) => (
                            <MissingRow key={i}>{item}</MissingRow>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="mt-7">
                    {current && setupStatus !== "READY" ? (
                      <Button
                        size="lg"
                        className="w-full"
                        rightIcon={ArrowRight}
                        onClick={() => navigate("/onboarding/whatsapp")}
                      >
                        Continue to WhatsApp setup
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        variant={current ? "secondary" : "primary"}
                        className={cn(
                          "w-full",
                          current &&
                            "border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-200 hover:bg-brand-50 disabled:opacity-100",
                        )}
                        disabled={current || selectingPlanId === plan._id}
                        loading={selectingPlanId === plan._id}
                        leftIcon={current ? Check : undefined}
                        rightIcon={current ? undefined : ArrowRight}
                        onClick={() => handleSelectPlan(plan)}
                      >
                        {current ? "Your current plan" : getPlanCtaLabel(plan)}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Wagenius plan vs Meta: plain-language explainer ─────────── */}
      <Card>
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Info className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-2">
            <h2 className="text-[17px] font-semibold text-ink">What your plan covers, and what Meta controls</h2>
            <p className="text-[14px] leading-relaxed text-ink-muted">
              <span className="font-medium text-ink">Your Wagenius plan</span> decides which Wagenius features you can
              use and how much you can store: contacts, campaigns, templates, team members and connected WhatsApp
              numbers.
            </p>
            <p className="text-[14px] leading-relaxed text-ink-muted">
              <span className="font-medium text-ink">Meta (WhatsApp)</span> separately decides who you can message,
              how many messages you can send per day, and your account quality. These rules can affect campaign
              delivery. Meta also charges for messages on its own, using its country rate cards.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
              <a
                href="https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits#automatic-scaling"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[14px] font-medium text-brand-700 underline-offset-2 hover:text-brand-900 hover:underline"
              >
                Learn about Meta messaging limits
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://whatsappbusiness.com/products/platform-pricing/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[14px] font-medium text-brand-700 underline-offset-2 hover:text-brand-900 hover:underline"
              >
                View WhatsApp Business Platform pricing
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* ── WhatsApp message charges (Meta) ──────────────────────────── */}
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-ink">WhatsApp message charges (paid to Meta)</h2>
            <p className="mt-1 max-w-2xl text-[14px] text-ink-muted">
              Meta charges for each delivered message, separately from your Wagenius plan. The price depends on the
              customer&apos;s country and the type of message you send.
            </p>
          </div>
          <Badge tone="brand" className="self-start px-3 py-1 text-[13px]">
            <Shield className="h-3.5 w-3.5" />
            0% markup from Wagenius
          </Badge>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetaCategory
            name="Marketing"
            plain="Messages that sell or promote"
            examples="Offers, sale announcements, new product launches and follow-ups to past customers."
          />
          <MetaCategory
            name="Utility"
            plain="Updates about an order or account"
            examples="Receipts, order confirmations, shipping updates and account reminders."
          />
          <MetaCategory
            name="Authentication"
            plain="Login and security codes"
            examples="One-time passwords (OTPs), two-step verification codes and secure logins."
          />
          <MetaCategory
            name="Service"
            plain="Replies when a customer messages you"
            examples="Answering customer questions within 24 hours of their last message."
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-xl bg-canvas p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink">Who pays Meta?</p>
            <p className="mt-0.5 text-[14px] leading-relaxed text-ink-muted">
              You use your own WhatsApp Business account. Once you connect your number, Meta bills the payment method
              in your Meta Business account directly for delivered messages.
            </p>
          </div>
          <a
            href="https://whatsappbusiness.com/products/platform-pricing/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-[14px] font-medium text-brand-700 underline-offset-2 hover:text-brand-900 hover:underline"
          >
            Official Meta rate card
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </Card>

      {/* ── Full feature comparison ──────────────────────────────────── */}
      <section>
        <SectionHeading title="Compare all features" description="Every limit, tool and feature across Wagenius plans." />

        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header row */}
              <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-line bg-[#f6f7f6] text-[13px] font-medium text-ink-muted">
                <div className="px-4 py-3 sm:px-6">Feature</div>
                <div className="px-2 py-3 text-center text-ink">Free</div>
                <div className="px-2 py-3 text-center text-ink">Pro</div>
                <div className="px-2 py-3 text-center text-ink">Enterprise</div>
              </div>

              {COMPARISON_SECTIONS.map((section, si) => {
                const Icon = section.icon;
                return (
                  <div key={si}>
                    <div className="flex items-center gap-2 border-t border-line bg-canvas px-4 py-2.5 sm:px-6">
                      <Icon className="h-4 w-4 text-brand-600" />
                      <span className="text-[14px] font-semibold text-ink">{section.title}</span>
                    </div>
                    {section.rows.map((row, ri) => (
                      <div
                        key={ri}
                        className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-t border-line transition-colors hover:bg-canvas"
                      >
                        <div className="flex items-center px-4 py-3 text-[14px] text-ink sm:px-6">{row.label}</div>
                        <div className="flex items-center justify-center px-2 py-3 text-center">
                          <Cell value={row.free} />
                        </div>
                        <div className="flex items-center justify-center px-2 py-3 text-center">
                          <Cell value={row.pro} />
                        </div>
                        <div className="flex items-center justify-center px-2 py-3 text-center">
                          <Cell value={row.enterprise} />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────────── */}
      <section>
        <SectionHeading
          title="Common questions"
          description="What you need to know about Wagenius plans and Meta message charges."
        />

        <Card padded={false} className="divide-y divide-line overflow-hidden">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium text-ink transition-colors hover:bg-canvas sm:px-6"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-ink-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted" />
                  )}
                </button>
                {isOpen && <div className="px-5 pb-5 text-[14px] leading-relaxed text-ink-muted sm:px-6">{faq.a}</div>}
              </div>
            );
          })}
        </Card>
      </section>
    </div>
  );

  /* ── Public (Unauthenticated) Layout ─────────────────────────────────── */
  if (!user) {
    return (
      <div className="min-h-screen bg-canvas px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex items-center justify-between gap-4 border-b border-line pb-5">
            <button type="button" onClick={() => navigate("/")} className="rounded-lg" aria-label="Wagenius home">
              <Logo />
            </button>
            <Button variant="secondary" size="sm" onClick={() => navigate("/login")}>
              Sign in
            </Button>
          </header>
          {content}
        </div>
      </div>
    );
  }

  /* ── Onboarding Layout (PLAN_SELECTION_REQUIRED or WHATSAPP_ONBOARDING_REQUIRED) ── */
  if (setupStatus !== "READY") {
    return (
      <div className="min-h-screen bg-canvas px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex items-center justify-between gap-4 border-b border-line pb-5">
            <div className="flex min-w-0 items-center gap-3">
              <Logo />
              <Badge tone="neutral" className="hidden sm:inline-flex">
                Account setup
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-[14px] font-medium text-ink">{user?.name || user?.email}</p>
                <p className="text-[13px] text-ink-muted">{user?.email}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={LogOut}
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                Sign out
              </Button>
            </div>
          </header>
          {content}
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Billing & Plans">
      <main className="flex-1 py-4">{content}</main>
    </DashboardLayout>
  );
}
