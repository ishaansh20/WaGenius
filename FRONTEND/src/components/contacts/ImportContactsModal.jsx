import { useState } from "react";
import { CheckCircle, FileText, UploadCloud, X } from "lucide-react";
import { importContacts } from "../../services/api";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">{title || "Import Contacts"}</h2>
            <p className="mt-0.5 text-[12px] text-slate-400">
              {description || "Upload a CSV with name, phone, and (optionally) tags columns."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("import-contacts-file")?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 py-8 text-center transition-all ${
                dragActive
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-dashed border-slate-200 bg-slate-50 hover:border-slate-300"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
                <UploadCloud className={`h-4 w-4 ${dragActive ? "text-emerald-500" : "text-slate-400"}`} />
              </div>
              <div>
                <p className="text-[13px] font-medium text-slate-700">
                  {dragActive ? "Drop file here" : "Drag & drop a CSV file"}
                </p>
                <p className="text-[12px] text-slate-400">
                  or <span className="font-semibold text-emerald-600">browse</span> — name, phone, tags columns
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
              <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                    <FileText className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-slate-800">{file.name}</p>
                    <p className="text-[11px] text-slate-500">{analysis.totalContacts} rows detected</p>
                  </div>
                </div>
                {!summary && (
                  <div className="flex shrink-0 items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <button
                      type="button"
                      onClick={() => { setFile(null); setAnalysis(EMPTY_CSV_ANALYSIS); setSummary(null); }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {summary && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[12.5px]">
                  <p className="font-medium text-slate-800">Import complete</p>
                  <p className="mt-1 text-slate-600">
                    {summary.created} created · {summary.updated} updated · {summary.skipped} skipped
                    {summary.invalid > 0 ? ` · ${summary.invalid} invalid (missing phone)` : ""}
                  </p>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-700">
              {error}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {summary ? "Done" : "Cancel"}
            </button>
            {!summary && (
              <button
                type="button"
                onClick={handleImport}
                disabled={!file || submitting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Importing…" : "Import"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
