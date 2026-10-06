import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useTemplates } from "../../hooks/useTemplates";
import { META_CATEGORY_LABELS, META_STATUS_CONFIG, isMetaTemplate } from "../../constants/templates";
import ApprovedTemplateTable from "../../components/templates/ApprovedTemplateTable";
import TemplatePreviewModal from "../../components/templates/TemplatePreviewModal";
import { Card, Skeleton } from "../../components/ui";

// Meta review status → Badge tone for the preview modal.
const META_STATUS_TONES = {
  not_submitted: "neutral",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  PAUSED: "warning",
  DISABLED: "danger",
};

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
      <div className="space-y-4" aria-label="Loading templates">
        <Skeleton className="h-[68px] w-full rounded-[var(--radius-card)]" />
        <Skeleton className="h-[320px] w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }

  return (
    <div>
      <Card padded={false} className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            type="text"
            placeholder="Search approved templates…"
            aria-label="Search approved templates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-subtle outline-none transition hover:border-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
          />
        </div>
        <span className="ml-auto shrink-0 text-[14px] tabular-nums text-ink-muted">
          {filtered.length} template{filtered.length === 1 ? "" : "s"}
        </span>
      </Card>

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
                  tone: "neutral",
                },
                {
                  label:
                    (META_STATUS_CONFIG[previewTemplate.metaStatus] || META_STATUS_CONFIG.not_submitted)
                      .label,
                  tone: META_STATUS_TONES[previewTemplate.metaStatus] || "neutral",
                },
              ].filter(Boolean)
            : []
        }
      />
    </div>
  );
}
