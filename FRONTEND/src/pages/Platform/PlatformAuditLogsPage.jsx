import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Search,
  RefreshCw,
  FileCode,
  Activity,
  Clock,
  X,
} from "lucide-react";

import { fetchPlatformAuditLogs } from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";
import { Badge, Button, Card, StatCard } from "../../components/ui";

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Destructive / security-sensitive actions get a red badge; everything else stays neutral.
const DANGER_ACTIONS = new Set(["USER_PASSWORD_RESET"]);

function humanizeAction(action) {
  if (!action) return "—";
  const s = String(action).toLowerCase().replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const inputCls =
  "h-10 rounded-lg border border-line-strong bg-surface text-[14px] text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

export default function PlatformAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ total: 0, today: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [targetModel, setTargetModel] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadLogs();
  }, [search, action, targetModel, page]);

  async function loadLogs() {
    try {
      setLoading(true);
      const res = await fetchPlatformAuditLogs({
        page,
        limit: 25,
        search: search.trim() || undefined,
        action: action || undefined,
        targetModel: targetModel || undefined,
      });

      setLogs(res.data || []);
      setTotalPages(res.totalPages || 1);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PlatformLayout
      title="Audit log"
      description="A permanent record of admin changes to companies, plans, subscriptions, users and settings."
      actions={
        <Button variant="secondary" onClick={loadLogs}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Total events" value={summary.total} icon={Activity} />
          <StatCard label="Logged today" value={summary.today} icon={Clock} />
        </div>

        {/* Toolbar */}
        <Card className="p-4 sm:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search admin name, email, target or action"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className={`${inputCls} w-full pl-10 pr-3`}
              />
            </div>

            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className={`${inputCls} px-3`}
            >
              <option value="">All actions</option>
              <option value="COMPANY_STATUS_UPDATED">Company status</option>
              <option value="SUBSCRIPTION_UPDATED">Subscription changed</option>
              <option value="PLAN_CREATED">Plan created</option>
              <option value="PLAN_UPDATED">Plan updated</option>
              <option value="PLAN_STATUS_TOGGLED">Plan turned on/off</option>
              <option value="USER_STATUS_TOGGLED">User status</option>
              <option value="USER_ROLE_UPDATED">User role</option>
              <option value="USER_PASSWORD_RESET">Password reset</option>
              <option value="PLATFORM_SETTINGS_UPDATED">Settings updated</option>
            </select>

            <select
              value={targetModel}
              onChange={(e) => {
                setTargetModel(e.target.value);
                setPage(1);
              }}
              className={`${inputCls} px-3`}
            >
              <option value="">All targets</option>
              <option value="Company">Company</option>
              <option value="Subscription">Subscription</option>
              <option value="Plan">Plan</option>
              <option value="User">User</option>
              <option value="PlatformConfig">Platform settings</option>
            </select>
          </div>
        </Card>

        {/* Table */}
        <Card padded={false} className="overflow-hidden">
          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-brand-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="m-5 rounded-xl bg-canvas px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-700 shadow-[var(--shadow-card)]">
                <Activity className="h-5 w-5" />
              </div>
              <p className="mt-3 text-[15px] font-semibold text-ink">No events found</p>
              <p className="mt-1 text-[14px] text-ink-muted">No audit log entries match your search or filters.</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-[14px]">
                <thead className="bg-[#f6f7f6] text-[13px] text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Admin</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Target</th>
                    <th className="px-4 py-3 font-medium">IP address</th>
                    <th className="px-4 py-3 text-right font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {logs.map((log) => (
                    <tr key={log._id} className="transition-colors hover:bg-canvas">
                      <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-ink-muted tabular-nums">
                        {formatDateTime(log.createdAt)}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[13px] font-semibold text-brand-800">
                            {log.actorName?.charAt(0)?.toUpperCase() || "A"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ink">{log.actorName}</p>
                            <p className="text-[13px] text-ink-muted">{log.actorEmail}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge tone={DANGER_ACTIONS.has(log.action) ? "danger" : "neutral"}>
                          <span title={log.action}>{humanizeAction(log.action)}</span>
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-medium text-ink">{log.targetName || "—"}</p>
                        <p className="text-[13px] text-ink-muted">{log.targetModel}</p>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[13px] text-ink-muted">
                        {log.ipAddress || "127.0.0.1"}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                          <FileCode size={14} />
                          View details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-ink-muted">
              <p>Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Details modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,20,16,0.45)] px-4 py-6">
          <div className="w-full max-w-2xl rounded-2xl bg-surface p-6 shadow-[0_24px_60px_rgba(11,20,16,0.25)]">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <FileCode className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[18px] font-semibold text-ink">{humanizeAction(selectedLog.action)}</h3>
                  <p className="text-[13px] text-ink-muted">
                    By {selectedLog.actorName} on {formatDateTime(selectedLog.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[14px] text-ink-muted">
                <span>
                  Target: <strong className="font-medium text-ink">{selectedLog.targetModel}</strong> ({selectedLog.targetName})
                </span>
                <span className="font-mono text-[13px]">ID: {selectedLog.targetId || "N/A"}</span>
              </div>
              <p className="font-mono text-[12px] text-ink-muted">{selectedLog.action}</p>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-ink">Change details</label>
                <pre className="max-h-80 overflow-auto rounded-xl border border-line bg-canvas p-4 font-mono text-[13px] text-ink">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}
