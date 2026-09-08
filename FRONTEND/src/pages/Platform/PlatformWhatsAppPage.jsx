import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Radio,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import {
  fetchAllPlatformWhatsAppAccounts,
} from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";

export default function PlatformWhatsAppPage() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    connected: 0,
    disconnected: 0,
    embeddedSignup: 0,
    manual: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [tokenType, setTokenType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function loadAccounts() {
    try {
      setLoading(true);
      const res = await fetchAllPlatformWhatsAppAccounts({
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: status || undefined,
        tokenType: tokenType || undefined,
      });

      setAccounts(res.data || []);
      setTotalPages(res.totalPages || 1);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load WhatsApp accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, [search, status, tokenType, page]);

  return (
    <PlatformLayout
      title="WhatsApp Business Accounts (WABA)"
      description="Multi-tenant monitor for connected phone numbers, WABA IDs, and webhook activity."
      actions={
        <button
          onClick={loadAccounts}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">
        {/* SUMMARY CARDS */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Radio className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Companies</p>
                <p className="text-xl font-bold text-slate-900">{summary.total}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active WABAs</p>
                <p className="text-xl font-bold text-emerald-700">{summary.connected}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Disconnected</p>
                <p className="text-xl font-bold text-rose-600">{summary.disconnected}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Embedded Signups</p>
                <p className="text-xl font-bold text-purple-700">{summary.embeddedSignup}</p>
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
                placeholder="Search company name, Phone ID, or WABA ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
            >
              <option value="">All Connection Statuses</option>
              <option value="connected">Connected WABAs</option>
              <option value="disconnected">Disconnected Accounts</option>
            </select>

            {/* Token Type Filter */}
            <select
              value={tokenType}
              onChange={(e) => {
                setTokenType(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
            >
              <option value="">All Token Types</option>
              <option value="embedded_signup">Embedded Signup</option>
              <option value="manual">Manual Token</option>
            </select>
          </div>
        </div>

        {/* WABA ACCOUNTS TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#F5F8FB] shadow-sm">
          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No WhatsApp accounts match your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Company Tenant</th>
                    <th className="px-5 py-3.5">Connection Status</th>
                    <th className="px-5 py-3.5">Phone Number ID</th>
                    <th className="px-5 py-3.5">WABA ID</th>
                    <th className="px-5 py-3.5">Token Type</th>
                    <th className="px-5 py-3.5">Traffic Volume</th>
                    <th className="px-5 py-3.5">Onboarding State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {accounts.map((comp) => {
                    const wa = comp.whatsapp || {};
                    const isConnected = wa.connected === true;
                    return (
                      <tr key={comp._id} className="transition hover:bg-slate-50/70">
                        {/* COMPANY */}
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => navigate(`/platform/companies/${comp._id}`)}
                            className="inline-flex items-center gap-1.5 font-semibold text-slate-900 transition hover:text-emerald-700 hover:underline"
                          >
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            {comp.name}
                          </button>
                          <p className="font-mono text-[10px] text-slate-400">{comp.slug}</p>
                        </td>

                        {/* STATUS */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isConnected
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border border-red-200 bg-red-50 text-red-600"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isConnected ? "bg-emerald-600" : "bg-red-500"
                              }`}
                            />
                            {isConnected ? "Connected" : "Not Connected"}
                          </span>
                        </td>

                        {/* PHONE NUMBER ID */}
                        <td className="px-5 py-3.5 font-mono text-slate-800">
                          {wa.phoneNumberId || <span className="text-slate-400">—</span>}
                        </td>

                        {/* WABA ID */}
                        <td className="px-5 py-3.5 font-mono text-slate-800">
                          {wa.wabaId || <span className="text-slate-400">—</span>}
                        </td>

                        {/* TOKEN TYPE */}
                        <td className="px-5 py-3.5">
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                            {wa.tokenType || "manual"}
                          </span>
                        </td>

                        {/* TRAFFIC VOLUME */}
                        <td className="px-5 py-3.5 text-slate-700">
                          <p className="font-semibold">{comp.statistics?.messages ?? 0} msgs</p>
                          <p className="text-[10px] text-slate-400">{comp.statistics?.conversations ?? 0} conversations</p>
                        </td>

                        {/* ONBOARDING STATE */}
                        <td className="px-5 py-3.5 text-slate-500">
                          {wa.onboardingCompletedAt ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Completed
                            </span>
                          ) : isConnected ? (
                            <span className="text-amber-700 font-medium">Active</span>
                          ) : (
                            <span className="text-slate-400">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
    </PlatformLayout>
  );
}
