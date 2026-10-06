import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil } from "lucide-react";
import { useTemplates } from "../../hooks/useTemplates";
import {
  META_CATEGORY_LABELS,
  META_STATUS_CONFIG,
  NEEDS_ATTENTION_STATUSES,
  isMetaTemplate,
} from "../../constants/templates";
import {
  MetaStatusBadge,
  TemplateMediaThumb,
  TemplatesEmpty,
} from "../../components/templates/ApprovedTemplateTable";
import TemplatePreviewModal from "../../components/templates/TemplatePreviewModal";
import { Badge, Button, Card, Skeleton } from "../../components/ui";
import { formatRelativeDate } from "../../utils/date";

// Meta review status → Badge tone for the preview modal.
const META_STATUS_TONES = {
  not_submitted: "neutral",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  PAUSED: "warning",
  DISABLED: "danger",
};

// Plain-language explanation shown on each queue card.
const STATUS_HINTS = {
  PENDING: "WhatsApp is reviewing this template. This usually takes a few minutes to a day.",
  REJECTED: "WhatsApp didn't approve this template. Edit the wording and submit it again.",
  PAUSED: "Paused by WhatsApp because of low quality feedback. Messages using it won't be delivered.",
  DISABLED: "Disabled by WhatsApp for quality reasons. Messages using it won't be delivered.",
};

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
      <div className="space-y-3" aria-label="Loading approvals">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full rounded-[var(--radius-card)]" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {queue.length === 0 ? (
        <TemplatesEmpty
          title="Nothing needs attention"
          description="Templates pending Meta review, rejected, or paused/disabled for quality will show up here."
        />
      ) : (
        <div className="space-y-3">
          {queue.map((template) => {
            const isRejected = template.metaStatus === "REJECTED";
            return (
              <Card
                key={template._id}
                onClick={() => navigate(`/templates/approved/edit/${template._id}`)}
                className="cursor-pointer transition hover:border-line-strong"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <TemplateMediaThumb template={template} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[15px] font-semibold text-ink">{template.name}</p>
                        <MetaStatusBadge metaStatus={template.metaStatus} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-ink-muted">
                        {META_CATEGORY_LABELS[template.metaCategory] && (
                          <Badge>{META_CATEGORY_LABELS[template.metaCategory]}</Badge>
                        )}
                        <span>{template.language || "—"}</span>
                        <span className="tabular-nums">Created {formatRelativeDate(template.createdAt)}</span>
                        {template.metaTemplateName && (
                          <span className="font-mono">{template.metaTemplateName}</span>
                        )}
                      </div>
                      {STATUS_HINTS[template.metaStatus] && (
                        <p className="mt-2.5 text-[14px] text-ink-muted">{STATUS_HINTS[template.metaStatus]}</p>
                      )}
                      {isRejected && template.rejectionReason && (
                        <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">
                          {template.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:pl-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={Eye}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTemplate(template);
                      }}
                      aria-label="Preview template"
                    >
                      Preview
                    </Button>
                    <Button
                      variant={isRejected ? "primary" : "secondary"}
                      size="sm"
                      leftIcon={Pencil}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/templates/approved/edit/${template._id}`);
                      }}
                      aria-label={isRejected ? "Edit and resubmit" : "Edit template"}
                    >
                      {isRejected ? "Edit and resubmit" : "Edit"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

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
