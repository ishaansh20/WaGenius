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
import { Button, Card, StatCard, StatusPill, Tabs } from "../../components/ui";

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "processing", label: "Sending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "draft", label: "Draft" },
];

const inputCls =
  "h-10 rounded-lg border border-line-strong bg-surface text-[14px] text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

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
      title="Broadcasts"
      description="Scheduled and sent WhatsApp campaigns across every company."
      actions={
        <Button variant="secondary" onClick={loadCampaigns}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total broadcasts" value={summary.total} icon={Megaphone} />
          <StatCard label="Sending now" value={summary.processing} icon={PlayCircle} />
          <StatCard label="Scheduled" value={summary.scheduled} icon={Clock} />
          <StatCard
            label="Messages sent"
            value={new Intl.NumberFormat("en-IN").format(summary.totalSent || 0)}
            icon={Send}
          />
        </div>

        {/* Toolbar */}
        <Card className="p-4 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search broadcast name"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className={`${inputCls} w-full pl-10 pr-3`}
              />
            </div>

            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPage(1);
              }}
              className={`${inputCls} px-3`}
            >
              <option value="">All companies</option>
              {companies.map((comp) => (
                <option key={comp._id} value={comp._id}>
                  {comp.name}
                </option>
              ))}
            </select>

            <Tabs
              items={STATUS_TABS}
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            />
          </div>
        </Card>

        {/* Table */}
        <Card padded={false} className="overflow-hidden">
          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-brand-600" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="m-5 rounded-xl bg-canvas px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-700 shadow-[var(--shadow-card)]">
                <Megaphone className="h-5 w-5" />
              </div>
              <p className="mt-3 text-[15px] font-semibold text-ink">No broadcasts found</p>
              <p className="mt-1 text-[14px] text-ink-muted">No broadcast campaigns match your search or filters.</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[14px]">
                <thead className="bg-[#f6f7f6] text-[13px] text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Broadcast</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Recipients</th>
                    <th className="px-4 py-3 font-medium">Delivery</th>
                    <th className="px-4 py-3 font-medium">Scheduled / created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {campaigns.map((c) => (
                    <tr key={c._id} className="transition-colors hover:bg-canvas">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-ink">{c.campaignName}</p>
                        <p className="text-[13px] capitalize text-ink-muted">{c.campaignType || "broadcast"}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        {c.companyId ? (
                          <button
                            onClick={() => {
                              const targetId = typeof c.companyId === "object" ? (c.companyId?._id || c.companyId?.id) : c.companyId;
                              if (targetId && targetId !== "[object Object]") navigate(`/platform/companies/${targetId}`);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[14px] font-medium text-brand-700 transition hover:bg-brand-50"
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            {typeof c.companyId === "object" ? (c.companyId.name || "Company") : "Company"}
                          </button>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusPill status={c.status} />
                      </td>

                      <td className="px-4 py-3.5 font-medium tabular-nums">{c.totalContacts ?? 0}</td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-x-3 text-[13px] text-ink-muted tabular-nums">
                            <span>Sent {c.sentCount ?? 0}</span>
                            <span>Delivered {c.deliveredCount ?? 0}</span>
                            <span>Read {c.readCount ?? 0}</span>
                            <span className={(c.failedCount ?? 0) > 0 ? "text-danger" : ""}>
                              Failed {c.failedCount ?? 0}
                            </span>
                          </div>
                          <div className="flex h-1.5 w-44 overflow-hidden rounded-full bg-[#eef0ed]">
                            <div
                              style={{
                                width: `${
                                  c.totalContacts ? ((c.deliveredCount ?? 0) / c.totalContacts) * 100 : 0
                                }%`,
                              }}
                              className="bg-brand-600"
                            />
                            <div
                              style={{
                                width: `${
                                  c.totalContacts ? ((c.failedCount ?? 0) / c.totalContacts) * 100 : 0
                                }%`,
                              }}
                              className="bg-danger"
                            />
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-ink-muted">
                        {c.scheduleAt ? (
                          <div className="flex items-center gap-1.5 font-medium text-info">
                            <Clock className="h-3.5 w-3.5" />
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
    </PlatformLayout>
  );
}
