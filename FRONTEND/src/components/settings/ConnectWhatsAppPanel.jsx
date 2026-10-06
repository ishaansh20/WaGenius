import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { AlertTriangle, CheckCircle, Unplug } from "lucide-react";
import { connectWhatsApp, disconnectWhatsApp, fetchWhatsAppStatus } from "../../services/api";
import { Badge, Button, Card, Input, Skeleton } from "../ui";

const MONO_INPUT = "font-mono text-[14px]";

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
      <Card aria-busy="true">
        <Skeleton className="h-6 w-64 max-w-full" />
        <Skeleton className="mt-2.5 h-4 w-full max-w-lg" />
        <Skeleton className="mt-6 h-[72px] w-full rounded-xl" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </Card>
    );
  }

  const connected = Boolean(status?.connected);

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-ink">WhatsApp Business Account</h2>
          <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
            Connect your own WhatsApp Business Account so this company can send and receive
            messages, run campaigns, and submit templates for approval.
          </p>
        </div>
        <Badge tone={connected ? "brand" : "warning"} dot className="text-[13px]">
          {connected ? "Connected" : "Not connected"}
        </Badge>
      </div>

      {connected ? (
        <div className="flex flex-col gap-4 rounded-xl border border-brand-100 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-brand-700">
              <CheckCircle size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">Your WhatsApp account is connected</p>
              <dl className="mt-1.5 space-y-1 text-[14px]">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-ink-muted">Phone Number ID:</dt>
                  <dd className="break-all font-mono text-ink">{status.phoneNumberId}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-ink-muted">WABA ID:</dt>
                  <dd className="break-all font-mono text-ink">{status.wabaId}</dd>
                </div>
              </dl>
            </div>
          </div>
          <Button
            variant="secondary"
            leftIcon={Unplug}
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="self-start sm:self-center"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl bg-warning-soft px-4 py-3.5">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-[14px] leading-relaxed text-ink">
              Not connected yet. Paste your WhatsApp Cloud API credentials below — get these from
              your Meta Business Settings → System Users, the same way you'd set up the API
              directly.
            </p>
          </div>

          <Input
            label="Access token"
            type="password"
            value={form.accessToken}
            onChange={(e) => setForm((prev) => ({ ...prev, accessToken: e.target.value }))}
            placeholder="EAAG..."
            inputClassName={MONO_INPUT}
            autoComplete="off"
            help="In Meta Business Settings, open Users → System users, pick your system user and click Generate new token. Starts with EAA."
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Phone Number ID"
              type="text"
              value={form.phoneNumberId}
              onChange={(e) => setForm((prev) => ({ ...prev, phoneNumberId: e.target.value }))}
              placeholder="1234567890123"
              inputClassName={MONO_INPUT}
              help="In Meta for Developers, open your app → WhatsApp → API Setup. It is listed under your phone number."
            />
            <Input
              label="WhatsApp Business Account ID"
              type="text"
              value={form.wabaId}
              onChange={(e) => setForm((prev) => ({ ...prev, wabaId: e.target.value }))}
              placeholder="1234567890123"
              inputClassName={MONO_INPUT}
              help="Shown on the same API Setup page, or in Business Settings → Accounts → WhatsApp accounts."
            />
          </div>

          <Input
            label="Graph API version"
            type="text"
            value={form.apiVersion}
            onChange={(e) => setForm((prev) => ({ ...prev, apiVersion: e.target.value }))}
            placeholder="v23.0"
            className="max-w-[220px]"
            inputClassName={MONO_INPUT}
            help="Leave as v23.0 unless told otherwise."
          />

          <div className="flex justify-end border-t border-line pt-5">
            <Button type="submit" disabled={saving}>
              {saving ? "Connecting…" : "Connect WhatsApp"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
