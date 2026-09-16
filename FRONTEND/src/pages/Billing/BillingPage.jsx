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
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Users,
  BarChart3,
  Smartphone,
  Layers,
} from "lucide-react";
import {
  fetchPlans,
  fetchPlanAccess,
  selectPlan,
} from "../../services/api";
import useAuthStore from "../../store/authStore";
import useSubscriptionStore from "../../store/subscriptionStore";
import DashboardLayout from "../../components/layout/DashboardLayout";

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
      <span className="inline-flex items-center justify-center">
        <Check className="h-4 w-4 text-emerald-600 stroke-[2.5]" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center">
        <Minus className="h-4 w-4 text-slate-300" />
      </span>
    );
  }
  return <span className="text-xs font-semibold text-slate-800">{value}</span>;
}

/* ─── Card Feature Row Helpers ────────────────────────────────────────── */
function FeatureRow({ children }) {
  return (
    <li className="flex items-start gap-2 text-slate-700">
      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
      <span className="text-xs font-medium leading-snug">{children}</span>
    </li>
  );
}

function MissingRow({ children }) {
  return (
    <li className="flex items-start gap-2 text-slate-400">
      <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <span className="text-xs leading-snug">{children}</span>
    </li>
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

  /* ── Content Body ───────────────────────────────────────────────────── */
  const content = (
    <div className="space-y-10 pb-20">
      {/* ── Setup Progress & Activation Banner (When Authenticated) ─── */}
      {user && (
        <div className="max-w-5xl mx-auto pt-1 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  Company Setup Progress
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {setupStatus === "READY"
                    ? "Setup Complete • Full Platform Access Active"
                    : setupStatus === "PAYMENT_REQUIRED"
                    ? "Step 2: Add Payment Method in Meta"
                    : setupStatus === "WHATSAPP_ONBOARDING_REQUIRED" || currentPlan || justActivatedPlan
                    ? "Step 2: Connect WhatsApp Business Account"
                    : "Step 1: Select a Subscription Plan"}
                </h2>
              </div>
              {currentPlan ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Current Plan: {currentPlan.name}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
                  <span>No Plan Selected</span>
                </div>
              )}
            </div>

            {/* 3 Step Indicator */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Step 1: Plan Selection */}
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                  currentPlan || justActivatedPlan || setupStatus === "WHATSAPP_ONBOARDING_REQUIRED" || setupStatus === "READY"
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                    : "bg-blue-50/70 border-blue-300 text-blue-950 ring-2 ring-blue-500/20"
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    currentPlan || justActivatedPlan || setupStatus === "WHATSAPP_ONBOARDING_REQUIRED" || setupStatus === "READY"
                      ? "bg-emerald-600 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {currentPlan || justActivatedPlan || setupStatus === "WHATSAPP_ONBOARDING_REQUIRED" || setupStatus === "READY" ? (
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  ) : (
                    "1"
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight">1. Plan Selection</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {currentPlan || justActivatedPlan
                      ? `${(justActivatedPlan || currentPlan).name} Active`
                      : "Choose a plan below"}
                  </p>
                </div>
              </div>

              {/* Step 2: WhatsApp Onboarding */}
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                  setupStatus === "READY"
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                    : currentPlan || justActivatedPlan || setupStatus === "WHATSAPP_ONBOARDING_REQUIRED" || setupStatus === "PAYMENT_REQUIRED"
                    ? "bg-amber-50/70 border-amber-300 text-amber-950 ring-2 ring-amber-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    setupStatus === "READY"
                      ? "bg-emerald-600 text-white"
                      : currentPlan || justActivatedPlan || setupStatus === "WHATSAPP_ONBOARDING_REQUIRED" || setupStatus === "PAYMENT_REQUIRED"
                      ? "bg-amber-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {setupStatus === "READY" ? (
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  ) : (
                    "2"
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight">2. WhatsApp Setup</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {setupStatus === "READY"
                      ? "Connected & Active"
                      : setupStatus === "PAYMENT_REQUIRED"
                      ? "Meta Payment Required"
                      : "Required to proceed"}
                  </p>
                </div>
              </div>

              {/* Step 3: Platform Access */}
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                  setupStatus === "READY"
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    setupStatus === "READY"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {setupStatus === "READY" ? (
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  ) : (
                    <Shield className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight">3. Platform Access</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {setupStatus === "READY" ? "Full Access Active" : "Locked"}
                  </p>
                </div>
              </div>
            </div>

            {/* Plan Activated Notice */}
            {(currentPlan || justActivatedPlan || setupStatus === "WHATSAPP_ONBOARDING_REQUIRED" || setupStatus === "PAYMENT_REQUIRED") && setupStatus !== "READY" && (
              <div className="mt-3 p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 shadow-sm flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-200" />
                <div>
                  <p className="text-xs font-bold text-emerald-950">
                    ✓ {(justActivatedPlan?.name || currentPlan?.name || "Selected")} Plan Activated
                  </p>
                  <p className="text-[11.5px] text-slate-600 leading-tight">
                    Your subscription plan has been successfully activated. Continue to WhatsApp Onboarding on your plan card below.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section 1: Hero ─────────────────────────────────────────────── */}
      <div className="text-center max-w-3xl mx-auto pt-2 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Simple, transparent pricing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Choose the plan that fits your business
        </h1>
        <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
          Start free and upgrade as you grow. All plans connect your own WhatsApp Business API with zero hidden commissions.
        </p>

        {/* Billing Toggle */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                billingCycle === "yearly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Annual</span>
              <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wide">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 2: 3-Plan Cards ──────────────────────────────────────── */}
      <div id="plan-cards" className="max-w-6xl mx-auto px-1">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {plans.map((plan) => {
              const current = isCurrent(plan);
              const price = getPrice(plan);
              const bullets = getPlanBullets(plan);

              return (
                <div
                  key={plan._id}
                  className={`group relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    current
                      ? "border-2 border-emerald-500 bg-white shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/20"
                      : "border border-slate-200 bg-white shadow-sm hover:border-slate-300"
                  }`}
                >
                  {/* Current Active Plan Badge */}
                  {current && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md flex items-center gap-1.5 whitespace-nowrap">
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      Current Plan
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900">{plan.name}</h3>
                        <p className="mt-1 text-xs text-slate-500 leading-snug min-h-[32px]">{plan.description}</p>
                      </div>
                      {plan.isFree && (
                        <span className="shrink-0 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 mt-1">
                          Free Forever
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mt-5 pb-5 border-b border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl sm:text-5xl font-black text-slate-950">
                          ₹{price?.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">/month</span>
                      </div>
                      {billingCycle === "yearly" && plan.pricing?.yearly > 0 && (
                        <p className="mt-1.5 text-[11.5px] text-emerald-600 font-semibold">
                          Billed ₹{plan.pricing.yearly.toLocaleString()} annually
                        </p>
                      )}
                      {billingCycle === "monthly" && !plan.isFree && plan.pricing?.yearly > 0 && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          or ₹{Math.round(plan.pricing.yearly / 12).toLocaleString()}/mo billed annually
                        </p>
                      )}
                    </div>

                    {/* Feature Bullets */}
                    <div className="mt-5 space-y-2">
                      <ul className="space-y-2">
                        {bullets.included.map((item, i) => (
                          <FeatureRow key={i}>{item}</FeatureRow>
                        ))}
                      </ul>
                      {bullets.excluded.length > 0 && (
                        <ul className="mt-3 space-y-1.5 pt-3 border-t border-slate-100">
                          {bullets.excluded.map((item, i) => (
                            <MissingRow key={i}>{item}</MissingRow>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-8 pt-4">
                    {current && setupStatus !== "READY" ? (
                      <button
                        type="button"
                        onClick={() => navigate("/onboarding/whatsapp")}
                        className="w-full py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/25 active:scale-[0.98] shadow-md cursor-pointer"
                      >
                        <span>Continue to WhatsApp Onboarding</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={current || selectingPlanId === plan._id}
                        onClick={() => handleSelectPlan(plan)}
                        className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
                          current
                            ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-400/50 cursor-default shadow-none"
                            : "bg-slate-900 text-white hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-[0.98]"
                        }`}
                      >
                        {selectingPlanId === plan._id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : current ? (
                          <>
                            <Check className="h-4 w-4 stroke-[2.5]" />
                            <span>Current Plan</span>
                          </>
                        ) : (
                          <>
                            <span>{getPlanCtaLabel(plan)}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Meta Messaging Limits & Platform Separation Notice ─────────── */}
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 h-10 w-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
              <Info className="h-5 w-5 text-blue-700" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-blue-950">
                WhatsApp Messaging & Meta Platform Limits
              </h3>
              <p className="text-xs text-blue-900 leading-relaxed">
                Your Wagenius subscription plan controls access to <strong>Wagenius features and platform resource limits</strong> such as contacts, monthly campaigns, templates, team users, and connected WhatsApp numbers.
              </p>
              <p className="text-xs text-blue-800 leading-relaxed">
                WhatsApp message delivery, business messaging eligibility, account quality requirements, and any applicable Meta limits are controlled independently by Meta and may affect campaign delivery. Meta messaging charges are also billed separately according to Meta's applicable pricing rules and country rate cards.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <a
                  href="https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits#automatic-scaling"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:text-blue-950 underline underline-offset-2"
                >
                  Learn about Meta WhatsApp messaging limits
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="https://whatsappbusiness.com/products/platform-pricing/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:text-blue-950 underline underline-offset-2"
                >
                  View WhatsApp Business Platform Pricing
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: WhatsApp Messaging Charges (Meta Overview) ───────── */}
      <div className="max-w-5xl mx-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">WhatsApp Messaging Charges</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Direct Meta Per-Delivered-Message Pricing
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Meta charges separately for WhatsApp Business Platform usage. Charges depend on recipient country and message category.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 shrink-0">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span>0% Commission Markup by Wagenius</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Marketing</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Meta Category
              </span>
            </div>
            <p className="mt-2.5 text-xs text-slate-700 leading-relaxed">
              Promotions, offers, announcements, retargeting campaigns, and new product launches.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900">Utility</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Meta Category
              </span>
            </div>
            <p className="mt-2.5 text-xs text-slate-700 leading-relaxed">
              Transaction receipts, order confirmations, shipping updates, and account reminders.
            </p>
          </div>

          <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900">Authentication</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Meta Category
              </span>
            </div>
            <p className="mt-2.5 text-xs text-slate-700 leading-relaxed">
              One-Time Passwords (OTPs), 2-factor authentication codes, and secure account logins.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">Service</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Meta Category
              </span>
            </div>
            <p className="mt-2.5 text-xs text-slate-700 leading-relaxed">
              User-initiated customer inquiries and support replies within active 24-hour service windows.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-start justify-between gap-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600">
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">Bring Your Own WhatsApp Business API (BYO-WABA)</p>
            <p className="text-[11.5px] leading-relaxed">
              When you connect your WhatsApp number via Embedded Signup, your Meta Business Manager payment method is billed directly by Meta for message deliveries.
            </p>
          </div>
          <a
            href="https://whatsappbusiness.com/products/platform-pricing/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 underline"
          >
            Official Meta Rate Card
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* ── Section 4: Detailed Comparison Table ────────────────────────── */}
      <div className="max-w-5xl mx-auto space-y-3">
        <div className="text-center space-y-1 pb-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Full Feature Comparison</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Compare all limits, tools, and capabilities across Wagenius plans.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {/* Header Row */}
          <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 font-bold">
            <div className="py-4 px-4 sm:px-6 text-xs text-slate-500 uppercase tracking-wider">
              Feature
            </div>
            <div className="py-4 px-2 text-center text-xs font-black text-slate-900 uppercase">
              Free
            </div>
            <div className="py-4 px-2 text-center text-xs font-black text-slate-900 uppercase">
              Pro
            </div>
            <div className="py-4 px-2 text-center text-xs font-black text-slate-900 uppercase">
              Enterprise
            </div>
          </div>

          {COMPARISON_SECTIONS.map((section, si) => {
            const Icon = section.icon;
            return (
              <div key={si}>
                <div className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-slate-50/90 border-t border-slate-200/80">
                  <Icon className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                    {section.title}
                  </span>
                </div>
                {section.rows.map((row, ri) => (
                  <div
                    key={ri}
                    className={`grid grid-cols-4 border-t border-slate-100 hover:bg-slate-50/50 transition ${
                      ri % 2 === 0 ? "" : "bg-slate-50/20"
                    }`}
                  >
                    <div className="px-4 sm:px-6 py-3 text-xs text-slate-700 flex items-center font-medium">
                      {row.label}
                    </div>
                    <div className="py-3 flex items-center justify-center text-center">
                      <Cell value={row.free} />
                    </div>
                    <div className="py-3 flex items-center justify-center text-center">
                      <Cell value={row.pro} />
                    </div>
                    <div className="py-3 flex items-center justify-center text-center">
                      <Cell value={row.enterprise} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 5: FAQs ─────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Everything you need to know about Wagenius plans and Meta platform charges.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left font-semibold text-slate-800 text-sm hover:bg-slate-50/50"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ── Public (Unauthenticated) Layout ─────────────────────────────────── */
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between pb-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <div className="h-9 w-9 rounded-xl bg-slate-950 flex items-center justify-center text-white font-black text-sm shadow-md">
                WA
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">Wagenius</span>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="text-xs font-semibold text-slate-700 hover:text-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
            >
              Sign In
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  /* ── Onboarding Layout (PLAN_SELECTION_REQUIRED or WHATSAPP_ONBOARDING_REQUIRED) ── */
  if (setupStatus !== "READY") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between pb-6 border-b border-slate-200/60 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-slate-950 flex items-center justify-center text-white font-black text-sm shadow-md">
                WA
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">Wagenius</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                  Account Setup
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-800">{user?.name || user?.email}</p>
                <p className="text-[11px] text-slate-500">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="text-xs font-semibold text-slate-700 hover:text-red-700 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 shadow-sm transition"
              >
                Sign Out
              </button>
            </div>
          </div>
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
