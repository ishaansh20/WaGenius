import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Phone,
  Plus,
  Search,
  Table2,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button, Modal } from "../ui";
import { cn } from "../../utils/cn";
import {
  addCountryCode,
  addRow,
  columnToken,
  deleteRow,
  removeDuplicates,
  serialKey,
  setColumnRole,
  tokenColumnKey,
  updateCell,
} from "../../utils/contactSheet";

const PAGE_SIZE = 50;

/* ── Role picker shown in each column header ─────────────────────── */
function RoleSelect({ value, onChange, label }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`What is in the "${label}" column`}
      className="mt-1 h-7 w-full cursor-pointer rounded-md border border-line bg-surface px-1.5 text-[12px] font-medium text-ink-muted focus:border-brand-600 focus:outline-none"
    >
      <option value="phone">Phone number</option>
      <option value="name">Customer name</option>
      <option value="data">Other info</option>
    </select>
  );
}

const roleIcon = (role) =>
  role === "phone" ? <Phone size={13} className="text-brand-700" /> : role === "name" ? <UserRound size={13} className="text-brand-700" /> : null;

/**
 * Full-screen review table. Every edit is applied to the sheet right away,
 * and the edited sheet is what the campaign sends.
 */
export function ContactSheetEditor({ open, onClose, sheet, onChange, validation, initialFilter = "all" }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [page, setPage] = useState(0);
  const { issues, counts } = validation;

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sheet.rows.filter((row) => {
      if (filter === "attention" && !issues.has(row.id)) return false;
      if (!q) return true;
      return Object.values(row.cells).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [sheet.rows, query, filter, issues]);

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = visibleRows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const rowNumber = useMemo(() => new Map(sheet.rows.map((r, i) => [r.id, i + 1])), [sheet.rows]);

  const cellIssue = (rowId, key) => issues.get(rowId)?.find((i) => i.key === key)?.message;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      className="sm:max-w-[min(1200px,calc(100vw-48px))]"
      title="Review contacts"
      description={`${counts.total} contacts · ${counts.ready} ready${counts.needsAttention ? ` · ${counts.needsAttention} need attention` : ""}. Changes apply as you type.`}
      footer={
        <>
          <span className="mr-auto self-center text-[13px] text-ink-muted">
            {counts.needsAttention === 0 ? "Everything looks good." : "Fix or remove the highlighted rows before sending."}
          </span>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Search name, phone or any value…"
            className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-subtle focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12"
          />
        </div>
        <div className="inline-flex rounded-lg border border-line bg-surface p-1">
          {[
            { value: "all", label: `All ${counts.total}` },
            { value: "attention", label: `Needs attention ${counts.needsAttention}` },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setFilter(tab.value); setPage(0); }}
              className={cn(
                "h-8 rounded-md px-3 text-[13px] font-medium transition-colors",
                filter === tab.value ? "bg-brand-900 text-white" : "text-ink-muted hover:bg-canvas hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {counts.tenDigit > 0 && (
          <Button variant="secondary" size="sm" onClick={() => onChange(addCountryCode(sheet))}>
            Add 91 to {counts.tenDigit} number{counts.tenDigit === 1 ? "" : "s"}
          </Button>
        )}
        {counts.duplicates > 0 && (
          <Button variant="secondary" size="sm" leftIcon={Copy} onClick={() => onChange(removeDuplicates(sheet))}>
            Remove {counts.duplicates} duplicate{counts.duplicates === 1 ? "" : "s"}
          </Button>
        )}
        <Button variant="secondary" size="sm" leftIcon={Plus} onClick={() => { onChange(addRow(sheet)); setFilter("all"); setPage(0); }}>
          Add contact
        </Button>
      </div>

      {/* Grid */}
      <div className="relative mt-4 max-h-[58vh] overflow-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-[14px]">
          <thead className="sticky top-0 z-10 bg-[#f6f7f6]">
            <tr>
              <th className="w-14 border-b border-line px-3 py-2.5 text-[12px] font-medium text-ink-muted">#</th>
              {sheet.columns.map((col) => (
                <th key={col.key} className="min-w-[160px] border-b border-line px-2 py-2 align-top">
                  <span className="flex items-center gap-1.5 px-1 text-[13px] font-semibold text-ink">
                    {roleIcon(col.role)}
                    <span className="truncate">{col.label}</span>
                  </span>
                  <RoleSelect label={col.label} value={col.role} onChange={(role) => onChange(setColumnRole(sheet, col.key, role))} />
                </th>
              ))}
              <th className="w-12 border-b border-line" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const rowIssues = issues.get(row.id);
              return (
                <tr key={row.id} className={cn("group", rowIssues && "bg-danger-soft/40")}>
                  <td className="border-b border-line px-3 py-1.5 text-[13px] tabular-nums text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      {rowIssues ? (
                        <AlertTriangle size={13} className="text-danger" aria-label="Needs attention" />
                      ) : (
                        <CheckCircle2 size={13} className="text-brand-600" aria-label="Ready" />
                      )}
                      {rowNumber.get(row.id)}
                    </span>
                  </td>
                  {sheet.columns.map((col) => {
                    const issue = cellIssue(row.id, col.key);
                    return (
                      <td key={col.key} className="border-b border-line px-1.5 py-1">
                        <input
                          value={row.cells[col.key] ?? ""}
                          onChange={(e) => onChange(updateCell(sheet, row.id, col.key, e.target.value))}
                          title={issue || undefined}
                          aria-invalid={Boolean(issue)}
                          aria-label={`${col.label}, row ${rowNumber.get(row.id)}`}
                          className={cn(
                            "h-9 w-full rounded-md border bg-transparent px-2 text-[14px] text-ink transition-colors focus:bg-surface focus:outline-none focus:ring-2",
                            issue
                              ? "border-danger/50 bg-surface text-danger focus:ring-danger/20"
                              : "border-transparent hover:border-line focus:border-brand-600 focus:ring-brand-600/15",
                            col.role === "phone" && "tabular-nums",
                          )}
                        />
                        {issue && <p className="px-2 pt-0.5 text-[12px] leading-tight text-danger">{issue}</p>}
                      </td>
                    );
                  })}
                  <td className="border-b border-line px-1 text-right">
                    <button
                      type="button"
                      onClick={() => onChange(deleteRow(sheet, row.id))}
                      aria-label={`Remove row ${rowNumber.get(row.id)}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle opacity-60 transition hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={sheet.columns.length + 2} className="px-4 py-12 text-center text-[14px] text-ink-muted">
                  {filter === "attention" ? "Nothing needs attention. Every contact is ready." : "No contacts match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {visibleRows.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between text-[13px] text-ink-muted">
          <span className="tabular-nums">
            Showing {safePage * PAGE_SIZE + 1}–{Math.min(visibleRows.length, (safePage + 1) * PAGE_SIZE)} of {visibleRows.length}
          </span>
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="icon-sm" aria-label="Previous page" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft size={15} />
            </Button>
            <span className="px-1 tabular-nums">Page {safePage + 1} of {pageCount}</span>
            <Button variant="secondary" size="icon-sm" aria-label="Next page" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Compact sheet preview for the form ──────────────────────────── */
export function SheetPreview({ sheet, validation, onReview, onReviewIssues }) {
  const { counts, issues } = validation;
  const previewRows = sheet.rows.slice(0, 5);

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#f6f7f6] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
            <Table2 size={15} className="text-brand-700" /> {counts.total} contacts
          </span>
          <span className="rounded-full bg-success-soft px-2 py-0.5 font-medium text-success">{counts.ready} ready</span>
          {counts.needsAttention > 0 && (
            <span className="rounded-full bg-danger-soft px-2 py-0.5 font-medium text-danger">{counts.needsAttention} need attention</span>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={onReview}>
          Review and edit
        </Button>
      </div>

      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line">
              <th className="w-10 px-3 py-2 font-medium text-ink-muted">#</th>
              {sheet.columns.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-3 py-2 font-medium text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    {roleIcon(col.role)}
                    {col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {previewRows.map((row, i) => (
              <tr key={row.id} className={issues.has(row.id) ? "bg-danger-soft/40" : undefined}>
                <td className="px-3 py-2 tabular-nums text-ink-muted">{i + 1}</td>
                {sheet.columns.map((col) => (
                  <td key={col.key} className="max-w-[200px] truncate whitespace-nowrap px-3 py-2 text-ink">
                    {row.cells[col.key] || <span className="text-ink-subtle">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(sheet.rows.length > 5 || counts.needsAttention > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-[13px]">
          <span className="text-ink-muted">
            {sheet.rows.length > 5 ? `Showing 5 of ${sheet.rows.length}` : " "}
          </span>
          {counts.needsAttention > 0 && (
            <button type="button" onClick={onReviewIssues} className="inline-flex items-center gap-1.5 font-medium text-danger hover:underline">
              <AlertTriangle size={14} /> Fix {counts.needsAttention} row{counts.needsAttention === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── One template variable: a sheet column, or fixed text ────────── */
export function VariableSourceInput({ index, value, onChange, sheet, sampleRow }) {
  const linkedKey = tokenColumnKey(value);
  const hasSheet = sheet.columns.length > 0;
  // Until the user picks a mode, follow whether a sheet is loaded.
  const [modeChoice, setMode] = useState(null);
  const effectiveMode = linkedKey ? "column" : modeChoice ?? (hasSheet ? "column" : "fixed");
  const options = sheet.columns;
  const linked = options.find((c) => serialKey(c) === linkedKey);

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[13px] font-semibold text-brand-800">{`{{${index + 1}}}`}</span>
        <div className="inline-flex rounded-md bg-canvas p-0.5 text-[12px] font-medium">
          {[
            { v: "column", label: "From sheet" },
            { v: "fixed", label: "Same for all" },
          ].map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => {
                setMode(m.v);
                if (m.v === "fixed" && linkedKey) onChange("");
              }}
              className={cn(
                "rounded px-2 py-1 transition-colors",
                effectiveMode === m.v ? "bg-surface text-ink shadow-[0_1px_2px_rgba(11,59,46,0.12)]" : "text-ink-muted hover:text-ink",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {effectiveMode === "column" ? (
        <>
          <select
            value={linked ? columnToken(linked) : ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={!hasSheet}
            aria-label={`Column for {{${index + 1}}}`}
            className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-line-strong bg-surface px-3 text-[14px] text-ink focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-subtle"
          >
            <option value="">{hasSheet ? "Choose a column…" : "Add contacts below to pick a column"}</option>
            {options.map((col) => (
              <option key={col.key} value={columnToken(col)}>
                {col.label}
                {sampleRow?.cells[col.key] ? ` — e.g. ${String(sampleRow.cells[col.key]).slice(0, 28)}` : ""}
              </option>
            ))}
          </select>
          {linked && sampleRow && (
            <p className="mt-1.5 truncate text-[12px] text-ink-muted">
              First contact gets: <span className="font-medium text-ink">{sampleRow.cells[linked.key] || "(empty)"}</span>
            </p>
          )}
        </>
      ) : (
        <input
          type="text"
          value={linkedKey ? "" : value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Text everyone receives"
          aria-label={`Text for {{${index + 1}}}`}
          className="mt-2 h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-[14px] text-ink placeholder:text-ink-subtle focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12"
        />
      )}
    </div>
  );
}
