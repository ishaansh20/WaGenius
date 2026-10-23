// Pure helpers over a company's WhatsApp number list (no DB, no network).
//
// A company can have several numbers inside its one WhatsApp Business
// Account. `whatsapp.phoneNumberId` is always the DEFAULT sending number
// (kept for backward compatibility with every older code path); the full
// list lives in `whatsapp.phoneNumbers`. A company connected before
// multi-number support has no list yet — its single number is derived here.

const entriesOf = (company) => {
  const w = company?.whatsapp || {};
  const list = (w.phoneNumbers || []).map((n) => (typeof n.toObject === "function" ? n.toObject() : { ...n }));

  if (w.phoneNumberId && !list.some((n) => n.phoneNumberId === w.phoneNumberId)) {
    list.unshift({
      phoneNumberId: w.phoneNumberId,
      displayNumber: "",
      verifiedName: "",
      qualityRating: "",
      status: "",
      isPrimary: list.length === 0,
    });
  }

  return list;
};

// The number that owns chats/campaigns created before multi-number support
// (they have no number stamped on them).
const primaryNumberId = (company) => {
  const list = entriesOf(company);
  return list.find((n) => n.isPrimary)?.phoneNumberId || list[0]?.phoneNumberId || "";
};

const isCompanyNumber = (company, phoneNumberId) =>
  Boolean(phoneNumberId) && entriesOf(company).some((n) => n.phoneNumberId === String(phoneNumberId));

// The number a send/save should use: the requested one if it genuinely
// belongs to this company, otherwise the company default. Never returns a
// number from another company.
const resolveNumberId = (company, requested) => {
  if (requested && isCompanyNumber(company, requested)) return String(requested);
  return company?.whatsapp?.phoneNumberId || "";
};

module.exports = { entriesOf, primaryNumberId, isCompanyNumber, resolveNumberId };
