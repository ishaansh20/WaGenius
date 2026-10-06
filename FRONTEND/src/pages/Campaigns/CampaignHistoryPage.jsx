import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutList,
  Pause,
  Play,
  Plus,
  Repeat,
  Search,
  X,
} from "lucide-react";
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
import { Button, Card, Skeleton, StatusPill } from "../../components/ui";
import { mergeCategories } from "../../constants/templates";
import { cn } from "../../utils/cn";

const STATUS_OPTIONS = ["All", "Scheduled", "Paused", "Cancelled", "Processing", "Completed", "Failed"];
const DATE_OPTIONS = ["All", "Today", "Last 7 Days", "Last 30 Days"];
const ITEMS_PER_PAGE = 15;

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
  "h-10 cursor-pointer rounded-lg border border-line-strong bg-surface px-3 text-[14px] text-ink outline-none transition-colors hover:border-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12";

const TABLE_COLUMNS = [
  { label: "Campaign", className: "w-[28%] text-left" },
  { label: "Type", className: "text-left" },
  { label: "Status", className: "text-left" },
  { label: "Delivery", className: "min-w-[170px] text-left" },
  { label: "Failed", className: "text-left" },
  { label: "Est. cost", className: "text-left" },
  { label: "Created", className: "text-left" },
  { label: "Actions", className: "text-right" },
];

/* ── Small building blocks ─────────────────────────────────────────── */

