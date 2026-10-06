import { cn } from "../../utils/cn";
import Skeleton from "./Skeleton";

/**
 * Lightweight table shell. Callers render their own <tr>/<td> rows via
 * children so existing row logic (selection, actions) can be kept as-is.
 *
 * columns: [{ key, label, className? }]
 */
export default function Table({ columns, loading = false, loadingRows = 5, empty, className, children }) {
  const hasRows = Array.isArray(children) ? children.some(Boolean) : !!children;

  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#f6f7f3]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted",
                    column.className,
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line [&_td]:px-4 [&_td]:py-3.5 [&_tr]:transition-colors [&_tr:hover]:bg-brand-50/40">
            {loading
              ? Array.from({ length: loadingRows }).map((_, row) => (
                  <tr key={row}>
                    {columns.map((column) => (
                      <td key={column.key}>
                        <Skeleton className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : children}
          </tbody>
        </table>
      </div>
      {!loading && !hasRows && empty}
    </div>
  );
}
