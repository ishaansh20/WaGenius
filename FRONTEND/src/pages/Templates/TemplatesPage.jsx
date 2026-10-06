import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import TemplatePreviewModal from "../../components/templates/TemplatePreviewModal";
import { useTemplates } from "../../hooks/useTemplates";
import { formatRelativeDate } from "../../utils/date";
import {
  DEFAULT_CATEGORIES,
  META_STATUS_CONFIG,
  STATUS_CONFIG,
} from "../../constants/templates";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Button, Card, Skeleton } from "../../components/ui";
import { cn } from "../../utils/cn";

const ITEMS_PER_PAGE = 15;

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Archived", value: "archived" },
];

// Local template status → Badge tone (green / amber / neutral only).
const STATUS_TONES = {
  active: "success",
  draft: "neutral",
  pending: "warning",
  archived: "neutral",
};

// Same tones, as classes for the inline status <select>.
const STATUS_SELECT_TONES = {
  active: "bg-success-soft text-success",
  draft: "bg-[#f1f2ee] text-ink-muted",
  pending: "bg-warning-soft text-warning",
  archived: "bg-[#f1f2ee] text-ink-muted",
};

// Meta review status → Badge tone.
const META_STATUS_TONES = {
  not_submitted: "neutral",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  PAUSED: "warning",
  DISABLED: "danger",
};

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { templates, categories, loading, refetch, updateTemplateStatus, deleteTemplate } =
    useTemplates();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);

  const mergedCategories = [
    ...DEFAULT_CATEGORIES,
    ...categories.map((i) => i.name).filter((n) => !DEFAULT_CATEGORIES.includes(n)),
  ];

  const hasActiveFilters =
    statusFilter !== "all" || categoryFilter !== "all" || search.trim() !== "";

  const filteredTemplates = useMemo(
    () =>
      templates.filter((t) => {
        if (!t.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter !== "all" && t.status !== statusFilter) return false;
        if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
        return true;
      }),
    [templates, search, statusFilter, categoryFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedTemplates = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredTemplates.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTemplates, safePage]);

  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter]);

  async function handleDelete(id) {
    const confirmDelete = window.confirm("Delete this template?");
    if (!confirmDelete) return;
    try {
      await deleteTemplate(id);
      if (previewTemplate?._id === id) setPreviewTemplate(null);
    } catch (error) {
      console.log(error);
    }
  }

  async function handleStatusChange(templateId, newStatus) {
    try {
      await updateTemplateStatus(templateId, newStatus);
    } catch (error) {
      console.log(error);
    }
  }

  function resetFilters() {
    setSearch(""); setStatusFilter("all"); setCategoryFilter("all");
  }

  async function handleSyncFromMeta() {
    setSyncing(true);
    try {
      const res = await api.post("/api/templates/sync-meta");
      await refetch();
      const count = res.data.updated?.length || 0;
      window.alert(count > 0 ? `Synced ${count} template(s) from Meta.` : "Already up to date.");
    } catch (error) {
      console.log(error);
      window.alert("Failed to sync templates from Meta.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleImportFromMeta() {
    setImporting(true);
    try {
      const res = await api.post("/api/templates/import-meta");
      const count = res.data.imported?.length || 0;
      window.alert(
        count > 0
          ? `Imported ${count} template(s) from Meta.`
          : "All Meta templates are already present — nothing new to import.",
      );
      if (count > 0) await refetch();
    } catch (error) {
      console.error(error);
      window.alert("Failed to import templates from Meta.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <DashboardLayout title="Templates">
      <div className="w-full">

        {/* Page header */}
        <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">
              Templates
            </h1>
            <p className="mt-1.5 text-[15px] text-ink-muted">
              Reusable WhatsApp messages you can send in your campaigns.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              leftIcon={ShieldCheck}
              onClick={() => navigate("/templates/approved")}
            >
              Approved templates
            </Button>
            <Button
              variant="secondary"
              onClick={handleSyncFromMeta}
              disabled={syncing || importing}
            >
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync from Meta"}
            </Button>
            <Button
              variant="secondary"
              id="import-from-meta-btn"
              onClick={handleImportFromMeta}
              disabled={importing || syncing}
              title="Fetch templates approved in Meta Business Manager that aren't in Wagenius yet"
            >
              {importing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
              {importing ? "Importing…" : "Import from Meta"}
            </Button>
            <Button leftIcon={Plus} onClick={() => navigate("/templates/create")}>
              Create template
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Filter bar */}
          <Card padded={false} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[200px] flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <input
                type="text"
                placeholder="Search templates…"
                aria-label="Search templates"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-subtle outline-none transition hover:border-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <SegmentedTabs
                label="Template status"
                items={STATUS_TABS}
                value={statusFilter}
                onChange={setStatusFilter}
              />

              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                  className="h-10 cursor-pointer appearance-none rounded-lg border border-line-strong bg-surface pl-3 pr-9 text-[14px] text-ink outline-none transition hover:border-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
                >
                  <option value="all">All categories</option>
                  {mergedCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" leftIcon={X} onClick={resetFilters}>
                  Reset
                </Button>
              )}

              {!loading && (
                <span className="ml-auto shrink-0 text-[14px] tabular-nums text-ink-muted lg:ml-1">
                  {filteredTemplates.length} of {templates.length}
                </span>
              )}
            </div>
          </Card>

          {/* Content */}
          {loading ? (
            <Card padded={false} className="space-y-3 p-5" aria-label="Loading templates">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </Card>
          ) : templates.length === 0 ? (
            <EmptyBox
              title="No templates yet"
              description="Create your first reusable message template."
              action={
                <Button leftIcon={Plus} onClick={() => navigate("/templates/create")}>
                  Create template
                </Button>
              }
            />
          ) : filteredTemplates.length === 0 ? (
            <EmptyBox
              icon={Search}
              title="No results"
              description="No templates match the selected filters."
              action={
                <Button variant="secondary" leftIcon={X} onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-[#f6f7f6]">
                      {["Template", "Category", "Status", "Meta approval", "Created", ""].map((label, i) => (
                        <th
                          key={label || i}
                          scope="col"
                          className={`px-4 py-3 text-[13px] font-medium text-ink-muted ${label ? "" : "w-[132px]"}`}
                        >
                          {label || <span className="sr-only">Actions</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-line">
                    {paginatedTemplates.map((template) => (
                      <tr
                        key={template._id}
                        onClick={() => navigate(`/templates/edit/${template._id}`)}
                        className="cursor-pointer text-[14px] transition-colors hover:bg-canvas"
                      >
                        {/* Template name + subject */}
                        <td className="px-4 py-3.5">
                          <p className="font-medium leading-snug text-ink">{template.name}</p>
                          {template.subject && (
                            <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-muted">
                              {template.subject}
                            </p>
                          )}
                        </td>

                        {/* Category badge */}
                        <td className="px-4 py-3.5">
                          <Badge>{template.category}</Badge>
                        </td>

                        {/* Status (inline editable select) */}
                        <td className="px-4 py-3.5">
                          <div className="relative inline-flex">
                            <select
                              value={template.status}
                              onChange={(e) => handleStatusChange(template._id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Status for ${template.name}`}
                              className={cn(
                                "h-8 cursor-pointer appearance-none rounded-full border-0 pl-3 pr-7 text-[13px] font-medium outline-none transition focus:ring-4 focus:ring-brand-600/12",
                                STATUS_SELECT_TONES[template.status] || STATUS_SELECT_TONES.archived,
                              )}
                            >
                              <option value="active">Active</option>
                              <option value="draft">Draft</option>
                              <option value="pending">Pending</option>
                              <option value="archived">Archived</option>
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-70" />
                          </div>
                        </td>

                        {/* Meta approval status */}
                        <td className="px-4 py-3.5">
                          {(() => {
                            const metaCfg =
                              META_STATUS_CONFIG[template.metaStatus] ||
                              META_STATUS_CONFIG.not_submitted;
                            return (
                              <span title={template.rejectionReason || ""}>
                                <Badge tone={META_STATUS_TONES[template.metaStatus] || "neutral"} dot>
                                  {metaCfg.label}
                                </Badge>
                              </span>
                            );
                          })()}
                        </td>

                        {/* Created date */}
                        <td className="px-4 py-3.5 tabular-nums text-ink-muted">
                          {formatRelativeDate(template.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTemplate(template);
                              }}
                              aria-label="Preview template"
                              title="Preview"
                            >
                              <Eye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/templates/edit/${template._id}`);
                              }}
                              aria-label="Edit template"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              variant="danger-ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(template._id);
                              }}
                              aria-label="Delete template"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-line px-4 py-3">
                  <p className="text-[14px] tabular-nums text-ink-muted">
                    {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(safePage * ITEMS_PER_PAGE, filteredTemplates.length)} of{" "}
                    {filteredTemplates.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <span className="min-w-[60px] text-center text-[14px] tabular-nums text-ink-muted">
                      {safePage} / {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <TemplatePreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onEdit={() => {
          const id = previewTemplate._id;
          setPreviewTemplate(null);
          navigate(`/templates/edit/${id}`);
        }}
        badges={
          previewTemplate
            ? [
                {
                  label: previewTemplate.category,
                  tone: "neutral",
                },
                {
                  label:
                    (STATUS_CONFIG[previewTemplate.status] || {}).label || previewTemplate.status,
                  tone: STATUS_TONES[previewTemplate.status] || "neutral",
                },
              ]
            : []
        }
      />
    </DashboardLayout>
  );
}

/* ── Small building blocks ─────────────────────────────────────────── */

function SegmentedTabs({ label, items, value, onChange }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-surface p-1 scrollbar-hide"
    >
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "h-8 whitespace-nowrap rounded-md px-3 text-[14px] font-medium transition-colors",
              active ? "bg-brand-900 text-white" : "text-ink-muted hover:bg-canvas hover:text-ink",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function EmptyBox({ icon: Icon = FileText, title, description, action }) {
  return (
    <Card>
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl bg-canvas px-6 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-muted shadow-[var(--shadow-card)]">
          <Icon size={20} />
        </span>
        <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
        <p className="mt-1 max-w-xs text-[14px] text-ink-muted">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </Card>
  );
}
