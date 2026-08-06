import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { CheckCircle, Unplug } from "lucide-react";
import { connectWhatsApp, disconnectWhatsApp, fetchWhatsAppStatus } from "../../services/api";

const FIELD_CLASS =
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100 font-mono";

const LABEL_CLASS = "mb-1.5 block text-[12px] font-medium text-slate-700";

// Manual "paste your own credentials" connection — the method every company
// can use immediately, without waiting on Meta's Embedded Signup (Tech
// Provider) approval. A "Connect with Facebook" option will sit alongside
// this once that approval comes through; this stays useful afterward too,
// for anyone who prefers managing their own long-lived token.
export default function ConnectWhatsAppPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [form, setForm] = useState({ accessToken: "", phoneNumberId: "", wabaId: "", apiVersion: "v23.0" });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetchWhatsAppStatus();
      setStatus(res.whatsapp);
    } catch {
      toast.error("Failed to load WhatsApp connection status");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(e) {
    e.preventDefault();
    if (!form.accessToken.trim() || !form.phoneNumberId.trim() || !form.wabaId.trim()) {
      toast.error("Access token, Phone Number ID, and WABA ID are all required");
      return;
    }

    try {
      setSaving(true);
      await connectWhatsApp(form);
      toast.success("WhatsApp Business Account connected");
      setForm({ accessToken: "", phoneNumberId: "", wabaId: "", apiVersion: "v23.0" });
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to connect");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect this WhatsApp Business Account? Campaigns and messaging will stop working until you reconnect.")) {
      return;
    }

    try {
      setDisconnecting(true);
      await disconnectWhatsApp();
      toast.success("Disconnected");
      await load();
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(false);
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
        <h2 className="text-[14px] font-semibold text-slate-900">WhatsApp Business Account</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
          Connect your own WhatsApp Business Account so this company can send and receive
          messages, run campaigns, and submit templates for approval.
        </p>
      </div>

      {status?.connected ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-800">Connected</p>
              <p className="truncate text-[11.5px] text-slate-500">
                Phone Number ID: {status.phoneNumberId} · WABA ID: {status.wabaId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Unplug className="h-3.5 w-3.5" />
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-3">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-700">
            Not connected yet. Paste your WhatsApp Cloud API credentials below — get these from
            your Meta Business Settings → System Users, the same way you'd set up the API
            directly.
          </p>

          <div>
            <label className={LABEL_CLASS}>Access Token</label>
            <input
              type="password"
              value={form.accessToken}
              onChange={(e) => setForm((prev) => ({ ...prev, accessToken: e.target.value }))}
              placeholder="EAAG..."
              className={FIELD_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Phone Number ID</label>
              <input
                type="text"
                value={form.phoneNumberId}
                onChange={(e) => setForm((prev) => ({ ...prev, phoneNumberId: e.target.value }))}
                placeholder="1234567890123"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>WhatsApp Business Account ID</label>
              <input
                type="text"
                value={form.wabaId}
                onChange={(e) => setForm((prev) => ({ ...prev, wabaId: e.target.value }))}
                placeholder="1234567890123"
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <div className="max-w-[160px]">
            <label className={LABEL_CLASS}>Graph API Version</label>
            <input
              type="text"
              value={form.apiVersion}
              onChange={(e) => setForm((prev) => ({ ...prev, apiVersion: e.target.value }))}
              placeholder="v23.0"
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Connecting…" : "Connect"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
