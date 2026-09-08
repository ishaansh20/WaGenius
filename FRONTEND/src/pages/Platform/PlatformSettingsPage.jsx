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
      title="Platform Settings"
      description="Global runtime configurations, default AI models, trial durations, and system controls."
      actions={
        <button
          onClick={loadSettings}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-[#F5F8FB] px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Reload
        </button>
      }
    >
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* AI & GROQ LLM CONFIGURATION */}
          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">AI Auto-Reply & Groq Engine Defaults</h3>
                <p className="text-xs text-slate-400">Controls default LLM inference parameters for multi-tenant bots</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Primary Groq LLM Model</label>
                <select
                  value={form.groq.defaultModel}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      groq: { ...form.groq, defaultModel: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
                >
                  <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B Versatile (Recommended)</option>
                  <option value="llama-3.1-8b-instant">LLaMA 3.1 8B Instant (Ultra-Fast)</option>
                  <option value="mixtral-8x7b-32768">Mixtral 8x7B (32k Context)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Fallback LLM Model</label>
                <select
                  value={form.groq.fallbackModel}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      groq: { ...form.groq, fallbackModel: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
                >
                  <option value="llama-3.1-8b-instant">LLaMA 3.1 8B Instant (Fallback)</option>
                  <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B Versatile</option>
                </select>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Temperature (Creativity)</label>
                  <span className="font-mono text-xs font-bold text-slate-700">{form.groq.temperature}</span>
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
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Max Tokens Limit</label>
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
                />
              </div>
            </div>
          </div>

          {/* ONBOARDING & META DEFAULTS */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ONBOARDING */}
            <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tenant Onboarding Rules</h3>
                  <p className="text-xs text-slate-400">Default trials and registration gates</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Default Free Trial Duration (Days)</label>
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Allow Self-Serve Signups</p>
                    <p className="text-[11px] text-slate-400">Permit new companies to register via /signup</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.onboarding.allowNewSignups}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        onboarding: {
                          ...form.onboarding,
                          allowNewSignups: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded accent-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* META GRAPH API */}
            <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Meta Graph API Settings</h3>
                  <p className="text-xs text-slate-400">WhatsApp Cloud API version target</p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Default Graph API Version</label>
                <select
                  value={form.meta.defaultApiVersion}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      meta: { ...form.meta, defaultApiVersion: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
                >
                  <option value="v21.0">v21.0 (Current Standard)</option>
                  <option value="v22.0">v22.0 (Latest)</option>
                  <option value="v20.0">v20.0 (Legacy)</option>
                </select>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Used by webhooks and message dispatchers for Meta Cloud API calls.
                </p>
              </div>
            </div>
          </div>

          {/* SYSTEM MAINTENANCE & BANNER */}
          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">System Broadcast & Maintenance Banner</h3>
                <p className="text-xs text-slate-400">Announce global platform maintenance to tenant users</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Global Announcement Banner Message</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled platform maintenance on Sunday at 02:00 AM UTC."
                  value={form.system.bannerMessage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      system: { ...form.system, bannerMessage: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/40 p-3.5">
                <div>
                  <p className="text-xs font-semibold text-amber-900">Maintenance Mode</p>
                  <p className="text-[11px] text-amber-700">Show maintenance warning banner across all tenant dashboards</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.system.maintenanceMode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      system: { ...form.system, maintenanceMode: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded accent-amber-600"
                />
              </div>
            </div>
          </div>

          {/* SAVE BUTTON */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2E5C8A] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#1E4A73] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving Changes..." : "Save Platform Settings"}
            </button>
          </div>
        </form>
      )}
    </PlatformLayout>
  );
}
