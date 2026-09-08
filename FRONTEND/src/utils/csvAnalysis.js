export const EMPTY_CSV_ANALYSIS = {
  totalContacts: 0,
  validContacts: 0,
  invalidContacts: 0,
  duplicateContacts: 0,
  duplicateNumbers: [],
  columns: [],
};

export function detectDelimiter(line) {
  const delimiters = [",", ";", "\t"];
  return delimiters.reduce(
    (best, delimiter) => {
      const matches = line.split(delimiter).length - 1;
      if (matches > best.matches) return { delimiter, matches };
      return best;
    },
    { delimiter: ",", matches: -1 },
  ).delimiter;
}

export function parseCsvLine(line, delimiter) {
  const cells = [];
  let current = "";
  let isQuoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (isQuoted && line[i + 1] === '"') { current += '"'; i++; }
      else isQuoted = !isQuoted;
      continue;
    }
    if (ch === delimiter && !isQuoted) { cells.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

export function parseCsvAnalysis(text) {
  const normalizedText = text.replace(/^\uFEFF/, "").trim();
  if (!normalizedText) return EMPTY_CSV_ANALYSIS;
  const lines = normalizedText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return EMPTY_CSV_ANALYSIS;
  const delimiter = detectDelimiter(lines[0]);
  const columns = parseCsvLine(lines[0], delimiter).map((c) => c.trim()).filter(Boolean);
  const dataRows = lines.slice(1);
  const phoneColIdx = columns.findIndex((c) => /(phone|mobile|contact|whatsapp|number|msisdn)/i.test(c));
  const nameColIdx = columns.findIndex((c) => /(name|fullname|full name)/i.test(c));
  let totalContacts = 0, validContacts = 0;
  const seenPhones = new Set(), duplicateNumbers = [];
  dataRows.forEach((rowText) => {
    const row = parseCsvLine(rowText, delimiter);
    if (!row.some((cell) => cell.trim().length > 0)) return;
    totalContacts++;
    const phoneValue = phoneColIdx >= 0 ? row[phoneColIdx] || "" : "";
    const nameValue = nameColIdx >= 0 ? row[nameColIdx] || "" : "";
    const phoneDigits = phoneValue.replace(/\D/g, "");
    if (phoneDigits) {
      if (seenPhones.has(phoneDigits)) duplicateNumbers.push(phoneDigits);
      else seenPhones.add(phoneDigits);
    }
    const isValid = phoneColIdx >= 0
      ? /^(91)?[6-9]\d{9}$/.test(phoneDigits)
      : Boolean(nameValue.trim() || row.length > 0);
    if (isValid) validContacts++;
  });
  return { totalContacts, validContacts, invalidContacts: Math.max(totalContacts - validContacts, 0), duplicateContacts: duplicateNumbers.length, duplicateNumbers, columns };
}
