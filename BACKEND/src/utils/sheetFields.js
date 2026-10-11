// Shared helpers for per-contact data that comes from an uploaded sheet.
//
// Every column of a campaign CSV is kept on the campaign contact as
// `fields` (keyed by a normalised header, e.g. "Due Date" -> "due_date"),
// so template variables can be filled per contact with `{{col:due_date}}`.

// "Due Date " -> "due_date". Must match FRONTEND/src/utils/contactSheet.js toKey().
function toKey(header) {
  return String(header || "")
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function rowToFields(row) {
  const fields = {};
  for (const [header, value] of Object.entries(row || {})) {
    const key = toKey(header);
    if (key) fields[key] = String(value ?? "").trim();
  }
  return fields;
}

// WhatsApp rejects template parameters with newlines, tabs or more than
// four consecutive spaces — collapse them instead of failing the send.
function sanitizeParam(value) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {4,}/g, "   ")
    .trim();
}

/**
 * Resolves a variable value for one contact.
 *   "{{contact_name}}"  -> the contact's name
 *   "{{col:amount}}"    -> that contact's value from the uploaded sheet
 *   anything else       -> sent as typed (same for everyone)
 * `contact` may also be a plain name string (used by test sends).
 */
function resolveValue(value, contact) {
  const name = typeof contact === "string" ? contact : contact?.name;
  const fields = (typeof contact === "object" && contact?.fields) || {};
  const resolved = String(value ?? "")
    .replace(/\{\{contact_name\}\}/g, name || "Customer")
    .replace(/\{\{col:([a-z0-9_]+)\}\}/g, (_, key) => {
      if (key === "name") return fields.name || name || "";
      if (key === "phone") return fields.phone || contact?.phone || "";
      return fields[key] ?? "";
    });
  return sanitizeParam(resolved);
}

module.exports = { toKey, rowToFields, sanitizeParam, resolveValue };
