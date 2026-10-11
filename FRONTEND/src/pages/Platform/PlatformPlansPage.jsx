import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Pencil, Power, Check, Layers } from "lucide-react";
import {
  fetchAllPlans,
  createPlan,
  updatePlan,
  togglePlanStatus,
} from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";
import { Badge, Button, Card, EmptyState, Modal, StatCard, StatusPill } from "../../components/ui";

/* ─── Feature flag definitions — mirrors plan.js features object ──────── */
const FEATURE_FIELDS = [
  // Core
  { key: "whatsapp",             label: "WhatsApp Cloud API",          section: "Core" },
  // Contacts
  { key: "contactImport",        label: "Bulk Contact Import",         section: "Contacts" },
  { key: "contactExport",        label: "Contact Export (CSV)",        section: "Contacts" },
  { key: "advancedSegmentation", label: "Advanced Segmentation",       section: "Contacts" },
  // Campaigns
  { key: "campaignSchedule",     label: "Campaign Scheduling",         section: "Campaigns" },
  { key: "campaignPauseResume",  label: "Pause & Resume Campaigns",    section: "Campaigns" },
  // AI
  { key: "ai",                   label: "AI Template Drafting",        section: "AI" },
  // Analytics
  { key: "advancedAnalytics",    label: "Advanced Analytics",          section: "Analytics" },
  { key: "analyticsExport",      label: "Analytics / Report Export",   section: "Analytics" },
  // Team
  { key: "teamManagement",       label: "Team Management",             section: "Team" },
  // Developer
  { key: "api",                  label: "Developer API Access",        section: "Developer" },
  { key: "customWebhooks",       label: "Custom Webhooks",             section: "Developer" },
];

const EMPTY_FEATURES = Object.fromEntries(FEATURE_FIELDS.map(({ key }) => [key, false]));

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  monthly: 0,
  yearly: 0,
  users: 1,
  contacts: 500,
  campaigns: 5,
  templates: 5,
  whatsappNumbers: 1,
  isFree: false,
  isTrial: false,
  isPopular: false,
  isEnterprise: false,
  trialDays: 0,
  restrictions: [],
  ...EMPTY_FEATURES,
};

function toPayload(form) {
  const features = Object.fromEntries(FEATURE_FIELDS.map(({ key }) => [key, !!form[key]]));
  return {
    name: form.name,
    slug: form.slug,
    description: form.description,
    pricing: { monthly: Number(form.monthly), yearly: Number(form.yearly) },
    limits: {
      users: Number(form.users),
      contacts: Number(form.contacts),
      campaigns: Number(form.campaigns),
      templates: Number(form.templates),
      whatsappNumbers: Number(form.whatsappNumbers),
    },
    isFree: !!form.isFree,
    isTrial: !!form.isTrial,
    isPopular: !!form.isPopular,
    isEnterprise: !!form.isEnterprise,
    trialDays: Number(form.trialDays),
    restrictions:
      typeof form.restrictions === "string"
        ? form.restrictions.split("\n").map((s) => s.trim()).filter(Boolean)
        : Array.isArray(form.restrictions)
        ? form.restrictions
        : [],
    features,
  };
}

function fromPlan(plan) {
  const features = Object.fromEntries(
    FEATURE_FIELDS.map(({ key }) => [key, !!plan.features?.[key]]),
  );
  return {
    name: plan.name,
    slug: plan.slug,
    description: plan.description || "",
    monthly: plan.pricing?.monthly ?? 0,
    yearly: plan.pricing?.yearly ?? 0,
    users: plan.limits?.users ?? 1,
    contacts: plan.limits?.contacts ?? 500,
    campaigns: plan.limits?.campaigns ?? 5,
    templates: plan.limits?.templates ?? 5,
    whatsappNumbers: plan.limits?.whatsappNumbers ?? 1,
    isFree: !!plan.isFree,
    isTrial: !!plan.isTrial,
    isPopular: !!plan.isPopular,
    isEnterprise: !!plan.isEnterprise,
    trialDays: plan.trialDays ?? 0,
    restrictions: Array.isArray(plan.restrictions) ? plan.restrictions.join("\n") : "",
    ...features,
  };
}

