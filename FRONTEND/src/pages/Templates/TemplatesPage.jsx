import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import TemplatePreviewModal from "../../components/templates/TemplatePreviewModal";
import { useTemplates } from "../../hooks/useTemplates";
import { formatRelativeDate } from "../../utils/date";
import {
  CATEGORY_CONFIG,
  DEFAULT_CATEGORIES,
  META_STATUS_CONFIG,
  STATUS_CONFIG,
} from "../../constants/templates";
import {
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

const ITEMS_PER_PAGE = 15;

const selectCls =
  "h-9 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[13px] text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100";

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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Templates
            </p>
            <h1 className="text-[17px] font-semibold leading-tight text-slate-900">
              All Templates
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Manage reusable WhatsApp message templates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/templates/approved")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Approved Templates</span>
              <span className="sm:hidden">Approved</span>
            </button>
            <button
              type="button"
              onClick={handleSyncFromMeta}
              disabled={syncing || importing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{syncing ? "Syncing…" : "Sync from Meta"}</span>
            </button>
            <button
              type="button"
              id="import-from-meta-btn"
              onClick={handleImportFromMeta}
              disabled={importing || syncing}
              title="Fetch templates approved in Meta Business Manager that aren't in Wagenius yet"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {importing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{importing ? "Importing…" : "Import from Meta"}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/templates/create")}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Create Template</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[13px] text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectCls}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={selectCls}
          >
            <option value="all">All Categories</option>
            {mergedCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
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

          {!loading && (
            <span className="ml-auto shrink-0 text-[12px] tabular-nums text-slate-400">
              {filteredTemplates.length} / {templates.length}
            </span>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
            <p className="text-[13px] text-slate-500">Loading templates…</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              <FileText className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-800">No templates yet</p>
              <p className="mt-1 text-[13px] text-slate-500">
                Create your first reusable message template
              </p>
            </div>
            <button
              onClick={() => navigate("/templates/create")}
              className="mt-1 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Template
            </button>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <p className="text-[14px] font-semibold text-slate-800">No results</p>
            <p className="text-[13px] text-slate-500">
              No templates match the selected filters.
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
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {[
                      { label: "Template", cls: "text-left" },
                      { label: "Category", cls: "text-left" },
                      { label: "Status", cls: "text-left" },
                      { label: "Meta Status", cls: "text-left" },
                      { label: "Created", cls: "text-left" },
                      { label: "Actions", cls: "text-center" },
                    ].map(({ label, cls }) => (
                      <th
                        key={label}
                        className={`px-5 py-3 text-[12.5px] font-semibold uppercase tracking-wide text-slate-600 ${cls}`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedTemplates.map((template) => {
                    const statusCfg = STATUS_CONFIG[template.status] || {
                      label: template.status,
                      className: "border-slate-200 bg-slate-100 text-slate-500",
                    };
                    const catCls =
                      CATEGORY_CONFIG[template.category] ||
                      "border-slate-200 bg-slate-100 text-slate-600";

                    return (
                      <tr
                        key={template._id}
                        onClick={() => navigate(`/templates/edit/${template._id}`)}
                        className="cursor-pointer transition-colors hover:bg-slate-50"
                      >
                        {/* Template name + subject */}
                        <td className="px-5 py-3.5">
                          <p className="text-[13.5px] font-medium leading-snug text-slate-900">
                            {template.name}
                          </p>
                          {template.subject && (
                            <p className="mt-0.5 line-clamp-1 text-[11.5px] text-slate-400">
                              {template.subject}
                            </p>
                          )}
                        </td>

                        {/* Category badge */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${catCls}`}
                          >
                            {template.category}
                          </span>
                        </td>

                        {/* Status (inline editable select) */}
                        <td className="px-5 py-3.5">
                          <select
                            value={template.status}
                            onChange={(e) => handleStatusChange(template._id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={`cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-semibold outline-none transition ${statusCfg.className}`}
                          >
                            <option value="active">Active</option>
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="archived">Archived</option>
                          </select>
                        </td>

                        {/* Meta approval status */}
                        <td className="px-5 py-3.5">
                          {(() => {
                            const metaCfg =
                              META_STATUS_CONFIG[template.metaStatus] ||
                              META_STATUS_CONFIG.not_submitted;
                            return (
                              <span
                                title={template.rejectionReason || ""}
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${metaCfg.className}`}
                              >
                                {metaCfg.label}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Created date */}
                        <td className="px-5 py-3.5 text-[13px] tabular-nums text-slate-500">
                          {formatRelativeDate(template.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTemplate(template);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              aria-label="Preview template"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/templates/edit/${template._id}`);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              aria-label="Edit template"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(template._id);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              aria-label="Delete template"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
                  {Math.min(safePage * ITEMS_PER_PAGE, filteredTemplates.length)} of{" "}
                  {filteredTemplates.length}
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
                  className:
                    CATEGORY_CONFIG[previewTemplate.category] ||
                    "border-slate-200 bg-slate-100 text-slate-600",
                },
                {
                  label:
                    (STATUS_CONFIG[previewTemplate.status] || {}).label || previewTemplate.status,
                  className:
                    (STATUS_CONFIG[previewTemplate.status] || {}).className ||
                    "border-slate-200 bg-slate-100 text-slate-500",
                },
              ]
            : []
        }
      />
    </DashboardLayout>
  );
}
