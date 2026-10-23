const axios = require("axios");
const Company = require("../../models/company");
const Subscription = require("../../models/subscription");
const { withRetry } = require("../../utils/withRetry");
const { getCompanyWhatsAppCredentials } = require("./companyCredentials");
const { entriesOf, isCompanyNumber } = require("../../utils/whatsappNumberList");

const QUALITY_LABELS = { GREEN: "High", YELLOW: "Medium", RED: "Low", UNKNOWN: "Unknown" };

// How many numbers the company's plan allows. null = no limit (also when the
// company has no plan limits configured, mirroring planGate's checkLimit).
const getPlanNumberLimit = async (companyId) => {
  const subscription = await Subscription.findOne({ companyId }).populate("planId");
  const limit = subscription?.planId?.limits?.whatsappNumbers;
  if (limit === undefined || limit === null || limit === -1) return null;
  return limit;
};

const toPublicNumber = (entry, defaultPhoneNumberId) => ({
  phoneNumberId: entry.phoneNumberId,
  displayNumber: entry.displayNumber || "",
  verifiedName: entry.verifiedName || "",
  qualityRating: entry.qualityRating || "",
  qualityLabel: QUALITY_LABELS[entry.qualityRating] || "",
  status: entry.status || "",
  isDefault: entry.phoneNumberId === defaultPhoneNumberId,
});

// Everything the UI needs to show and switch numbers. Never includes secrets.
const listCompanyNumbers = async (companyId) => {
  const company = await Company.findById(companyId).select("whatsapp").lean();
  const defaultPhoneNumberId = company?.whatsapp?.phoneNumberId || "";
  const numbers = entriesOf(company).map((n) => toPublicNumber(n, defaultPhoneNumberId));
  const limit = await getPlanNumberLimit(companyId);

  return {
    connected: company?.whatsapp?.connected === true,
    defaultPhoneNumberId,
    numbers,
    limit,
    canAddMore: limit === null || numbers.length < limit,
  };
};

// Pulls the numbers that exist in the company's own WhatsApp Business Account
// from Meta and merges them into the company's list. Only ever touches this
// company's list, using this company's own token and WABA. Numbers beyond the
// plan's limit are reported, not added.
const syncCompanyNumbers = async (companyId) => {
  const credentials = await getCompanyWhatsAppCredentials(companyId);
  if (!credentials?.accessToken || !credentials?.wabaId) {
    const error = new Error("WhatsApp is not connected for this company yet.");
    error.statusCode = 400;
    throw error;
  }

  const baseUrl = `https://graph.facebook.com/${credentials.apiVersion}`;
  const response = await withRetry(
    () =>
      axios.get(`${baseUrl}/${credentials.wabaId}/phone_numbers`, {
        params: {
          access_token: credentials.accessToken,
          fields: "id,display_phone_number,verified_name,quality_rating,status",
          limit: 100,
        },
        timeout: 15000,
      }),
    { label: "syncCompanyNumbers" },
  );

  const fromMeta = response.data?.data || [];
  const company = await Company.findById(companyId).select("whatsapp");
  const entries = entriesOf(company);
  const limit = await getPlanNumberLimit(companyId);

  // The number the account was connected with owns all older chats — pin it
  // as primary before anything else is added.
  if (entries.length > 0 && !entries.some((n) => n.isPrimary)) {
    entries[0].isPrimary = true;
  }

  const skippedByPlan = [];

  for (const meta of fromMeta) {
    const fields = {
      displayNumber: meta.display_phone_number || "",
      verifiedName: meta.verified_name || "",
      qualityRating: meta.quality_rating || "",
      status: meta.status || "",
    };
    const existing = entries.find((n) => n.phoneNumberId === String(meta.id));

    if (existing) {
      Object.assign(existing, fields);
    } else if (limit === null || entries.length < limit) {
      entries.push({ phoneNumberId: String(meta.id), ...fields, isPrimary: false, addedAt: new Date() });
    } else {
      skippedByPlan.push({ phoneNumberId: String(meta.id), displayNumber: fields.displayNumber });
    }
  }

  await Company.updateOne({ _id: companyId }, { $set: { "whatsapp.phoneNumbers": entries } });

  return { skippedByPlan, found: fromMeta.length };
};

// Changes which number is used by default (campaigns, new chats). Existing
// chats keep replying from the number they belong to.
const setDefaultNumber = async (companyId, phoneNumberId) => {
  const company = await Company.findById(companyId).select("whatsapp").lean();
  const entry = entriesOf(company).find((n) => n.phoneNumberId === String(phoneNumberId));

  if (!entry) {
    const error = new Error("That number isn't linked to this company.");
    error.statusCode = 404;
    throw error;
  }

  if (entry.status && entry.status !== "CONNECTED") {
    const error = new Error("That number isn't connected on WhatsApp yet, so it can't send messages.");
    error.statusCode = 400;
    throw error;
  }

  // Persist the list too, so a company that only had the derived single
  // number gets a real list with its original number pinned as primary.
  const entries = entriesOf(company);
  if (!entries.some((n) => n.isPrimary)) entries[0].isPrimary = true;

  await Company.updateOne(
    { _id: companyId },
    { $set: { "whatsapp.phoneNumberId": entry.phoneNumberId, "whatsapp.phoneNumbers": entries } },
  );
};

// Called for inbound traffic that Meta delivered for this company's WABA. If
// the receiving number isn't in the list yet (added in Meta after the last
// sync) it is registered so the reply can go out from the same number.
// Receiving is never blocked by the plan limit.
const ensureNumberRegistered = async (companyId, { phoneNumberId, displayNumber }) => {
  if (!phoneNumberId) return;

  const company = await Company.findById(companyId).select("whatsapp");
  if (!company || isCompanyNumber(company, phoneNumberId)) return;

  const entries = entriesOf(company);
  if (entries.length > 0 && !entries.some((n) => n.isPrimary)) entries[0].isPrimary = true;
  entries.push({
    phoneNumberId: String(phoneNumberId),
    displayNumber: displayNumber || "",
    verifiedName: "",
    qualityRating: "",
    status: "CONNECTED",
    isPrimary: entries.length === 0,
    addedAt: new Date(),
  });

  await Company.updateOne({ _id: companyId }, { $set: { "whatsapp.phoneNumbers": entries } });
};

module.exports = {
  listCompanyNumbers,
  syncCompanyNumbers,
  setDefaultNumber,
  ensureNumberRegistered,
  getPlanNumberLimit,
};
