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

const actionBadges = {
  COMPANY_STATUS_UPDATED: "border-amber-200 bg-amber-50 text-amber-800",
  SUBSCRIPTION_UPDATED: "border-[#B5C5D5] bg-[#D9E4EE] text-[#1A3652]",
  PLAN_CREATED: "border-[#B5C5D5] bg-[#D9E4EE] text-[#1A3652]",
  PLAN_UPDATED: "border-[#C5D1DE] bg-[#EFF3F8] text-[#2A4A68]",
  PLAN_STATUS_TOGGLED: "border-[#B5C5D5] bg-[#D4DEE9] text-[#3D5F7E]",
  USER_STATUS_TOGGLED: "border-rose-200 bg-rose-50 text-rose-800",
  USER_ROLE_UPDATED: "border-[#B5C5D5] bg-[#D4DEE9] text-[#2A4A68]",
  USER_PASSWORD_RESET: "border-red-200 bg-red-50 text-red-700",
  PLATFORM_SETTINGS_UPDATED: "border-[#C5D1DE] bg-[#EFF3F8] text-[#2A4A68]",
};

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
      title="Platform Audit Logs"
      description="Immutable security ledger tracking administrative overrides, subscriptions, and security events."
      actions={
        <button
          onClick={loadLogs}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">
        {/* SUMMARY CARDS */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Audit Events</p>
                <p className="text-xl font-bold text-slate-900">{summary.total}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Logged Today</p>
                <p className="text-xl font-bold text-purple-700">{summary.today}</p>
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#F5F8FB] p-4 shadow-sm">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search actor name, email, target, or action..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
              />
            </div>

            {/* Action Filter */}
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
            >
              <option value="">All Action Types</option>
              <option value="COMPANY_STATUS_UPDATED">Company Status</option>
              <option value="SUBSCRIPTION_UPDATED">Subscription Modified</option>
              <option value="PLAN_CREATED">Plan Created</option>
              <option value="PLAN_UPDATED">Plan Updated</option>
              <option value="PLAN_STATUS_TOGGLED">Plan Toggled</option>
              <option value="USER_STATUS_TOGGLED">User Status</option>
              <option value="USER_ROLE_UPDATED">User Role</option>
              <option value="USER_PASSWORD_RESET">Password Reset</option>
              <option value="PLATFORM_SETTINGS_UPDATED">Settings Updated</option>
            </select>

            {/* Target Model Filter */}
            <select
              value={targetModel}
              onChange={(e) => {
                setTargetModel(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
            >
              <option value="">All Target Resources</option>
              <option value="Company">Company</option>
              <option value="Subscription">Subscription</option>
              <option value="Plan">Plan</option>
              <option value="User">User</option>
              <option value="PlatformConfig">Platform Settings</option>
            </select>
          </div>
        </div>

        {/* AUDIT LOG TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#F5F8FB] shadow-sm">
          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No audit logs match your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-5 py-3.5">Actor (Super Admin)</th>
                    <th className="px-5 py-3.5">Action Executed</th>
                    <th className="px-5 py-3.5">Target Resource</th>
                    <th className="px-5 py-3.5">IP Address</th>
                    <th className="px-5 py-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {logs.map((log) => (
                    <tr key={log._id} className="transition hover:bg-slate-50/70">
                      {/* TIMESTAMP */}
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                        {formatDateTime(log.createdAt)}
                      </td>

                      {/* ACTOR */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-bold text-white">
                            {log.actorName?.charAt(0)?.toUpperCase() || "A"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{log.actorName}</p>
                            <p className="text-[10px] text-slate-400">{log.actorEmail}</p>
                          </div>
                        </div>
                      </td>

                      {/* ACTION */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${
                            actionBadges[log.action] || "border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* TARGET */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            {log.targetModel}
                          </span>
                          <span className="font-medium text-slate-800">{log.targetName || "—"}</span>
                        </div>
                      </td>

                      {/* IP ADDRESS */}
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">
                        {log.ipAddress || "127.0.0.1"}
                      </td>

                      {/* DETAILS BUTTON */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          <FileCode className="h-3 w-3 text-slate-500" />
                          View Diff
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              <p>Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1 font-medium transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1 font-medium transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* JSON DIFF MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-[#F5F8FB] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <FileCode className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{selectedLog.action}</h3>
                  <p className="text-xs text-slate-400">
                    By {selectedLog.actorName} on {formatDateTime(selectedLog.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Target: <strong className="text-slate-900">{selectedLog.targetModel}</strong> ({selectedLog.targetName})
                </span>
                <span className="font-mono text-slate-400">ID: {selectedLog.targetId || "N/A"}</span>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Payload / Mutation Details</label>
                <pre className="max-h-80 overflow-y-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-400">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PlatformLayout>
  );
}
