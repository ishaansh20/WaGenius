import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, ChevronLeft, ChevronRight, Download, LayoutList, Search, X } from "lucide-react";
import { toast } from "react-hot-toast";
import api, {
  fetchCostSummary,
  fetchTemplateCategories,
  duplicateCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
} from "../../services/api";
import { contactsToCsvFile } from "../../utils/segmentToCsv";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { mergeCategories } from "../../constants/templates";

const STATUS_OPTIONS = ["All", "Scheduled", "Paused", "Cancelled", "Processing", "Completed", "Failed"];
const DATE_OPTIONS = ["All", "Today", "Last 7 Days", "Last 30 Days"];
const ITEMS_PER_PAGE = 15;

const STATUS_CONFIG = {
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  processing: { label: "Processing", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  scheduled: { label: "Scheduled", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  paused: { label: "Paused", className: "bg-slate-100 text-slate-600 border border-slate-300" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-500 border border-slate-300 line-through" },
  failed: { label: "Failed", className: "bg-red-50 text-red-700 border border-red-200" },
  draft: { label: "Draft", className: "bg-slate-50 text-slate-600 border border-slate-200" },
};

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en", { weekday: "short" });
  return d.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

const selectCls =
  "h-9 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[13px] text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100";

export default function CampaignHistoryPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [costSummary, setCostSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const navigate = useNavigate();

  const hasActiveFilters =
    typeFilter !== "All" || statusFilter !== "All" || dateFilter !== "All" || searchQuery.trim() !== "";

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      if (typeFilter !== "All" && campaign.campaignType !== typeFilter) return false;
      if (statusFilter !== "All" && campaign.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (dateFilter !== "All") {
        const created = new Date(campaign.createdAt);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (dateFilter === "Today" && created < startOfToday) return false;
        if (dateFilter === "Last 7 Days") {
          const cutoff = new Date(startOfToday); cutoff.setDate(cutoff.getDate() - 7);
          if (created < cutoff) return false;
        }
        if (dateFilter === "Last 30 Days") {
          const cutoff = new Date(startOfToday); cutoff.setDate(cutoff.getDate() - 30);
          if (created < cutoff) return false;
        }
      }
      if (searchQuery.trim() && !campaign.campaignName?.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      return true;
    });
  }, [campaigns, typeFilter, statusFilter, dateFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedCampaigns = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredCampaigns.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCampaigns, safePage]);

  useEffect(() => { setPage(1); }, [typeFilter, statusFilter, dateFilter, searchQuery]);

  function resetFilters() {
    setTypeFilter("All"); setStatusFilter("All"); setDateFilter("All"); setSearchQuery("");
  }

  async function fetchCampaigns() {
    try {
      const res = await api.get("/api/campaigns/list");
      setCampaigns(res.data.campaigns || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCampaigns();
    fetchCostSummary().then(setCostSummary).catch(() => setCostSummary(null));
    fetchTemplateCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const typeOptions = ["All", ...mergeCategories(categories)];

  const costById = useMemo(() => {
    if (!costSummary) return new Map();
    return new Map(costSummary.campaigns.map((c) => [c.campaignId, c.estimatedCost]));
  }, [costSummary]);

  const currencySymbol = costSummary?.currency === "INR" ? "₹" : (costSummary?.currency || "");

  async function handleDownloadReport(campaign) {
    try {
      const res = await api.get(`/api/campaigns/${campaign._id}/report`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${campaign.campaignName}-report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download report");
    }
  }

  return (
    <DashboardLayout title="Campaign History">
      <div className="w-full">

        {/* Page header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Campaigns
            </p>
            <h1 className="text-[17px] font-semibold leading-tight text-slate-900">
              Campaign History
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              View all past and scheduled campaigns
            </p>
          </div>
        </div>

        {/* Filter bar — always visible */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[13px] text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
            {typeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt === "All" ? "All Types" : opt}</option>
            ))}
          </select>

          <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {STATUS_OPTIONS.map((opt) => {
              const active = statusFilter === opt;
              const cfg = STATUS_CONFIG[opt.toLowerCase()];
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStatusFilter(opt)}
                  className={`rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition ${
                    active
                      ? cfg
                        ? cfg.className
                        : "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={selectCls}>
            {DATE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt === "All" ? "All Dates" : opt}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
          )}

          {/* Result count */}
          {!loading && (
            <span className="ml-auto shrink-0 text-[12px] tabular-nums text-slate-400">
              {filteredCampaigns.length} / {campaigns.length}
            </span>
          )}
        </div>

        {/* Content area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
            <p className="text-[13px] text-slate-500">Loading campaigns…</p>
          </div>
        ) : campaigns.length === 0 ? (
          /* No campaigns at all */
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              <LayoutList className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-800">No campaigns yet</p>
              <p className="mt-1 text-[13px] text-slate-500">
                Launch your first campaign to get started
              </p>
            </div>
            <button
              onClick={() => navigate("/campaigns/upload")}
              className="mt-1 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-emerald-700"
            >
              Create Campaign
            </button>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          /* Active filters, nothing matches */
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <p className="text-[14px] font-semibold text-slate-800">No results</p>
            <p className="text-[13px] text-slate-500">
              No campaigns match the selected filters.
            </p>
            <button
              onClick={resetFilters}
              className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          </div>
        ) : (
          /* Table */
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {[
                      { label: "Campaign", widthCls: "w-[30%]", align: "text-left" },
                      { label: "Type", widthCls: "", align: "text-left" },
                      { label: "Status", widthCls: "", align: "text-left" },
                      { label: "Contacts", widthCls: "", align: "text-left" },
                      { label: "Sent", widthCls: "", align: "text-left" },
                      { label: "Failed", widthCls: "", align: "text-left" },
                      { label: "Est. Cost", widthCls: "", align: "text-left" },
                      { label: "Created", widthCls: "", align: "text-left" },
                      { label: "Analytics", widthCls: "", align: "text-center" },
                      { label: "Actions", widthCls: "", align: "text-center" },
                    ].map(({ label, widthCls, align }) => (
                      <th
                        key={label}
                        className={`px-5 py-3 ${align} text-[12.5px] font-semibold uppercase tracking-wide text-slate-600 ${widthCls}`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedCampaigns.map((campaign) => {
                    const statusKey = (campaign.status || "").toLowerCase();
                    const statusCfg = STATUS_CONFIG[statusKey] || {
                      label: campaign.status || "Unknown",
                      className: "bg-slate-100 text-slate-600 border border-slate-200",
                    };
                    const deliveryRate =
                      campaign.totalContacts > 0
                        ? Math.round((campaign.sentCount / campaign.totalContacts) * 100)
                        : null;

                    return (
                      <tr
                        key={campaign._id}
                        onClick={() => navigate(`/campaigns/${campaign._id}/analytics`)}
                        className="cursor-pointer transition-colors hover:bg-slate-50"
                      >
                        {/* Campaign name + preview */}
                        <td className="px-5 py-3.5">
                          <p className="text-[13.5px] font-medium text-slate-900 leading-snug">
                            {campaign.campaignName}
                          </p>
                          {campaign.message && (
                            <p className="mt-0.5 line-clamp-1 text-[11.5px] text-slate-400">
                              {campaign.message}
                            </p>
                          )}
                        </td>

                        {/* Type */}
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {campaign.campaignType}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${statusCfg.className}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>

                        {/* Contacts */}
                        <td className="px-5 py-3.5 text-[13px] tabular-nums text-slate-600">
                          {campaign.totalContacts ?? "—"}
                        </td>

                        {/* Sent */}
                        <td className="px-5 py-3.5">
                          <span className="text-[13px] font-medium tabular-nums text-emerald-600">
                            {campaign.sentCount ?? "—"}
                          </span>
                          {deliveryRate !== null && (
                            <span className="ml-1.5 text-[11px] text-slate-400">
                              {deliveryRate}%
                            </span>
                          )}
                        </td>

                        {/* Failed */}
                        <td className="px-5 py-3.5 text-[13px] font-medium tabular-nums text-red-500">
                          {campaign.failedCount ?? "—"}
                        </td>

                        {/* Est. Cost */}
                        <td className="px-5 py-3.5 text-[13px] tabular-nums text-slate-600">
                          {costById.has(campaign._id)
                            ? `${currencySymbol}${costById.get(campaign._id).toFixed(2)}`
                            : "—"}
                        </td>

                        {/* Created */}
                        <td className="px-5 py-3.5 text-[13px] tabular-nums text-slate-500">
                          {formatDate(campaign.createdAt)}
                        </td>

                        {/* Analytics */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/campaigns/${campaign._id}/analytics`);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              aria-label="View analytics"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadReport(campaign);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              aria-label="Download report"
                              title="Download report"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div
                            className="flex items-center justify-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(statusKey === "completed" || statusKey === "failed") && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const data = await duplicateCampaign(campaign._id);
                                    const csvFile = contactsToCsvFile(
                                      data.contacts,
                                      "broadcast-again.csv",
                                    );
                                    navigate("/campaigns/upload", {
                                      state: {
                                        prefilledFile: csvFile,
                                        prefilledCount: data.contacts.length,
                                        prefilledCampaignName: data.campaignName,
                                        prefilledCampaignType: data.campaignType,
                                        prefilledMessage: data.message,
                                      },
                                    });
                                  } catch {
                                    toast.error("Failed to load campaign for broadcast");
                                  }
                                }}
                                className="rounded-md bg-slate-100 px-2.5 py-1 text-[11.5px] font-medium text-slate-700 transition hover:bg-slate-200"
                              >
                                Broadcast Again
                              </button>
                            )}

                            {statusKey === "scheduled" && (
                              <>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await pauseCampaign(campaign._id);
                                      toast.success("Campaign paused");
                                      fetchCampaigns();
                                    } catch {
                                      toast.error("Failed to pause campaign");
                                    }
                                  }}
                                  className="rounded-md bg-slate-100 px-2.5 py-1 text-[11.5px] font-medium text-slate-700 transition hover:bg-slate-200"
                                >
                                  Pause
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!confirm("Cancel this scheduled campaign?")) return;
                                    try {
                                      await cancelCampaign(campaign._id);
                                      toast.success("Campaign cancelled");
                                      fetchCampaigns();
                                    } catch {
                                      toast.error("Failed to cancel campaign");
                                    }
                                  }}
                                  className="rounded-md bg-red-50 px-2.5 py-1 text-[11.5px] font-medium text-red-600 transition hover:bg-red-100"
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {statusKey === "paused" && (
                              <>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await resumeCampaign(campaign._id);
                                      toast.success("Campaign resumed");
                                      fetchCampaigns();
                                    } catch {
                                      toast.error("Failed to resume campaign");
                                    }
                                  }}
                                  className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11.5px] font-medium text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  Resume
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!confirm("Cancel this paused campaign?")) return;
                                    try {
                                      await cancelCampaign(campaign._id);
                                      toast.success("Campaign cancelled");
                                      fetchCampaigns();
                                    } catch {
                                      toast.error("Failed to cancel campaign");
                                    }
                                  }}
                                  className="rounded-md bg-red-50 px-2.5 py-1 text-[11.5px] font-medium text-red-600 transition hover:bg-red-100"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <p className="text-[12px] tabular-nums text-slate-400">
                  {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(safePage * ITEMS_PER_PAGE, filteredCampaigns.length)} of{" "}
                  {filteredCampaigns.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-[60px] text-center text-[12px] tabular-nums text-slate-500">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
