import { useNavigate } from "react-router-dom";
import { Eye, FileText, Image, Pencil, Type, Video } from "lucide-react";
import { META_CATEGORY_LABELS, META_STATUS_CONFIG } from "../../constants/templates";
import { formatRelativeDate } from "../../utils/date";
import { resolveMediaUrl } from "../../utils/media";
import { Badge, Button } from "../ui";

const HEADER_TYPE_ICONS = {
  TEXT: Type,
  IMAGE: Image,
  VIDEO: Video,
  DOCUMENT: FileText,
};

// Meta review status → Badge tone (green / amber / red / neutral only).
const META_STATUS_TONES = {
  not_submitted: "neutral",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  PAUSED: "warning",
  DISABLED: "danger",
};

function metaStatusTone(metaStatus) {
  return META_STATUS_TONES[metaStatus] || "neutral";
}

export function MetaStatusBadge({ metaStatus, title }) {
  const metaCfg = META_STATUS_CONFIG[metaStatus] || META_STATUS_CONFIG.not_submitted;
  return (
    <span title={title || undefined}>
      <Badge tone={metaStatusTone(metaStatus)} dot>
        {metaCfg.label}
      </Badge>
    </span>
  );
}

// Small square thumbnail showing the template's header media type.
export function TemplateMediaThumb({ template }) {
  const imgUrl =
    template.headerMediaUrl ||
    template.mediaUrl ||
    (/^https?:\/\//i.test(template.headerHandle) ? template.headerHandle : "");

  if (template.headerType === "IMAGE" || imgUrl) {
    return (
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-canvas">
        {imgUrl ? (
          <img
            src={resolveMediaUrl(imgUrl)}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.nextElementSibling) {
                e.currentTarget.nextElementSibling.classList.remove("hidden");
              }
            }}
          />
        ) : null}
        <div className={`flex flex-col items-center justify-center ${imgUrl ? "hidden" : ""}`}>
          <Image className="h-4 w-4 text-brand-600" />
        </div>
      </div>
    );
  }

  const Icon = template.headerType === "VIDEO" ? Video : template.headerType === "DOCUMENT" ? FileText : Type;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink-muted">
      <Icon className="h-4 w-4" />
    </div>
  );
}

export function TemplatesEmpty({ title, description, action }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[var(--radius-card)] border border-line bg-surface px-6 py-12 text-center shadow-[var(--shadow-card)]">
      <div className="flex flex-col items-center rounded-xl bg-canvas px-8 py-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink-muted shadow-[var(--shadow-card)]">
          <FileText size={20} />
        </span>
        <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
        <p className="mt-1 max-w-sm text-[14px] text-ink-muted">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

// Shared list rendering for any Meta-track subset of templates — the full
// "Approved Templates" browser feeds its filtered `templates` array
// through this one table.
export default function ApprovedTemplateTable({
  templates,
  emptyTitle = "No templates",
  emptyDescription = "No templates match this view.",
  showRejectionReason = false,
  onPreview,
}) {
  const navigate = useNavigate();

  if (templates.length === 0) {
    return <TemplatesEmpty title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-[#f6f7f6]">
              {["Template", "Category", "Language", "Meta status", "Created", ""].map((label, i) => (
                <th
                  key={label || i}
                  scope="col"
                  className={`px-4 py-3 text-[13px] font-medium text-ink-muted ${label ? "" : "w-[104px]"}`}
                >
                  {label || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {templates.map((template) => {
              const HeaderIcon = HEADER_TYPE_ICONS[template.headerType];
              return (
                <tr
                  key={template._id}
                  onClick={() => navigate(`/templates/approved/edit/${template._id}`)}
                  className="cursor-pointer text-[14px] transition-colors hover:bg-canvas"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <TemplateMediaThumb template={template} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-medium text-ink">{template.name}</p>
                          {HeaderIcon && (
                            <span title={`${template.headerType} header`}>
                              <HeaderIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                            </span>
                          )}
                        </div>
                        {template.metaTemplateName && (
                          <p className="mt-0.5 truncate font-mono text-[13px] text-ink-muted">
                            {template.metaTemplateName}
                          </p>
                        )}
                        {showRejectionReason && template.metaStatus === "REJECTED" && template.rejectionReason && (
                          <p className="mt-1 text-[13px] text-danger">{template.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    {META_CATEGORY_LABELS[template.metaCategory] ? (
                      <Badge>{META_CATEGORY_LABELS[template.metaCategory]}</Badge>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-ink-muted">{template.language || "—"}</td>

                  <td className="px-4 py-3.5">
                    <MetaStatusBadge metaStatus={template.metaStatus} />
                  </td>

                  <td className="px-4 py-3.5 tabular-nums text-ink-muted">
                    {formatRelativeDate(template.createdAt)}
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {onPreview && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview(template);
                          }}
                          aria-label="Preview template"
                          title="Preview"
                        >
                          <Eye size={16} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/templates/approved/edit/${template._id}`);
                        }}
                        aria-label={template.metaStatus === "REJECTED" ? "Edit and resubmit" : "Edit template"}
                        title={template.metaStatus === "REJECTED" ? "Edit and resubmit" : "Edit"}
                      >
                        <Pencil size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
