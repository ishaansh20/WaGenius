import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { fetchPricingConfig, updatePricingConfig } from "../../services/api";
import { Button, Card, Input, Skeleton } from "../ui";

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

  useEffect(() => {
    load();
  }, []);

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
      <Card aria-busy="true">
        <Skeleton className="h-6 w-56 max-w-full" />
        <Skeleton className="mt-2.5 h-4 w-full max-w-lg" />
        <Skeleton className="mt-6 h-11 w-32" />
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {RATE_FIELDS.map(({ key }) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-[17px] font-semibold text-ink">Fallback message rates</h2>
        <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
          Campaign costs are calculated from WhatsApp's own real recent billing data whenever
          it's available. These rates are only used as a fallback for a category Meta has no
          recent activity for yet — e.g. a new number that hasn't sent an Authentication message
          before.
        </p>
      </div>

      <div className="space-y-6">
        <Input
          label="Currency"
          type="text"
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          placeholder="INR"
          className="max-w-[160px]"
          inputClassName="font-mono uppercase text-[14px]"
          help="3-letter code, e.g. INR"
        />

        <div>
          <h3 className="text-[15px] font-semibold text-ink">Rate per message</h3>
          <p className="mt-0.5 text-[13px] text-ink-muted">Price in {currency || "your currency"} for one message of each type.</p>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {RATE_FIELDS.map(({ key, label, hint }) => (
              <Input
                key={key}
                label={label}
                help={hint}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={rates[key]}
                onChange={(e) => setRates((prev) => ({ ...prev, [key]: e.target.value }))}
                inputClassName="tabular-nums text-[14px]"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end border-t border-line pt-5">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save rates"}
        </Button>
      </div>
    </Card>
  );
}
