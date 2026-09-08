import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  FileText,
  Search,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Percent,
} from "lucide-react";

import {
  fetchAllPlatformTemplates,
  fetchCompanies,
} from "../../services/platformApi";
import PlatformLayout from "../../components/layout/PlatformLayout";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const metaStatusClasses = {
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  PAUSED: "border-yellow-200 bg-yellow-50 text-yellow-700",
  DISABLED: "border-slate-200 bg-slate-50 text-slate-600",
  not_submitted: "border-slate-200 bg-slate-50 text-slate-500",
};

export default function PlatformTemplatesPage() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    paused: 0,
    approvalRate: 0,
  });
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [metaStatus, setMetaStatus] = useState("");
  const [category, setCategory] = useState("");
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

  async function loadTemplates() {
    try {
      setLoading(true);
      const res = await fetchAllPlatformTemplates({
        page,
        limit: 20,
        search: search.trim() || undefined,
        companyId: companyId || undefined,
        metaStatus: metaStatus || undefined,
        category: category || undefined,
      });

      setTemplates(res.data || []);
      setTotalPages(res.totalPages || 1);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [search, companyId, metaStatus, category, page]);

  return (
    <PlatformLayout
      title="Platform Message Templates"
      description="Cross-company feed of WhatsApp templates submitted to Meta with approval diagnostics."
      actions={
        <button
          onClick={loadTemplates}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">
        {/* SUMMARY CARDS */}
        <div className="grid gap-4 sm:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Templates</p>
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approved</p>
                <p className="text-xl font-bold text-emerald-700">{summary.approved}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Review</p>
                <p className="text-xl font-bold text-amber-700">{summary.pending}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rejected</p>
                <p className="text-xl font-bold text-rose-600">{summary.rejected}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#F5F8FB] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approval Rate</p>
                <p className="text-xl font-bold text-purple-700">{summary.approvalRate}%</p>
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
                placeholder="Search template name or Meta slug..."
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

            {/* Meta Status Filter */}
            <select
              value={metaStatus}
              onChange={(e) => {
                setMetaStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
            >
              <option value="">All Meta Statuses</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PENDING">PENDING</option>
              <option value="REJECTED">REJECTED</option>
              <option value="PAUSED">PAUSED</option>
              <option value="DISABLED">DISABLED</option>
            </select>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-[#F5F8FB]"
            >
              <option value="">All Categories</option>
              <option value="MARKETING">MARKETING</option>
              <option value="UTILITY">UTILITY</option>
              <option value="AUTHENTICATION">AUTHENTICATION</option>
            </select>
          </div>
        </div>

        {/* TEMPLATES TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#F5F8FB] shadow-sm">
          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
            </div>
          ) : templates.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No message templates match your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Template</th>
                    <th className="px-5 py-3.5">Company Tenant</th>
                    <th className="px-5 py-3.5">Meta Status</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Language</th>
                    <th className="px-5 py-3.5">Diagnostics / Rejection Reason</th>
                    <th className="px-5 py-3.5">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {templates.map((t) => (
                    <tr key={t._id} className="transition hover:bg-slate-50/70">
                      {/* TEMPLATE NAME */}
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{t.name}</p>
                        {t.metaTemplateName && (
                          <p className="font-mono text-[10px] text-slate-400">{t.metaTemplateName}</p>
                        )}
                      </td>

                      {/* COMPANY */}
                      <td className="px-5 py-3.5">
                        {t.companyId ? (
                          <button
                            onClick={() => {
                              const targetId = typeof t.companyId === "object" ? (t.companyId?._id || t.companyId?.id) : t.companyId;
                              if (targetId && targetId !== "[object Object]") navigate(`/platform/companies/${targetId}`);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {typeof t.companyId === "object" ? (t.companyId.name || "Company") : "Company"}
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* META STATUS */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            metaStatusClasses[t.metaStatus] || metaStatusClasses.not_submitted
                          }`}
                        >
                          {t.metaStatus || "not_submitted"}
                        </span>
                      </td>

                      {/* CATEGORY */}
                      <td className="px-5 py-3.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {t.metaCategory || t.category || "—"}
                        </span>
                      </td>

                      {/* LANGUAGE */}
                      <td className="px-5 py-3.5 uppercase text-slate-700">{t.language || "en_US"}</td>

                      {/* REJECTION REASON */}
                      <td className="px-5 py-3.5">
                        {t.rejectionReason ? (
                          <div className="flex items-center gap-1.5 text-rose-600">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-xs truncate font-medium" title={t.rejectionReason}>
                              {t.rejectionReason}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* CREATED */}
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(t.createdAt)}</td>
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
