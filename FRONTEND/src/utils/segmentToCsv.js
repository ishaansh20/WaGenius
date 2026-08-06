import { fetchSegmentContacts } from "../services/api";

// Builds a real File object matching the exact header shape the backend's
// campaign-upload CSV parser already expects (row.name, row.phone) — reused
// by both the ad hoc "select rows and Broadcast" flow and this segment flow,
// so a segment rides the existing /api/campaigns/upload endpoint unchanged.
export function contactsToCsvFile(contacts, filename = "contacts-selection.csv") {
  const header = "name,phone";
  const rows = contacts.map((c) => `${c.name || ""},${c.phone}`);
  const csv = [header, ...rows].join("\n");
  return new File([csv], filename, { type: "text/csv" });
}

export async function fetchSegmentAsCsvFile(segmentId, segmentName = "segment") {
  const res = await fetchSegmentContacts(segmentId);
  const eligible = (res.contacts || []).filter((c) => !c.optedOut);
  const excludedCount = (res.contacts || []).length - eligible.length;
  const safeName = segmentName.replace(/[^a-z0-9-_]+/gi, "_");
  const file = contactsToCsvFile(eligible, `${safeName}.csv`);
  return { file, count: eligible.length, excludedCount };
}
