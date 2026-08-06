// Single source of truth for template-related config, shared by the
// Templates, Approved Templates, and Campaign pages so category lists,
// status badges, and language options never drift out of sync.

export const DEFAULT_CATEGORIES = ["Marketing", "Followup", "Broadcast", "Support"];

// Merges the fixed defaults with whatever custom categories a user has
// created (via /api/template-categories) — the one shared place this list
// gets assembled, so every page that shows category options (template
// create/edit, campaign create, campaign history filter) stays in sync.
export function mergeCategories(categoryDocs = []) {
  return [
    ...DEFAULT_CATEGORIES,
    ...categoryDocs.map((c) => c.name).filter((n) => !DEFAULT_CATEGORIES.includes(n)),
  ];
}

export const META_CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];

export const META_CATEGORY_LABELS = {
  MARKETING: "Marketing",
  UTILITY: "Utility",
  AUTHENTICATION: "Authentication",
};

export const LANGUAGES = [
  { code: "en_US", label: "English (US)" },
  { code: "en_GB", label: "English (UK)" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
];

export const QUICK_VARS = ["{{name}}", "{{phone}}", "{{company}}", "{{amount}}", "{{date}}"];

export const STATUS_CONFIG = {
  active: { label: "Active", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  draft: { label: "Draft", className: "border-amber-200 bg-amber-50 text-amber-700" },
  pending: { label: "Pending", className: "border-blue-200 bg-blue-50 text-blue-700" },
  archived: { label: "Archived", className: "border-slate-200 bg-slate-100 text-slate-500" },
};

export const CATEGORY_CONFIG = {
  Marketing: "border-purple-200 bg-purple-50 text-purple-700",
  Followup: "border-blue-200 bg-blue-50 text-blue-700",
  Broadcast: "border-amber-200 bg-amber-50 text-amber-700",
  Support: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export const META_STATUS_CONFIG = {
  not_submitted: { label: "Not submitted", className: "border-slate-200 bg-slate-100 text-slate-500" },
  PENDING: { label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-700" },
  APPROVED: { label: "Approved", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Rejected", className: "border-red-200 bg-red-50 text-red-700" },
  PAUSED: { label: "Paused", className: "border-amber-200 bg-amber-50 text-amber-700" },
  DISABLED: { label: "Disabled", className: "border-red-200 bg-red-50 text-red-700" },
};

// Also treated as "needs attention" alongside PENDING/REJECTED in the
// Approvals queue — a paused/disabled template silently stops delivering.
export const NEEDS_ATTENTION_STATUSES = ["PENDING", "REJECTED", "PAUSED", "DISABLED"];

// Extracts every {{token}} in a body — named (from the QUICK_VARS insert
// buttons above, e.g. {{name}}) or numeric ({{1}}) — as an ordered list of
// unique token names, in order of first appearance. Mirrors the backend's
// extractVariableTokens in templateService.js, which is what actually
// converts these to Meta's required {{1}}, {{2}}... at submission time.
export function extractVariableTokens(text = "") {
  const seen = [];
  for (const match of text.matchAll(/\{\{(\w+)\}\}/g)) {
    if (!seen.includes(match[1])) seen.push(match[1]);
  }
  return seen;
}

export function countTemplateVariables(text = "") {
  return extractVariableTokens(text).length;
}

// A template is "on the Meta track" once a submission has been attempted,
// even if it was later rejected — that's what separates it from a plain
// local/free-text template in the Approved Templates views.
export function isMetaTemplate(template) {
  return Boolean(template.metaTemplateName) || template.metaStatus !== "not_submitted";
}
