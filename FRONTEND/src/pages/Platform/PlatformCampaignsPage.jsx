import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Megaphone,
  Search,
  Building2,
  Clock,
  PlayCircle,
  RefreshCw,
  Send,
} from "lucide-react";

import {
  fetchAllPlatformCampaigns,
  fetchCompanies,
} from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusClasses = {
  COMPLETED: "border-[#B5C5D5] bg-[#D9E4EE] text-[#1A3652]",
  PROCESSING: "border-[#B5C5D5] bg-[#D4DEE9] text-[#2A4A68]",
  SCHEDULED: "border-[#C5D1DE] bg-[#EFF3F8] text-[#3D5F7E]",
  FAILED: "border-rose-200 bg-rose-50 text-rose-800",
  CANCELLED: "border-stone-200 bg-stone-50 text-stone-600",
  DRAFT: "border-stone-200 bg-stone-50 text-stone-500",
  completed: "border-[#B5C5D5] bg-[#D9E4EE] text-[#1A3652]",
  processing: "border-[#B5C5D5] bg-[#D4DEE9] text-[#2A4A68]",
  scheduled: "border-[#C5D1DE] bg-[#EFF3F8] text-[#3D5F7E]",
  failed: "border-rose-200 bg-rose-50 text-rose-800",
  cancelled: "border-stone-200 bg-stone-50 text-stone-600",
  draft: "border-stone-200 bg-stone-50 text-stone-500",
};

export default function PlatformCampaignsPage() {
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    processing: 0,
    scheduled: 0,
    completed: 0,
    failed: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalRead: 0,
    totalFailed: 0,
  });
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function loadCompanies() {
    try {
      const res = await fetchCompanies();
      setCompanies(res.data || []);
    } catch (error) {
      console.error("Failed to load companies:", error);
    }
  }

  async function loadCampaigns() {
    try {
      setLoading(true);
      const res = await fetchAllPlatformCampaigns({
        page,
        limit: 20,
        search: search.trim() || undefined,
        companyId: companyId || undefined,
        status: status || undefined,
      });

      setCampaigns(res.data || []);
      setTotalPages(res.totalPages || 1);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load broadcast campaigns");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [search, companyId, status, page]);

  return (
    <PlatformLayout
      title="Platform Broadcasts"
      description="Live cross-tenant queue of scheduled and dispatched WhatsApp campaigns."
      actions={
        <button
          onClick={loadCampaigns}
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
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Broadcasts</p>
                <p className="text-xl font-bold text-slate-900">{summary.total}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <PlayCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active / Processing</p>
                <p className="text-xl font-bold text-blue-700">{summary.processing}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scheduled Queue</p>
                <p className="text-xl font-bold text-sky-700">{summary.scheduled}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Messages Sent</p>
                <p className="text-xl font-bold text-emerald-700">
                  {new Intl.NumberFormat("en-IN").format(summary.totalSent || 0)}
                </p>
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
                placeholder="Search broadcast name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
              />
            </div>

            {/* Company Filter */}
            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
            >
              <option value="">All Companies</option>
              {companies.map((comp) => (
                <option key={comp._id} value={comp._id}>
                  {comp.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
            >
              <option value="">All Statuses</option>
              <option value="processing">Processing / Sending</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* CAMPAIGNS TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#F5F8FB] shadow-sm">
          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No broadcast campaigns match your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Broadcast Name</th>
                    <th className="px-5 py-3.5">Company Tenant</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Recipients</th>
                    <th className="px-5 py-3.5">Delivery Progress</th>
                    <th className="px-5 py-3.5">Timing / Execution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {campaigns.map((c) => (
                    <tr key={c._id} className="transition hover:bg-slate-50/70">
                      {/* CAMPAIGN NAME */}
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{c.campaignName}</p>
                        <p className="text-[11px] capitalize text-slate-400">{c.campaignType || "broadcast"}</p>
                      </td>

                      {/* COMPANY */}
                      <td className="px-5 py-3.5">
                        {c.companyId ? (
                          <button
                            onClick={() => {
                              const targetId = typeof c.companyId === "object" ? (c.companyId?._id || c.companyId?.id) : c.companyId;
                              if (targetId && targetId !== "[object Object]") navigate(`/platform/companies/${targetId}`);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {typeof c.companyId === "object" ? (c.companyId.name || "Company") : "Company"}
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            statusClasses[c.status] || statusClasses.draft
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      {/* RECIPIENTS */}
                      <td className="px-5 py-3.5 font-semibold text-slate-800">
                        {c.totalContacts ?? 0}
                      </td>

                      {/* PROGRESS BAR */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <div className="flex gap-2 text-[10px]">
                            <span className="text-emerald-700">Sent: {c.sentCount ?? 0}</span>
                            <span className="text-sky-700">Delivered: {c.deliveredCount ?? 0}</span>
                            <span className="text-indigo-700">Read: {c.readCount ?? 0}</span>
                            <span className="text-rose-600">Failed: {c.failedCount ?? 0}</span>
                          </div>
                          <div className="flex h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
                            <div
                              style={{
                                width: `${
                                  c.totalContacts ? ((c.deliveredCount ?? 0) / c.totalContacts) * 100 : 0
                                }%`,
                              }}
                              className="bg-emerald-500"
                            />
                            <div
                              style={{
                                width: `${
                                  c.totalContacts ? ((c.failedCount ?? 0) / c.totalContacts) * 100 : 0
                                }%`,
                              }}
                              className="bg-rose-500"
                            />
                          </div>
                        </div>
                      </td>

                      {/* TIMING */}
                      <td className="px-5 py-3.5 text-slate-500">
                        {c.scheduleAt ? (
                          <div className="flex items-center gap-1 text-sky-700 font-medium">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(c.scheduleAt)}
                          </div>
                        ) : (
                          formatDateTime(c.createdAt)
                        )}
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
    </PlatformLayout>
  );
}
