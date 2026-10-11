import { detectDelimiter, parseCsvLine } from "./csvAnalysis";

/*
 * The campaign contact sheet: an uploaded CSV turned into editable rows.
 *
 *   sheet = {
 *     columns: [{ key, label, role }]   role: "phone" | "name" | "data"
 *     rows:    [{ id, cells: { [key]: string } }]
 *   }
 *
 * The edited sheet is what gets sent (see sheetToCsvFile), so anything
 * fixed in the review table is exactly what the campaign uses.
 */

const PHONE_HEADER = /(phone|mobile|whats\s*app|whatsapp|number|msisdn|contact\s*no|cell)/i;
const NAME_HEADER = /(^|\b)(full\s*name|customer\s*name|contact\s*name|name|customer)(\b|$)/i;

// "Due Date " -> "due_date". Must match BACKEND/src/utils/sheetFields.js toKey().
export function toKey(header) {
  return String(header || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

let rowSeq = 0;
const newRowId = () => `r${Date.now().toString(36)}${(rowSeq++).toString(36)}`;

export const EMPTY_SHEET = { columns: [], rows: [] };

export function parseSheet(text) {
  const normalized = String(text || "").replace(/^\uFEFF/, "").trim();
  if (!normalized) return EMPTY_SHEET;
  const lines = normalized.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return EMPTY_SHEET;

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);

  const used = new Set();
  const columns = headers.map((label, index) => {
    let key = toKey(label) || `column_${index + 1}`;
    let n = 2;
    while (used.has(key)) key = `${toKey(label) || "column"}_${n++}`;
    used.add(key);
    return { key, label: label.trim() || `Column ${index + 1}`, role: "data" };
  });

  const phoneIdx = columns.findIndex((c) => PHONE_HEADER.test(c.label));
  if (phoneIdx >= 0) columns[phoneIdx].role = "phone";
  const nameIdx = columns.findIndex((c, i) => i !== phoneIdx && NAME_HEADER.test(c.label));
  if (nameIdx >= 0) columns[nameIdx].role = "name";

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);
    const cells = {};
    columns.forEach((col, i) => { cells[col.key] = (values[i] ?? "").trim(); });
    return { id: newRowId(), cells };
  }).filter((row) => Object.values(row.cells).some((v) => v !== ""));

  return { columns, rows };
}

export const phoneColumn = (sheet) => sheet.columns.find((c) => c.role === "phone");
export const nameColumn = (sheet) => sheet.columns.find((c) => c.role === "name");

// The header each column is sent under. Phone/name use the fixed names the
// backend expects; every other column keeps its normalised key.
export const serialKey = (column) => (column.role === "phone" ? "phone" : column.role === "name" ? "name" : column.key);

export const phoneDigits = (value) => String(value || "").replace(/\D/g, "");

// Indian 10-digit mobiles get the 91 country code WhatsApp needs.
export function normalizePhone(value) {
  const digits = phoneDigits(value);
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  return digits;
}

export function isValidPhone(value) {
  const digits = normalizePhone(value);
  if (/^91[6-9]\d{9}$/.test(digits)) return true;
  return /^[1-9]\d{10,14}$/.test(digits) && !digits.startsWith("91");
}

/**
 * Checks every row. `requiredKeys` are serial keys whose cells must not be
 * empty (columns mapped to template variables — WhatsApp rejects blanks).
 */
export function validateSheet(sheet, requiredKeys = []) {
  const phoneCol = phoneColumn(sheet);
  const byKey = Object.fromEntries(sheet.columns.map((c) => [serialKey(c), c]));
  const required = requiredKeys.map((k) => byKey[k]).filter(Boolean);

  const issues = new Map(); // rowId -> [{ key, message }]
  const add = (rowId, key, message) => {
    if (!issues.has(rowId)) issues.set(rowId, []);
    issues.get(rowId).push({ key, message });
  };

  const seen = new Map();
  let invalid = 0;
  let duplicates = 0;
  let missing = 0;

  sheet.rows.forEach((row) => {
    if (phoneCol) {
      const raw = row.cells[phoneCol.key];
      if (!raw) { add(row.id, phoneCol.key, "Phone number is missing"); invalid++; }
      else if (!isValidPhone(raw)) { add(row.id, phoneCol.key, "This doesn't look like a valid WhatsApp number"); invalid++; }
      else {
        const norm = normalizePhone(raw);
        if (seen.has(norm)) { add(row.id, phoneCol.key, `Duplicate of row ${seen.get(norm)}`); duplicates++; }
        else seen.set(norm, sheet.rows.indexOf(row) + 1);
      }
    }
    required.forEach((col) => {
      if (!String(row.cells[col.key] || "").trim()) { add(row.id, col.key, `"${col.label}" is empty but used in your message`); missing++; }
    });
  });

  const tenDigit = phoneCol ? sheet.rows.filter((r) => /^[6-9]\d{9}$/.test(phoneDigits(r.cells[phoneCol.key]))).length : 0;

  return {
    issues,
    counts: {
      total: sheet.rows.length,
      needsAttention: issues.size,
      ready: sheet.rows.length - issues.size,
      invalid,
      duplicates,
      missing,
      tenDigit,
    },
  };
}

