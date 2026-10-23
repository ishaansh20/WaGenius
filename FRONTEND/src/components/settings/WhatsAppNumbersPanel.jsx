import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Phone, RefreshCw } from "lucide-react";
import { Badge, Button, Card } from "../ui";
import useWhatsAppNumbersStore, { numberLabel } from "../../store/whatsappNumbersStore";
import { fetchWhatsAppStatus } from "../../services/api";

// All WhatsApp numbers of this company, and which one sends by default.
// "Refresh" asks WhatsApp for the numbers in this company's own account.
export default function WhatsAppNumbersPanel() {
  const numbers = useWhatsAppNumbersStore((s) => s.numbers);
  const defaultId = useWhatsAppNumbersStore((s) => s.defaultPhoneNumberId);
  const limit = useWhatsAppNumbersStore((s) => s.limit);
  const load = useWhatsAppNumbersStore((s) => s.load);
  const sync = useWhatsAppNumbersStore((s) => s.sync);
  const setDefault = useWhatsAppNumbersStore((s) => s.setDefault);
  const [connected, setConnected] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [switchingId, setSwitchingId] = useState("");

  useEffect(() => {
    load({ force: true });
    fetchWhatsAppStatus()
      .then((res) => setConnected(Boolean(res?.whatsapp?.connected)))
      .catch(() => setConnected(null));
  }, [load]);

  // Nothing to manage until an account is connected.
  if (connected === false) return null;

  async function handleSync() {
    try {
      setSyncing(true);
      const result = await sync();
      const skipped = result.skippedByPlan || [];
      if (skipped.length > 0) {
        toast(
          `Your plan allows ${limit} WhatsApp number${limit === 1 ? "" : "s"}. ${skipped.length} more number${skipped.length === 1 ? " was" : "s were"} not added. Upgrade to use them.`,
          { icon: "ℹ️", duration: 6000 },
        );
      } else {
        toast.success("Numbers are up to date");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not refresh your numbers");
    } finally {
      setSyncing(false);
    }
  }

  async function handleMakeDefault(number) {
    try {
      setSwitchingId(number.phoneNumberId);
      await setDefault(number.phoneNumberId);
      toast.success(`New messages will now be sent from ${numberLabel(number)}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not change the number");
    } finally {
      setSwitchingId("");
    }
  }

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-ink">Your WhatsApp numbers</h2>
          <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
            Messages go out from the default number. Each conversation keeps replying from the number
            the customer wrote to, so chats never get mixed up.
          </p>
        </div>
        <Button variant="secondary" leftIcon={RefreshCw} onClick={handleSync} disabled={syncing}>
          {syncing ? "Refreshing…" : "Refresh numbers"}
        </Button>
      </div>

      {numbers.length === 0 ? (
        <p className="rounded-xl bg-canvas px-4 py-3.5 text-[14px] text-ink-muted">
          No numbers found yet. Press &ldquo;Refresh numbers&rdquo; to load them from your WhatsApp account.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {numbers.map((number) => {
            const ready = !number.status || number.status === "CONNECTED";
            return (
              <li key={number.phoneNumberId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <Phone size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold tabular-nums text-ink">{numberLabel(number)}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-muted">
                      {number.verifiedName && <span className="truncate">{number.verifiedName}</span>}
                      {number.qualityLabel && number.qualityLabel !== "Unknown" && (
                        <span>Quality: {number.qualityLabel}</span>
                      )}
                      {!ready && <span className="text-warning">Not connected on WhatsApp</span>}
                    </p>
                  </div>
                </div>

                {number.phoneNumberId === defaultId ? (
                  <Badge tone="brand" dot>
                    Default
                  </Badge>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleMakeDefault(number)}
                    disabled={!ready || Boolean(switchingId)}
                  >
                    {switchingId === number.phoneNumberId ? "Switching…" : "Make default"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {limit !== null && (
        <p className="mt-3 text-[13px] text-ink-muted">
          Your plan includes {limit} WhatsApp number{limit === 1 ? "" : "s"}.
        </p>
      )}
    </Card>
  );
}
