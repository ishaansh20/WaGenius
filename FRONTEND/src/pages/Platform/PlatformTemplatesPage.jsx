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
import { Badge, Button, Card, StatCard, StatusPill, Tabs } from "../../components/ui";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const META_STATUS_TABS = [
  { value: "", label: "All" },
  { value: "APPROVED", label: "Approved" },
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Rejected" },
  { value: "PAUSED", label: "Paused" },
  { value: "DISABLED", label: "Disabled" },
];

const inputCls =
  "h-10 rounded-lg border border-line-strong bg-surface text-[14px] text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

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
      title="Message templates"
      description="WhatsApp templates every company has sent to Meta, with approval status and rejection reasons."
      actions={
        <Button variant="secondary" onClick={loadTemplates}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total templates" value={summary.total} icon={FileText} />
          <StatCard label="Approved" value={summary.approved} icon={CheckCircle2} />
          <StatCard label="Pending review" value={summary.pending} icon={Clock} />
          <StatCard
            label="Rejected"
            value={<span className={summary.rejected > 0 ? "text-danger" : ""}>{summary.rejected}</span>}
            icon={XCircle}
          />
          <StatCard label="Approval rate" value={`${summary.approvalRate}%`} icon={Percent} />
        </div>

        {/* Toolbar */}
        <Card className="p-4 sm:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Search template name or Meta name"
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

              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className={`${inputCls} px-3`}
              >
                <option value="">All categories</option>
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utility</option>
                <option value="AUTHENTICATION">Authentication</option>
              </select>
            </div>

            <Tabs
              items={META_STATUS_TABS}
              value={metaStatus}
              onChange={(v) => {
                setMetaStatus(v);
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
          ) : templates.length === 0 ? (
            <div className="m-5 rounded-xl bg-canvas px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-700 shadow-[var(--shadow-card)]">
                <FileText className="h-5 w-5" />
              </div>
              <p className="mt-3 text-[15px] font-semibold text-ink">No templates found</p>
              <p className="mt-1 text-[14px] text-ink-muted">No message templates match your search or filters.</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-[14px]">
                <thead className="bg-[#f6f7f6] text-[13px] text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Template</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Meta status</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Language</th>
                    <th className="px-4 py-3 font-medium">Rejection reason</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {templates.map((t) => (
                    <tr key={t._id} className="transition-colors hover:bg-canvas">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-ink">{t.name}</p>
                        {t.metaTemplateName && (
                          <p className="font-mono text-[12px] text-ink-muted">{t.metaTemplateName}</p>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {t.companyId ? (
                          <button
                            onClick={() => {
                              const targetId = typeof t.companyId === "object" ? (t.companyId?._id || t.companyId?.id) : t.companyId;
                              if (targetId && targetId !== "[object Object]") navigate(`/platform/companies/${targetId}`);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[14px] font-medium text-brand-700 transition hover:bg-brand-50"
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            {typeof t.companyId === "object" ? (t.companyId.name || "Company") : "Company"}
                          </button>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusPill status={t.metaStatus || "not_submitted"} />
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge tone="neutral" className="capitalize">
                          {String(t.metaCategory || t.category || "—").toLowerCase()}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-ink-muted">{t.language || "en_US"}</td>

                      <td className="px-4 py-3.5">
                        {t.rejectionReason ? (
                          <div className="flex items-center gap-1.5 text-danger">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-xs truncate text-[13px] font-medium" title={t.rejectionReason}>
                              {t.rejectionReason}
                            </span>
                          </div>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-ink-muted">{formatDate(t.createdAt)}</td>
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
