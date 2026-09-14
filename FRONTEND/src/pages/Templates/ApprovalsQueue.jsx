import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTemplates } from "../../hooks/useTemplates";
import {
  META_CATEGORY_LABELS,
  META_STATUS_CONFIG,
  NEEDS_ATTENTION_STATUSES,
  isMetaTemplate,
} from "../../constants/templates";
import ApprovedTemplateTable from "../../components/templates/ApprovedTemplateTable";
import TemplatePreviewModal from "../../components/templates/TemplatePreviewModal";

export default function ApprovalsQueue() {
  const navigate = useNavigate();
  const { templates, loading } = useTemplates();
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const queue = useMemo(
    () =>
      templates.filter(
        (t) => isMetaTemplate(t) && NEEDS_ATTENTION_STATUSES.includes(t.metaStatus),
      ),
    [templates],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
        <p className="text-[13px] text-slate-500">Loading approvals…</p>
      </div>
    );
  }

  return (
    <div>
      <ApprovedTemplateTable
        templates={queue}
        emptyTitle="Nothing needs attention"
        emptyDescription="Templates pending Meta review, rejected, or paused/disabled for quality will show up here."
        showRejectionReason
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
