import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Bot,
  AlertTriangle,
  Save,
  RefreshCw,
  UserPlus,
  Radio,
} from "lucide-react";

import {
  fetchPlatformSettings,
  updatePlatformSettings,
} from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";
import { Button, Card } from "../../components/ui";

const fieldCls =
  "h-11 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[14px] text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
const labelCls = "mb-1.5 block text-[13px] font-medium text-ink";

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100 ${
        checked ? "bg-brand-600" : "bg-[#d5d9d4]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SectionHeader({ icon: Icon, title, description, tone = "brand" }) {
  return (
    <div className="mb-5 flex items-start gap-3 border-b border-line pb-4">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          tone === "warning" ? "bg-warning-soft text-warning" : "bg-brand-50 text-brand-700"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div>
        <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-[14px] text-ink-muted">{description}</p>
      </div>
    </div>
  );
}

export default function PlatformSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    groq: {
      defaultModel: "llama-3.3-70b-versatile",
      fallbackModel: "llama-3.1-8b-instant",
      temperature: 0.7,
      maxTokens: 1024,
    },
    onboarding: {
      defaultTrialDays: 14,
      allowNewSignups: true,
    },
    meta: {
      defaultApiVersion: "v21.0",
    },
    system: {
      maintenanceMode: false,
      bannerMessage: "",
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const res = await fetchPlatformSettings();
      if (res.data) {
        setForm({
          groq: {
            defaultModel: res.data.groq?.defaultModel || "llama-3.3-70b-versatile",
            fallbackModel: res.data.groq?.fallbackModel || "llama-3.1-8b-instant",
            temperature: res.data.groq?.temperature ?? 0.7,
            maxTokens: res.data.groq?.maxTokens || 1024,
          },
          onboarding: {
            defaultTrialDays: res.data.onboarding?.defaultTrialDays ?? 14,
            allowNewSignups: res.data.system?.allowNewSignups ?? true,
          },
          meta: {
            defaultApiVersion: res.data.meta?.defaultApiVersion || "v21.0",
          },
          system: {
            maintenanceMode: res.data.system?.maintenanceMode || false,
            bannerMessage: res.data.system?.bannerMessage || "",
          },
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load platform settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await updatePlatformSettings(form);
      toast.success("Platform settings updated successfully!");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PlatformLayout
      title="Platform settings"
      description="Default AI models, trial length, Meta API version and maintenance controls for every company."
      actions={
        <Button variant="secondary" onClick={loadSettings}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Reload
        </Button>
      }
    >
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-brand-600" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* AI defaults */}
          <Card>
            <SectionHeader
              icon={Bot}
              title="AI auto-reply defaults"
              description="Default Groq model settings used by every company's auto-reply bot."
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Main model</label>
                <select
                  value={form.groq.defaultModel}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      groq: { ...form.groq, defaultModel: e.target.value },
                    })
                  }
                  className={fieldCls}
                >
                  <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B Versatile (Recommended)</option>
                  <option value="llama-3.1-8b-instant">LLaMA 3.1 8B Instant (Ultra-Fast)</option>
                  <option value="mixtral-8x7b-32768">Mixtral 8x7B (32k Context)</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Backup model</label>
                <select
                  value={form.groq.fallbackModel}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      groq: { ...form.groq, fallbackModel: e.target.value },
                    })
                  }
                  className={fieldCls}
                >
                  <option value="llama-3.1-8b-instant">LLaMA 3.1 8B Instant (Fallback)</option>
                  <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B Versatile</option>
                </select>
                <p className="mt-1.5 text-[13px] text-ink-muted">Used when the main model is unavailable.</p>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[13px] font-medium text-ink">Temperature (creativity)</label>
                  <span className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-[13px] font-medium text-brand-800">
                    {form.groq.temperature}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={form.groq.temperature}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      groq: { ...form.groq, temperature: parseFloat(e.target.value) },
                    })
                  }
                  className="mt-2 w-full accent-brand-600"
                />
                <p className="mt-1.5 text-[13px] text-ink-muted">Lower is more predictable, higher is more creative.</p>
              </div>

              <div>
                <label className={labelCls}>Max tokens per reply</label>
                <input
                  type="number"
                  min="256"
                  max="4096"
                  step="128"
                  value={form.groq.maxTokens}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      groq: { ...form.groq, maxTokens: parseInt(e.target.value, 10) },
                    })
                  }
                  className={fieldCls}
                />
              </div>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Onboarding */}
            <Card>
              <SectionHeader
                icon={UserPlus}
                title="New company sign-up"
                description="Default free trial and whether new companies can register."
              />

              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Free trial length (days)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={form.onboarding.defaultTrialDays}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        onboarding: {
                          ...form.onboarding,
                          defaultTrialDays: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    className={fieldCls}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-canvas p-4">
                  <div>
                    <p className="text-[14px] font-medium text-ink">Allow self-serve sign-ups</p>
                    <p className="mt-0.5 text-[13px] text-ink-muted">Let new companies register from the /signup page.</p>
                  </div>
                  <Switch
                    label="Allow self-serve sign-ups"
                    checked={form.onboarding.allowNewSignups}
                    onChange={(checked) =>
                      setForm({
                        ...form,
                        onboarding: {
                          ...form.onboarding,
                          allowNewSignups: checked,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </Card>

            {/* Meta */}
            <Card>
              <SectionHeader
                icon={Radio}
                title="Meta Graph API"
                description="The WhatsApp Cloud API version the platform calls."
              />

              <div>
                <label className={labelCls}>Default Graph API version</label>
                <select
                  value={form.meta.defaultApiVersion}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      meta: { ...form.meta, defaultApiVersion: e.target.value },
                    })
                  }
                  className={fieldCls}
                >
                  <option value="v21.0">v21.0 (Current standard)</option>
                  <option value="v22.0">v22.0 (Latest)</option>
                  <option value="v20.0">v20.0 (Legacy)</option>
                </select>
                <p className="mt-1.5 text-[13px] text-ink-muted">
                  Used by webhooks and message sending for Meta Cloud API calls.
                </p>
              </div>
            </Card>
          </div>

          {/* Maintenance */}
          <Card>
            <SectionHeader
              icon={AlertTriangle}
              tone="warning"
              title="Announcement and maintenance"
              description="Show a message or a maintenance warning to every company's users."
            />

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Announcement banner message</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled maintenance on Sunday at 02:00 AM UTC."
                  value={form.system.bannerMessage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      system: { ...form.system, bannerMessage: e.target.value },
                    })
                  }
                  className={fieldCls}
                />
                <p className="mt-1.5 text-[13px] text-ink-muted">Leave empty to hide the banner.</p>
              </div>

              <div
                className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
                  form.system.maintenanceMode ? "border-warning/30 bg-warning-soft" : "border-line bg-canvas"
                }`}
              >
                <div>
                  <p className="text-[14px] font-medium text-ink">Maintenance mode</p>
                  <p className="mt-0.5 text-[13px] text-ink-muted">
                    Show a maintenance warning banner on every company dashboard.
                  </p>
                </div>
                <Switch
                  label="Maintenance mode"
                  checked={form.system.maintenanceMode}
                  onChange={(checked) =>
                    setForm({
                      ...form,
                      system: { ...form.system, maintenanceMode: checked },
                    })
                  }
                />
              </div>
            </div>
          </Card>

          {/* Save */}
          <div className="sticky bottom-0 -mx-1 flex justify-end border-t border-line bg-canvas/95 px-1 py-4">
            <Button type="submit" size="lg" loading={saving} leftIcon={Save}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </form>
      )}
    </PlatformLayout>
  );
}