/* ── edits (all return a new sheet) ─────────────────────────────── */

export const updateCell = (sheet, rowId, key, value) => ({
  ...sheet,
  rows: sheet.rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [key]: value } } : r)),
});

export const deleteRow = (sheet, rowId) => ({ ...sheet, rows: sheet.rows.filter((r) => r.id !== rowId) });

export const addRow = (sheet) => ({
  ...sheet,
  rows: [{ id: newRowId(), cells: Object.fromEntries(sheet.columns.map((c) => [c.key, ""])) }, ...sheet.rows],
});

export function setColumnRole(sheet, key, role) {
  return {
    ...sheet,
    columns: sheet.columns.map((c) => {
      if (c.key === key) return { ...c, role };
      if (role !== "data" && c.role === role) return { ...c, role: "data" };
      return c;
    }),
  };
}

export function removeDuplicates(sheet) {
  const phoneCol = phoneColumn(sheet);
  if (!phoneCol) return sheet;
  const seen = new Set();
  return {
    ...sheet,
    rows: sheet.rows.filter((r) => {
      const raw = r.cells[phoneCol.key];
      if (!raw || !isValidPhone(raw)) return true;
      const norm = normalizePhone(raw);
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    }),
  };
}

export function addCountryCode(sheet) {
  const phoneCol = phoneColumn(sheet);
  if (!phoneCol) return sheet;
  return {
    ...sheet,
    rows: sheet.rows.map((r) => {
      const digits = phoneDigits(r.cells[phoneCol.key]);
      return /^[6-9]\d{9}$/.test(digits) ? { ...r, cells: { ...r.cells, [phoneCol.key]: `91${digits}` } } : r;
    }),
  };
}

/* ── variables ──────────────────────────────────────────────────── */

export const columnToken = (column) => `{{col:${serialKey(column)}}}`;

const COLUMN_TOKEN = /^\{\{col:([a-z0-9_]+)\}\}$/;
export function tokenColumnKey(value) {
  if (value === "{{contact_name}}") return "name";
  const m = COLUMN_TOKEN.exec(String(value || "").trim());
  return m ? m[1] : null;
}

// Serial keys of the columns a set of variable values depends on.
export function requiredKeysFor(values = []) {
  return [...new Set(values.map(tokenColumnKey).filter(Boolean))];
}

// Fills tokens with one row's values (for previews and test sends).
export function resolveForRow(value, sheet, row) {
  if (!row) return String(value || "");
  const byKey = Object.fromEntries(sheet.columns.map((c) => [serialKey(c), c]));
  return String(value || "")
    .replace(/\{\{contact_name\}\}/g, () => (byKey.name ? row.cells[byKey.name.key] : "") || "Customer")
    .replace(/\{\{col:([a-z0-9_]+)\}\}/g, (_, key) => (byKey[key] ? row.cells[byKey[key].key] || "" : ""));
}

/**
 * Suggests a column for each template variable. Named variables
 * ({{amount}}) match a column with the same key; numbered ones are filled
 * in sheet order: name first, then the remaining non-phone columns.
 */
export function suggestMapping(sheet, tokenNames = []) {
  const usable = sheet.columns.filter((c) => c.role !== "phone");
  const name = usable.find((c) => c.role === "name");
  const others = usable.filter((c) => c.role !== "name");
  const queue = [...(name ? [name] : []), ...others];
  const taken = new Set();

  return tokenNames.map((token) => {
    const byName = usable.find((c) => !taken.has(c.key) && (serialKey(c) === toKey(token) || c.key === toKey(token)));
    const pick = byName || queue.find((c) => !taken.has(c.key));
    if (!pick) return "";
    taken.add(pick.key);
    return columnToken(pick);
  });
}

/* ── output ─────────────────────────────────────────────────────── */

const csvCell = (value) => {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function sheetToCsvFile(sheet, filename = "contacts.csv") {
  const header = sheet.columns.map((c) => csvCell(serialKey(c))).join(",");
  const lines = sheet.rows.map((row) =>
    sheet.columns
      .map((c) => csvCell(c.role === "phone" ? normalizePhone(row.cells[c.key]) : row.cells[c.key]))
      .join(","),
  );
  return new File([[header, ...lines].join("\n")], filename, { type: "text/csv" });
}
