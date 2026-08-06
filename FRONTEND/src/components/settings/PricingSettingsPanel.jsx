import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { fetchPricingConfig, updatePricingConfig } from "../../services/api";

const FIELD_CLASS =
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100";

const LABEL_CLASS = "mb-1.5 block text-[12px] font-medium text-slate-700";

const RATE_FIELDS = [
  { key: "marketing", label: "Marketing", hint: "Promotions, offers, announcements" },
  { key: "utility", label: "Utility", hint: "Order updates, reminders, notifications" },
  { key: "authentication", label: "Authentication", hint: "One-time login codes" },
  { key: "service", label: "Service", hint: "Plain-text replies with no template" },
];

export default function PricingSettingsPanel() {
  const [currency, setCurrency] = useState("INR");
  const [rates, setRates] = useState({ marketing: 0, utility: 0, authentication: 0, service: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetchPricingConfig();
      setCurrency(res.config.currency || "INR");
      setRates(res.config.rates || { marketing: 0, utility: 0, authentication: 0, service: 0 });
    } catch {
      toast.error("Failed to load pricing settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await updatePricingConfig({ currency, rates });
      toast.success("Pricing updated");
    } catch {
      toast.error("Failed to update pricing");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-[14px] font-semibold text-slate-900">Fallback / Manual Override Rates</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
          Campaign costs are calculated from WhatsApp's own real recent billing data whenever
          it's available. These rates are only used as a fallback for a category Meta has no
          recent activity for yet — e.g. a new number that hasn't sent an Authentication message
          before.
        </p>
      </div>

      <div>
        <label className={LABEL_CLASS}>Currency</label>
        <input
          type="text"
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          placeholder="INR"
          className={`${FIELD_CLASS} max-w-[120px] font-mono`}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {RATE_FIELDS.map(({ key, label, hint }) => (
          <div key={key}>
            <label className={LABEL_CLASS}>
              {label} <span className="font-normal text-slate-400">({hint})</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={rates[key]}
              onChange={(e) => setRates((prev) => ({ ...prev, [key]: e.target.value }))}
              className={FIELD_CLASS}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Pricing"}
        </button>
      </div>
    </div>
  );
}