/* ─── Brand switch (checkbox underneath, keeps onChange semantics) ───── */
function Switch({ checked, onChange, label, desc }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 transition hover:bg-canvas">
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-ink">{label}</span>
        {desc && <span className="mt-0.5 block text-[13px] text-ink-muted">{desc}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <span className="h-5 w-9 rounded-full bg-[#d5dad6] transition peer-checked:bg-brand-600 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-600/20" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

/* ─── Grouped feature toggles ─────────────────────────────────────────── */
function FeatureSection({ form, set }) {
  const sections = [...new Set(FEATURE_FIELDS.map((f) => f.section))];
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">Features</h3>
        <p className="mt-0.5 text-[13px] text-ink-muted">Turn on what companies on this plan can use.</p>
      </div>
      {sections.map((section) => (
        <div key={section}>
          <p className="mb-2 text-[13px] font-medium text-ink-muted">{section}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {FEATURE_FIELDS.filter((f) => f.section === section).map(({ key, label }) => (
              <Switch key={key} label={label} checked={!!form[key]} onChange={(e) => set(key, e.target.checked)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const INPUT =
  "h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[14px] text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-subtle";
const TEXTAREA =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-3 text-[14px] leading-relaxed text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12";

/* ─── Plan Form Modal ─────────────────────────────────────────────────── */
function PlanFormModal({ open, initial, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ? fromPlan(initial) : emptyForm);
  }, [initial, open]);

  if (!open) return null;

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = toPayload(form);
      if (initial) {
        await updatePlan(initial._id, payload);
        toast.success("Plan updated successfully");
      } else {
        await createPlan(payload);
        toast.success("Plan created successfully");
      }
      onSaved();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={initial ? "Edit plan" : "Create plan"}
      description="Set the price, usage limits and features for this plan."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="platform-plan-form" loading={saving} disabled={saving}>
            {saving ? "Saving..." : initial ? "Save changes" : "Create plan"}
          </Button>
        </>
      }
    >
      <form id="platform-plan-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Plan name">
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={INPUT} placeholder="e.g. Free, Pro" />
          </FormField>
          <FormField label="Slug" help="Unique ID used in code and URLs.">
            <input required value={form.slug} onChange={(e) => set("slug", e.target.value)} className={INPUT} placeholder="e.g. free, pro, enterprise" />
          </FormField>
        </div>

        <FormField label="Description">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={TEXTAREA}
            rows={2}
            placeholder="Brief summary of who this plan is for"
          />
        </FormField>

        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { key: "isFree", label: "Free forever", desc: "₹0, always free" },
            { key: "isTrial", label: "Includes free trial", desc: "Trial period before billing" },
            { key: "isPopular", label: "Most popular badge", desc: "Highlighted on pricing page" },
            { key: "isEnterprise", label: "Enterprise tier", desc: "Marks this as the Enterprise plan" },
          ].map(({ key, label, desc }) => (
            <Switch key={key} label={label} desc={desc} checked={!!form[key]} onChange={(e) => set(key, e.target.checked)} />
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-[15px] font-semibold text-ink">Pricing</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Monthly price (₹)">
              <input type="number" value={form.monthly} onChange={(e) => set("monthly", e.target.value)} className={INPUT} disabled={form.isFree} />
            </FormField>
            <FormField label="Yearly price (₹)">
              <input type="number" value={form.yearly} onChange={(e) => set("yearly", e.target.value)} className={INPUT} disabled={form.isFree} />
            </FormField>
            <FormField label="Trial days">
              <input type="number" value={form.trialDays} onChange={(e) => set("trialDays", e.target.value)} className={INPUT} placeholder="0" />
            </FormField>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[15px] font-semibold text-ink">Usage limits</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Team members">
              <input type="number" value={form.users} onChange={(e) => set("users", e.target.value)} className={INPUT} />
            </FormField>
            <FormField label="Contacts">
              <input type="number" value={form.contacts} onChange={(e) => set("contacts", e.target.value)} className={INPUT} />
            </FormField>
            <FormField label="Campaigns / month">
              <input type="number" value={form.campaigns} onChange={(e) => set("campaigns", e.target.value)} className={INPUT} />
            </FormField>
            <FormField label="Templates">
              <input type="number" value={form.templates} onChange={(e) => set("templates", e.target.value)} className={INPUT} />
            </FormField>
            <FormField label="WhatsApp numbers" help="Use -1 for multiple / custom.">
              <input
                type="number"
                value={form.whatsappNumbers}
                onChange={(e) => set("whatsappNumbers", e.target.value)}
                className={INPUT}
                title="-1 = multiple/custom (Enterprise)"
              />
            </FormField>
          </div>
        </div>

        <FeatureSection form={form} set={set} />

        <FormField label="Custom feature bullets" help="Optional. One per line, shown on the pricing page.">
          <textarea
            value={form.restrictions}
            onChange={(e) => set("restrictions", e.target.value)}
            className={`${TEXTAREA} font-mono`}
            rows={3}
            placeholder={"e.g.\n500 Contacts Limit\nStandard WhatsApp Cloud API"}
          />
        </FormField>
      </form>
    </Modal>
  );
}

function FormField({ label, help, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[13px] font-medium text-ink">{label}</span>
      {children}
      {help && <span className="block text-[13px] text-ink-muted">{help}</span>}
    </label>
  );
}

/* ─── Feature flag summary chip ───────────────────────────────────────── */
function FeatureChips({ plan }) {
  const enabled = FEATURE_FIELDS.filter(({ key }) => plan.features?.[key]).map((f) => f.label);
  const limit = 4;
  if (enabled.length === 0) {
    return <p className="text-[13px] text-ink-muted">No features turned on</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {enabled.slice(0, limit).map((label) => (
        <Badge key={label} tone="brand">
          <Check size={12} />
          {label}
        </Badge>
      ))}
      {enabled.length > limit && <Badge>+{enabled.length - limit} more</Badge>}
    </div>
  );
}

function LimitRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 text-[14px]">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium tabular-nums text-ink">{value}</span>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────── */
export default function PlatformPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  async function loadPlans() {
    try {
      setLoading(true);
      const res = await fetchAllPlans();
      setPlans(res.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  async function handleToggle(plan) {
    try {
      await togglePlanStatus(plan._id);
      toast.success(plan.isActive ? "Plan deactivated" : "Plan activated");
      loadPlans();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update plan");
    }
  }

  const activeCount = plans.filter((p) => p.isActive).length;

  return (
    <PlatformLayout
      title="Plans"
      description="Set pricing, usage limits and features for each plan. Changes apply to new subscriptions right away."
      actions={
        <Button
          leftIcon={Plus}
          onClick={() => {
            setEditingPlan(null);
            setModalOpen(true);
          }}
        >
          Create plan
        </Button>
      }
    >
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand-600" />
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No plans yet"
          description="Create your first plan so companies can subscribe."
          action={
            <Button
              leftIcon={Plus}
              onClick={() => {
                setEditingPlan(null);
                setModalOpen(true);
              }}
            >
              Create plan
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total plans" value={plans.length} icon={Layers} />
            <StatCard label="Active plans" value={activeCount} icon={Power} />
            <StatCard label="Inactive plans" value={plans.length - activeCount} icon={Power} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan._id}
                className={`flex flex-col ${plan.isPopular ? "border-brand-600 ring-1 ring-brand-600/30" : ""} ${plan.isActive ? "" : "bg-canvas"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[17px] font-semibold text-ink">{plan.name}</h2>
                    <p className="mt-0.5 truncate font-mono text-[13px] text-ink-muted">{plan.slug}</p>
                  </div>
                  <StatusPill status={plan.isActive ? "active" : "inactive"} />
                </div>

                {(plan.isFree || plan.isPopular || plan.isEnterprise) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {plan.isFree && <Badge>Free forever</Badge>}
                    {plan.isPopular && <Badge tone="brand">Most popular</Badge>}
                    {plan.isEnterprise && <Badge>Enterprise</Badge>}
                  </div>
                )}

                <p className="mt-4 text-[30px] font-semibold tracking-[-0.02em] tabular-nums text-ink">
                  {plan.isFree || plan.pricing?.monthly === 0
                    ? "₹0"
                    : `₹${(plan.pricing?.monthly ?? 0).toLocaleString()}`}
                  <span className="ml-1 text-[14px] font-normal tracking-normal text-ink-muted">/month</span>
                </p>

                <div className="mt-4 divide-y divide-line border-y border-line">
                  <LimitRow label="Team members" value={plan.limits?.users ?? 1} />
                  <LimitRow label="Contacts" value={(plan.limits?.contacts ?? 0).toLocaleString()} />
                  <LimitRow label="Campaigns / month" value={plan.limits?.campaigns ?? 0} />
                  <LimitRow label="Templates" value={plan.limits?.templates ?? 0} />
                  <LimitRow
                    label={`WhatsApp number${plan.limits?.whatsappNumbers !== 1 ? "s" : ""}`}
                    value={plan.limits?.whatsappNumbers === -1 ? "Multiple" : plan.limits?.whatsappNumbers ?? 1}
                  />
                </div>

                <div className="mt-4 flex-1">
                  <FeatureChips plan={plan} />
                </div>

                <div className="mt-5 flex gap-2">
                  <Button
                    variant="secondary"
                    leftIcon={Pencil}
                    className="flex-1"
                    onClick={() => {
                      setEditingPlan(plan);
                      setModalOpen(true);
                    }}
                  >
                    Edit plan
                  </Button>
                  <Button
                    variant={plan.isActive ? "danger-ghost" : "secondary"}
                    leftIcon={Power}
                    className="flex-1"
                    onClick={() => handleToggle(plan)}
                  >
                    {plan.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <PlanFormModal
        open={modalOpen}
        initial={editingPlan}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          loadPlans();
        }}
      />
    </PlatformLayout>
  );
}
