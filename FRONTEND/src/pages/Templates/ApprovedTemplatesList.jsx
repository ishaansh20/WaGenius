import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useTemplates } from "../../hooks/useTemplates";
import { META_CATEGORY_LABELS, META_STATUS_CONFIG, isMetaTemplate } from "../../constants/templates";
import ApprovedTemplateTable from "../../components/templates/ApprovedTemplateTable";
import TemplatePreviewModal from "../../components/templates/TemplatePreviewModal";

// Renders both the "All" tab (category = null) and each category tab —
// ApprovedTemplatesLayout passes which metaCategory to filter to.
export default function ApprovedTemplatesList({ category = null }) {
  const navigate = useNavigate();
  const { templates, loading } = useTemplates();
  const [search, setSearch] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (!isMetaTemplate(t)) return false;
      if (category && t.metaCategory !== category) return false;
      if (search.trim() && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [templates, category, search]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
        <p className="text-[13px] text-slate-500">Loading templates…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search approved templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[13px] text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
          />
        </div>
        <span className="ml-auto shrink-0 text-[12px] tabular-nums text-slate-400">
          {filtered.length} template{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <ApprovedTemplateTable
        templates={filtered}
        emptyTitle={category ? `No ${META_CATEGORY_LABELS[category]} templates yet` : "No approved templates yet"}
        emptyDescription="Templates submitted to Meta for review will show up here."
        onPreview={setPreviewTemplate}
      />

      <TemplatePreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onEdit={() => {
          const id = previewTemplate._id;
          setPreviewTemplate(null);
          navigate(`/templates/approved/edit/${id}`);
        }}
        badges={
          previewTemplate
            ? [
                previewTemplate.metaCategory && {
                  label: META_CATEGORY_LABELS[previewTemplate.metaCategory],
                  className: "border-slate-200 bg-slate-100 text-slate-600",
                },
                {
                  label:
                    (META_STATUS_CONFIG[previewTemplate.metaStatus] || META_STATUS_CONFIG.not_submitted)
                      .label,
                  className:
                    (META_STATUS_CONFIG[previewTemplate.metaStatus] || META_STATUS_CONFIG.not_submitted)
                      .className,
                },
              ].filter(Boolean)
            : []
        }
      />
    </div>
  );
}