function Empty({ icon: Icon = LayoutList, title, description, action }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl bg-canvas px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-muted shadow-[var(--shadow-card)]">
        <Icon size={20} />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-[14px] text-ink-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function StatusTabs({ value, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Campaign status"
      className="inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-surface p-1 scrollbar-hide"
    >
      {STATUS_OPTIONS.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt)}
            className={cn(
              "h-8 whitespace-nowrap rounded-md px-3 text-[14px] font-medium transition-colors",
              active ? "bg-brand-900 text-white" : "text-ink-muted hover:bg-canvas hover:text-ink",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function DeliveryProgress({ sent, failed, total, rate }) {
  const safeTotal = total > 0 ? total : 0;
  const sentPct = safeTotal ? Math.min(100, ((sent || 0) / safeTotal) * 100) : 0;
  const failedPct = safeTotal ? Math.min(100 - sentPct, ((failed || 0) / safeTotal) * 100) : 0;
  return (
    <div className="min-w-[150px]">
      <div className="flex items-baseline justify-between gap-2 tabular-nums">
        <span className="text-[14px] text-ink">
          <span className="font-semibold">{sent ?? "—"}</span>
          <span className="text-ink-muted"> of {total ?? "—"} sent</span>
        </span>
        {rate !== null && <span className="text-[13px] text-ink-muted">{rate}%</span>}
      </div>
      <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#eceeed]">
        <div className="h-full bg-brand-600" style={{ width: `${sentPct}%` }} />
        {failedPct > 0 && <div className="h-full bg-danger" style={{ width: `${failedPct}%` }} />}
      </div>
    </div>
  );
}

function RowIconButton({ icon: Icon, label, onClick, tone = "default" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
        tone === "danger"
          ? "text-danger hover:bg-danger-soft"
          : "text-ink-muted hover:bg-brand-50 hover:text-brand-900",
      )}
    >
      <Icon size={17} />
    </button>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

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
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">
              Campaign history
            </h1>
            <p className="mt-1.5 text-[15px] text-ink-muted">
              All your past, running and scheduled campaigns in one place.
            </p>
          </div>
          <Button leftIcon={Plus} onClick={() => navigate("/campaigns/upload")}>
            Create campaign
          </Button>
        </div>

        <div className="space-y-5">
          {/* Filter bar — always visible */}
          <Card padded={false} className="flex flex-wrap items-center gap-2.5 p-4">
            <div className="relative min-w-[200px] flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns by name"
                aria-label="Search campaigns"
                className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-subtle hover:border-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by type"
              className={selectCls}
            >
              {typeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt === "All" ? "All types" : opt}</option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by date"
              className={selectCls}
            >
              {DATE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt === "All" ? "All dates" : opt}</option>
              ))}
            </select>

            <div className="flex w-full flex-wrap items-center gap-2.5">
              <StatusTabs value={statusFilter} onChange={setStatusFilter} />

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" leftIcon={X} onClick={resetFilters}>
                  Reset filters
                </Button>
              )}

              {/* Result count */}
              {!loading && (
                <span className="ml-auto shrink-0 text-[14px] tabular-nums text-ink-muted">
                  Showing {filteredCampaigns.length} of {campaigns.length}
                </span>
              )}
            </div>
          </Card>

          {/* Content area */}
          {loading ? (
            <Card padded={false} className="overflow-hidden">
              <div className="h-11 border-b border-line bg-[#f6f7f6]" />
              <div className="divide-y divide-line">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-6 px-4 py-4">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
              <p className="sr-only">Loading campaigns…</p>
            </Card>
          ) : campaigns.length === 0 ? (
            /* No campaigns at all */
            <Card>
              <Empty
                title="No campaigns yet"
                description="Send your first WhatsApp campaign and it will show up here."
                action={
                  <Button leftIcon={Plus} onClick={() => navigate("/campaigns/upload")}>
                    Create campaign
                  </Button>
                }
              />
            </Card>
          ) : filteredCampaigns.length === 0 ? (
            /* Active filters, nothing matches */
            <Card>
              <Empty
                icon={Search}
                title="No results"
                description="No campaigns match the selected filters."
                action={
                  <Button variant="secondary" size="sm" leftIcon={X} onClick={resetFilters}>
                    Clear filters
                  </Button>
                }
              />
            </Card>
          ) : (
            /* Table */
            <Card padded={false} className="overflow-hidden">
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[960px]">
                  <thead>
                    <tr className="border-b border-line bg-[#f6f7f6]">
                      {TABLE_COLUMNS.map(({ label, className }) => (
                        <th
                          key={label}
                          scope="col"
                          className={cn("px-4 py-3 text-[13px] font-medium text-ink-muted", className)}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-line">
                    {paginatedCampaigns.map((campaign) => {
                      const statusKey = (campaign.status || "").toLowerCase();
                      const deliveryRate =
                        campaign.totalContacts > 0
                          ? Math.round((campaign.sentCount / campaign.totalContacts) * 100)
                          : null;

                      return (
                        <tr
                          key={campaign._id}
                          onClick={() => navigate(`/campaigns/${campaign._id}/analytics`)}
                          className="cursor-pointer text-[14px] transition-colors hover:bg-canvas"
                        >
                          {/* Campaign name + preview */}
                          <td className="px-4 py-3.5">
                            <p className="text-[15px] font-medium leading-snug text-ink">
                              {campaign.campaignName}
                            </p>
                            {campaign.message && (
                              <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-muted">
                                {campaign.message}
                              </p>
                            )}
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center rounded-md bg-[#f1f2ee] px-2 py-0.5 text-[13px] font-medium text-ink-muted">
                              {campaign.campaignType}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <StatusPill status={campaign.status || "Unknown"} className="text-[13px]" />
                          </td>

                          {/* Contacts + sent (with delivery rate) */}
                          <td className="px-4 py-3.5">
                            <DeliveryProgress
                              sent={campaign.sentCount}
                              failed={campaign.failedCount}
                              total={campaign.totalContacts}
                              rate={deliveryRate}
                            />
                          </td>

                          {/* Failed */}
                          <td
                            className={cn(
                              "px-4 py-3.5 font-medium tabular-nums",
                              campaign.failedCount > 0 ? "text-danger" : "text-ink-muted",
                            )}
                          >
                            {campaign.failedCount ?? "—"}
                          </td>

                          {/* Est. Cost */}
                          <td className="px-4 py-3.5 tabular-nums text-ink">
                            {costById.has(campaign._id)
                              ? `${currencySymbol}${costById.get(campaign._id).toFixed(2)}`
                              : "—"}
                          </td>

                          {/* Created */}
                          <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-ink-muted">
                            {formatDate(campaign.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5">
                            <div
                              className="flex items-center justify-end gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {(statusKey === "completed" || statusKey === "failed") && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={Repeat}
                                  title="Send this campaign again to the same contacts"
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
                                  className="mr-1"
                                >
                                  Send again
                                </Button>
                              )}

                              {statusKey === "scheduled" && (
                                <>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    leftIcon={Pause}
                                    title="Pause this scheduled campaign"
                                    onClick={async () => {
                                      try {
                                        await pauseCampaign(campaign._id);
                                        toast.success("Campaign paused");
                                        fetchCampaigns();
                                      } catch {
                                        toast.error("Failed to pause campaign");
                                      }
                                    }}
                                  >
                                    Pause
                                  </Button>
                                  <Button
                                    variant="danger-ghost"
                                    size="sm"
                                    title="Cancel this scheduled campaign"
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
                                    className="mr-1"
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}

                              {statusKey === "paused" && (
                                <>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    leftIcon={Play}
                                    title="Resume this campaign"
                                    onClick={async () => {
                                      try {
                                        await resumeCampaign(campaign._id);
                                        toast.success("Campaign resumed");
                                        fetchCampaigns();
                                      } catch {
                                        toast.error("Failed to resume campaign");
                                      }
                                    }}
                                  >
                                    Resume
                                  </Button>
                                  <Button
                                    variant="danger-ghost"
                                    size="sm"
                                    title="Cancel this paused campaign"
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
                                    className="mr-1"
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}

                              <RowIconButton
                                icon={BarChart3}
                                label="View analytics"
                                onClick={() => navigate(`/campaigns/${campaign._id}/analytics`)}
                              />
                              <RowIconButton
                                icon={Download}
                                label="Download report"
                                onClick={() => handleDownloadReport(campaign)}
                              />
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
                <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
                  <p className="text-[14px] tabular-nums text-ink-muted">
                    {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(safePage * ITEMS_PER_PAGE, filteredCampaigns.length)} of{" "}
                    {filteredCampaigns.length}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      aria-label="Previous page"
                      title="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <span className="min-w-[64px] text-center text-[14px] tabular-nums text-ink-muted">
                      Page {safePage} of {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      aria-label="Next page"
                      title="Next page"
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
