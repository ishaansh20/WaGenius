// Single shared filter-builder for anything that queries the Contact
// collection by these facets — used by both the plain Contacts list
// endpoint and live Segment evaluation, so there is exactly one place that
// defines what "search"/"tag"/"source"/"optedOut"/date-range mean.
const buildContactFilter = ({ search, tag, tags, source, optedOut, dateFrom, dateTo }) => {
  const filter = {};

  if (search) {
    const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: regex }, { phone: regex }];
  }

  // Accepts either a single tag (?tag=hot, the plain Contacts list query
  // param) or an array of tags (a Segment's saved filter) — both map to the
  // same underlying Contact.tags match.
  if (Array.isArray(tags) && tags.length > 0) filter.tags = { $in: tags };
  else if (tag) filter.tags = tag;

  if (source) filter.source = source;

  if (optedOut === "true" || optedOut === true) filter.optedOut = true;
  else if (optedOut === "false" || optedOut === false) filter.optedOut = false;

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  return filter;
};

module.exports = { buildContactFilter };
