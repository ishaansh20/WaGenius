import { useState } from "react";
import { CheckCircle, FileText, UploadCloud, X } from "lucide-react";
import { importContacts } from "../../services/api";
import { Button } from "../ui";
import { EMPTY_CSV_ANALYSIS, parseCsvAnalysis } from "../../utils/csvAnalysis";

export default function ImportContactsModal({ isOpen, onClose, onImported, segmentId, title, description }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [analysis, setAnalysis] = useState(EMPTY_CSV_ANALYSIS);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleClose = () => {
    setFile(null);
    setAnalysis(EMPTY_CSV_ANALYSIS);
    setSummary(null);
    setError("");
    onClose();
  };

  async function analyzeFile(f) {
    try {
      const text = await f.text();
      setAnalysis(parseCsvAnalysis(text));
    } catch {
      setAnalysis(EMPTY_CSV_ANALYSIS);
    }
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setSummary(null); analyzeFile(f); }
  }

  function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); setDragActive(true); }
  function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); setDragActive(false); }
  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setSummary(null); analyzeFile(f); }
  }

  async function handleImport() {
    if (!file) return;
    try {
      setSubmitting(true);
      setError("");
      const res = await importContacts(file, segmentId);
      setSummary(res.summary);
      onImported();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to import contacts");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/40 sm:items-center sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-contacts-title"
        className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-[var(--shadow-pop)] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 id="import-contacts-title" className="text-[18px] font-semibold text-ink">
              {title || "Import contacts"}
            </h2>
            <p className="mt-0.5 text-[14px] text-ink-muted">
              {description || "Upload a CSV with name, phone, and (optionally) tags columns."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="-mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("import-contacts-file")?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragActive
                  ? "border-brand-600 bg-brand-50"
                  : "border-line-strong bg-canvas hover:border-ink-subtle"
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-card)] ${
                  dragActive ? "text-brand-700" : "text-ink-muted"
                }`}
              >
                <UploadCloud size={20} />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-ink">
                  {dragActive ? "Drop file here" : "Drag & drop a CSV file"}
                </p>
                <p className="mt-1 text-[14px] text-ink-muted">
                  or <span className="font-semibold text-brand-700">browse</span> — name, phone, tags columns
                </p>
              </div>
              <input
                id="import-contacts-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-brand-700">
                    <FileText size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-ink">{file.name}</p>
                    <p className="text-[13px] text-ink-muted">
                      <span className="tabular-nums">{analysis.totalContacts}</span> rows detected
                    </p>
                  </div>
                </div>
                {!summary && (
                  <div className="flex shrink-0 items-center gap-2">
                    <CheckCircle size={18} className="text-brand-600" />
                    <button
                      type="button"
                      onClick={() => { setFile(null); setAnalysis(EMPTY_CSV_ANALYSIS); setSummary(null); }}
                      aria-label="Remove file"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface hover:text-ink"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {summary && (
                <div className="mt-3 rounded-xl bg-canvas px-4 py-3.5 text-[14px]">
                  <p className="font-semibold text-ink">Import complete</p>
                  <p className="mt-1 text-ink-muted">
                    {summary.created} created · {summary.updated} updated · {summary.skipped} skipped
                    {summary.invalid > 0 ? ` · ${summary.invalid} invalid (missing phone)` : ""}
                  </p>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <Button variant="secondary" onClick={handleClose}>
            {summary ? "Done" : "Cancel"}
          </Button>
          {!summary && (
            <Button
              onClick={handleImport}
              disabled={!file || submitting}
              leftIcon={UploadCloud}
              className="disabled:cursor-not-allowed"
            >
              {submitting ? "Importing…" : "Import"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
