import { useNavigate } from "react-router-dom";
import { Eye, FileText, Image, Pencil, Type, Video } from "lucide-react";
import { META_CATEGORY_LABELS, META_STATUS_CONFIG } from "../../constants/templates";
import { formatRelativeDate } from "../../utils/date";

const HEADER_TYPE_ICONS = {
  TEXT: Type,
  IMAGE: Image,
  VIDEO: Video,
  DOCUMENT: FileText,
};

// Shared list rendering for any Meta-track subset of templates — the full
// "Approved Templates" browser and the "Needs Attention" queue both feed
// their filtered `templates` array through this one table.
export default function ApprovedTemplateTable({
  templates,
  emptyTitle = "No templates",
  emptyDescription = "No templates match this view.",
  showRejectionReason = false,
  onPreview,
}) {
  const navigate = useNavigate();

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <FileText className="h-5 w-5 text-slate-400" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-slate-800">{emptyTitle}</p>
          <p className="mt-1 text-[13px] text-slate-500">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Template", "Meta Category", "Language", "Meta Status", "Created", "Actions"].map(
                (label) => (
                  <th
                    key={label}
                    className="px-5 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide text-slate-600"
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {templates.map((template) => {
              const metaCfg =
                META_STATUS_CONFIG[template.metaStatus] || META_STATUS_CONFIG.not_submitted;

              return (
                <tr
                  key={template._id}
                  onClick={() => navigate(`/templates/edit/${template._id}`)}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13.5px] font-medium leading-snug text-slate-900">
                        {template.name}
                      </p>
                      {HEADER_TYPE_ICONS[template.headerType] && (
                        (() => {
                          const HeaderIcon = HEADER_TYPE_ICONS[template.headerType];
                          return (
                            <span title={`${template.headerType} header`}>
                              <HeaderIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            </span>
                          );
                        })()
                      )}
                    </div>
                    {template.metaTemplateName && (
                      <p className="mt-0.5 font-mono text-[11.5px] text-slate-400">
                        {template.metaTemplateName}
                      </p>
                    )}
                    {showRejectionReason && template.metaStatus === "REJECTED" && template.rejectionReason && (
                      <p className="mt-1 text-[11.5px] text-red-600">
                        {template.rejectionReason}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-[13px] text-slate-600">
                    {META_CATEGORY_LABELS[template.metaCategory] || "—"}
                  </td>

                  <td className="px-5 py-3.5 text-[13px] text-slate-600">
                    {template.language || "—"}
                  </td>

                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${metaCfg.className}`}
                    >
                      {metaCfg.label}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-[13px] tabular-nums text-slate-500">
                    {formatRelativeDate(template.createdAt)}
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      {onPreview && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview(template);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Preview template"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/templates/edit/${template._id}`);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label={
                          template.metaStatus === "REJECTED" ? "Edit and resubmit" : "Edit template"
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
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
