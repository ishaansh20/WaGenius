// Mirrors the exact logic in FRONTEND/src/pages/Templates/CreateApprovedTemplatePage.jsx's
// slugify() — kept in sync manually, since the two npm roots don't share a
// package to import across. Used to auto-generate Meta's required
// lowercase/underscore-only template name from a human-friendly name.
const slugify = (value = "") =>
  value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");

// Dash-style, for Company.slug — a different format than the underscore
// style above (that one deliberately mirrors Meta's template-name rules).
const slugifyCompanyName = (value = "") =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

module.exports = { slugify, slugifyCompanyName };
