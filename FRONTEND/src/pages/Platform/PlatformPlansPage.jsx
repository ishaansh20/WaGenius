import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Pencil, Power, X, Check } from "lucide-react";
import {
  fetchAllPlans,
  createPlan,
  updatePlan,
  togglePlanStatus,
} from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";

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

/* ─── Grouped feature toggles ─────────────────────────────────────────── */
function FeatureSection({ form, set }) {
  const sections = [...new Set(FEATURE_FIELDS.map((f) => f.section))];
  return (
    <div className="space-y-3">
      <span className="block text-xs font-semibold text-[#2A4A68]">Feature Flags</span>
      {sections.map((section) => (
        <div key={section}>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#8DA3B8] mb-1.5">{section}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {FEATURE_FIELDS.filter((f) => f.section === section).map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-xl border border-[#C5D1DE] bg-[#F5F8FB] px-3 py-2 text-xs font-medium text-[#3D5F7E] hover:bg-[#EFF3F8] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={!!form[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="rounded text-[#1A3652] focus:ring-[#8DA3B8]"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#C5D1DE] bg-[#F5F8FB] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-[#C5D1DE] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#1A3652]">
              {initial ? "Edit Subscription Plan" : "Create Subscription Plan"}
            </h3>
            <p className="text-xs text-[#6B8BA5]">
              Configure pricing, limits, UI flags, and feature restrictions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8DA3B8] hover:bg-[#EFF3F8] hover:text-[#3D5F7E]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan Name">
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="input"
                placeholder="e.g. Free, Pro"
              />
            </Field>
            <Field label="Slug (Unique Identifier)">
              <input
                required
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                className="input"
                placeholder="e.g. free, pro, enterprise"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="input"
              rows={2}
              placeholder="Brief summary of who this plan is for"
            />
          </Field>

          {/* UI / plan-type flags */}
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#C5D1DE] bg-[#EFF3F8] p-3">
            {[
              { key: "isFree",       label: "Free Forever",       desc: "₹0, always free" },
              { key: "isTrial",      label: "Includes Free Trial", desc: "Trial period before billing" },
              { key: "isPopular",    label: "Most Popular Badge",  desc: "Highlighted on pricing page" },
              { key: "isEnterprise", label: "Enterprise Tier",     desc: "Designates Enterprise tier plan" },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={!!form[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#B5C5D5] text-[#1A3652] focus:ring-[#8DA3B8]"
                />
                <div>
                  <span className="text-xs font-semibold text-[#1A3652]">{label}</span>
                  <p className="text-[11px] text-[#6B8BA5]">{desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Monthly Price (₹)">
              <input
                type="number"
                value={form.monthly}
                onChange={(e) => set("monthly", e.target.value)}
                className="input"
                disabled={form.isFree}
              />
            </Field>
            <Field label="Yearly Price (₹)">
              <input
                type="number"
                value={form.yearly}
                onChange={(e) => set("yearly", e.target.value)}
                className="input"
                disabled={form.isFree}
              />
            </Field>
            <Field label="Trial Days">
              <input
                type="number"
                value={form.trialDays}
                onChange={(e) => set("trialDays", e.target.value)}
                className="input"
                placeholder="0"
              />
            </Field>
          </div>

          {/* Limits */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8DA3B8] mb-2">Usage Limits</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Max Team Members">
                <input type="number" value={form.users} onChange={(e) => set("users", e.target.value)} className="input" />
              </Field>
              <Field label="Max Contacts">
                <input type="number" value={form.contacts} onChange={(e) => set("contacts", e.target.value)} className="input" />
              </Field>
              <Field label="Campaigns / month">
                <input type="number" value={form.campaigns} onChange={(e) => set("campaigns", e.target.value)} className="input" />
              </Field>
              <Field label="Max Templates">
                <input type="number" value={form.templates} onChange={(e) => set("templates", e.target.value)} className="input" />
              </Field>
              <Field label="WhatsApp Numbers">
                <input
                  type="number"
                  value={form.whatsappNumbers}
                  onChange={(e) => set("whatsappNumbers", e.target.value)}
                  className="input"
                  title="-1 = multiple/custom (Enterprise)"
                />
              </Field>
            </div>
          </div>

          {/* Feature flags — grouped by section */}
          <FeatureSection form={form} set={set} />

          {/* Restrictions / custom bullets */}
          <Field label="Custom Feature Bullets (one per line, optional)">
            <textarea
              value={form.restrictions}
              onChange={(e) => set("restrictions", e.target.value)}
              className="input font-mono text-xs"
              rows={3}
              placeholder={"e.g.\n500 Contacts Limit\nStandard WhatsApp Cloud API"}
            />
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#C5D1DE] bg-[#EFF3F8] py-2.5 text-xs font-semibold text-[#4A6580] transition hover:bg-[#D4DEE9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-[#2E5C8A] py-2.5 text-xs font-semibold text-white transition hover:bg-[#1E4A73] disabled:opacity-50"
            >
              {saving ? "Saving..." : initial ? "Save Changes" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#4A6580]">{label}</span>
      {children}
    </label>
  );
}

/* ─── Feature flag summary chip ───────────────────────────────────────── */
function FeatureChips({ plan }) {
  const enabled = FEATURE_FIELDS.filter(({ key }) => plan.features?.[key]).map((f) => f.label);
  const limit = 4;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {enabled.slice(0, limit).map((label) => (
        <span key={label} className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          <Check className="h-2.5 w-2.5" />
          {label}
        </span>
      ))}
      {enabled.length > limit && (
        <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500">
          +{enabled.length - limit} more
        </span>
      )}
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

  return (
    <PlatformLayout
      title="Plans & Tiers"
      description="Configure subscription tiers, usage limits, pricing, and feature flags. Changes take effect immediately for new subscriptions."
      actions={
        <button
          onClick={() => {
            setEditingPlan(null);
            setModalOpen(true);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#2E5C8A] px-3.5 text-xs font-semibold text-white transition hover:bg-[#1E4A73] shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Plan
        </button>
      }
    >
      <style>{`.input{width:100%;border:1px solid #C5D1DE;background:#EFF3F8;border-radius:0.75rem;padding:0.5rem 0.75rem;font-size:0.8125rem;outline:none;color:#2E5C8A}.input:focus{border-color:#2E5C8A;background:#fff}`}</style>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C5D1DE] border-t-[#2E5C8A]" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`rounded-2xl border bg-[#F5F8FB] p-5 shadow-sm transition hover:border-[#B5C5D5] ${
                plan.isPopular ? "border-emerald-300 ring-1 ring-emerald-200" : "border-[#C5D1DE]"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#1A3652]">{plan.name}</h3>
                  <p className="text-xs text-[#8DA3B8]">{plan.slug}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      plan.isActive
                        ? "border-[#C5D1DE] bg-[#D9E4EE] text-[#2A4A68]"
                        : "border-[#C5D1DE] bg-[#D4DEE9] text-[#6B8BA5]"
                    }`}
                  >
                    {plan.isActive ? "Active" : "Inactive"}
                  </span>
                  {plan.isFree && (
                    <span className="rounded-full border border-[#B5C5D5] bg-[#EFF3F8] px-2 py-0.5 text-[9px] font-bold text-[#2A4A68]">
                      Free Forever
                    </span>
                  )}
                  {plan.isPopular && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                      ⭐ Most Popular
                    </span>
                  )}
                  {plan.isEnterprise && (
                    <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[9px] font-bold text-purple-700">
                      Enterprise
                    </span>
                  )}
                </div>
              </div>

              {/* Price */}
              <p className="mt-3 text-2xl font-bold tracking-tight text-[#0F2940]">
                {plan.isFree || plan.pricing?.monthly === 0
                  ? "₹0"
                  : `₹${(plan.pricing?.monthly ?? 0).toLocaleString()}`}
                <span className="text-xs font-normal text-[#6B8BA5]">/month</span>
              </p>

              {/* Limits summary */}
              <ul className="mt-3 space-y-1 text-xs text-[#4A6580]">
                <li><strong className="text-[#1A3652]">{plan.limits?.users ?? 1}</strong> Team Members</li>
                <li><strong className="text-[#1A3652]">{(plan.limits?.contacts ?? 0).toLocaleString()}</strong> Contacts</li>
                <li><strong className="text-[#1A3652]">{plan.limits?.campaigns ?? 0}</strong> Campaigns/mo</li>
                <li><strong className="text-[#1A3652]">{plan.limits?.templates ?? 0}</strong> Templates</li>
                <li>
                  <strong className="text-[#1A3652]">
                    {plan.limits?.whatsappNumbers === -1 ? "Multiple" : plan.limits?.whatsappNumbers ?? 1}
                  </strong>{" "}
                  WhatsApp Number{plan.limits?.whatsappNumbers !== 1 ? "s" : ""}
                </li>
              </ul>

              {/* Feature flags summary */}
              <FeatureChips plan={plan} />

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { setEditingPlan(plan); setModalOpen(true); }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#C5D1DE] bg-[#EFF3F8] py-2 text-xs font-medium text-[#3D5F7E] hover:bg-[#D4DEE9]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleToggle(plan)}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium ${
                    plan.isActive
                      ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      : "border-[#C5D1DE] bg-[#EFF3F8] text-[#2A4A68] hover:bg-[#D4DEE9]"
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                  {plan.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
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
