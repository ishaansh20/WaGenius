import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { fetchPlans } from "../../services/api";
import { cn } from "../../utils/cn";
import Reveal from "./Reveal";

// Shown until /api/plans responds (or if it can't be reached), mirroring
// BACKEND/src/config/seedPlans.js so the page never renders empty.
const FALLBACK_PLANS = [
  {
    slug: "free",
    name: "Free",
    description: "For individuals and businesses getting started with WhatsApp marketing.",
    pricing: { monthly: 0, yearly: 0 },
    limits: { users: 1, contacts: 500, templates: 5, whatsappNumbers: 1 },
    features: { contactImport: false, campaignSchedule: false, ai: false, advancedAnalytics: false, api: false },
  },
  {
    slug: "pro",
    name: "Pro",
    description: "For growing businesses running regular campaigns.",
    pricing: { monthly: 1999, yearly: 19188 },
    limits: { users: 5, contacts: 5000, templates: 100, whatsappNumbers: 1 },
    features: { contactImport: true, campaignSchedule: true, ai: true, advancedAnalytics: true, api: false },
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    description: "For growing teams and businesses with higher-volume WhatsApp requirements.",
    pricing: { monthly: 4999, yearly: 47988 },
    limits: { users: 20, contacts: 50000, templates: 500, whatsappNumbers: 5 },
    features: { contactImport: true, campaignSchedule: true, ai: true, advancedAnalytics: true, api: true },
    isEnterprise: true,
  },
];

const formatLimit = (value) => (value === -1 || value >= 999999 ? "Unlimited" : Number(value).toLocaleString("en-IN"));

function planHighlights(plan) {
  const limits = plan.limits || {};
  const features = plan.features || {};
  const items = [
    `${formatLimit(limits.contacts ?? 0)} contacts`,
    `${formatLimit(limits.users ?? 1)} team ${limits.users === 1 ? "member" : "members"}`,
    `${formatLimit(limits.templates ?? 0)} message templates`,
    "Unlimited campaigns",
  ];
  if (features.contactImport) items.push("Contact import & export");
  if (features.campaignSchedule) items.push("Scheduled campaigns");
  if (features.ai) items.push("AI auto-replies");
  if (features.advancedAnalytics) items.push("Advanced analytics");
  if (features.api) items.push("API & webhooks");
  if ((limits.whatsappNumbers ?? 1) > 1) items.push(`${limits.whatsappNumbers} WhatsApp numbers`);
  return items;
}

export default function PricingTeaser() {
  const [plans, setPlans] = useState(FALLBACK_PLANS);

  useEffect(() => {
    let cancelled = false;
    fetchPlans()
      .then((response) => {
        const list = Array.isArray(response) ? response : response?.data;
        if (!cancelled && Array.isArray(list) && list.length) setPlans(list);
      })
      .catch(() => {
        // Keep the fallback plans.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="pricing" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-brand-600">Pricing</p>
          <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.02em] text-brand-950 sm:text-[44px]">
            Start free. Upgrade when you grow.
          </h2>
          <p className="mt-4 text-[17px] text-ink-muted sm:text-[18px]">
            WhatsApp message charges are billed by Meta directly to your WhatsApp Business account, based on Meta's
            published rates.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const featured = !!plan.isPopular;
            const monthly = plan.pricing?.monthly ?? 0;
            return (
              <Reveal
                key={plan.slug || plan._id || plan.name}
                delay={index * 0.08}
                className={cn(
                  "relative flex flex-col rounded-3xl border p-7",
                  featured ? "border-brand-900 bg-brand-900 text-white" : "border-line bg-surface",
                )}
              >
                {featured && (
                  <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-[12px] font-semibold text-brand-950">
                    Most popular
                  </span>
                )}
                <h3 className={cn("text-[22px] font-semibold", featured ? "text-white" : "text-ink")}>{plan.name}</h3>
                <p className={cn("mt-2 min-h-[48px] text-[15px]", featured ? "text-white/75" : "text-ink-muted")}>
                  {plan.description}
                </p>
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className={cn("font-display text-[44px] font-semibold leading-none tabular-nums", featured ? "text-white" : "text-brand-950")}>
                    {monthly === 0 ? "₹0" : `₹${monthly.toLocaleString("en-IN")}`}
                  </span>
                  <span className={cn("text-[15px]", featured ? "text-white/70" : "text-ink-muted")}>/ month</span>
                </p>
                <Link
                  to="/signup"
                  className={cn(
                    "mt-7 inline-flex h-12 items-center justify-center rounded-xl font-display text-[15px] font-medium transition-colors",
                    featured
                      ? "bg-accent text-brand-950 hover:bg-[#b9e650]"
                      : monthly === 0
                        ? "border border-line-strong text-ink hover:border-ink-subtle"
                        : "bg-brand-900 text-white hover:bg-brand-800",
                  )}
                >
                  {monthly === 0 ? "Start free" : `Choose ${plan.name}`}
                </Link>
                <ul className="mt-7 space-y-3 border-t pt-6 text-[15px] [border-color:inherit]">
                  {planHighlights(plan).map((item) => (
                    <li key={item} className={cn("flex items-start gap-2.5", featured ? "text-white/90" : "text-ink")}>
                      <Check size={16} strokeWidth={2.5} className={cn("mt-0.5 shrink-0", featured ? "text-accent" : "text-brand-600")} />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link to="/pricing" className="inline-flex items-center gap-1.5 font-display text-[16px] font-medium text-brand-700 hover:text-brand-900">
            Compare all plan features <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
