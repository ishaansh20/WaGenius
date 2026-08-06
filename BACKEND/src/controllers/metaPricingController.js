const { fetchPricingAnalytics } = require("../services/whatsapp/metaPricingService");
const { getCompanyWhatsAppCredentials } = require("../services/whatsapp/companyCredentials");
const { getOrCreateConfig } = require("./pricingConfigController");

// Billing data doesn't need sub-hour freshness the way account health does —
// a longer TTL than metaAccountController's 5 minutes keeps Dashboard loads
// fast without hammering Meta.
const CACHE_TTL_MS = 20 * 60 * 1000;

const RANGE_TO_DAYS = { "1d": 1, "7d": 7, "30d": 30, all: 365 };

// Fixed window for per-campaign rate derivation, deliberately independent of
// whatever display range the Dashboard happens to be showing — otherwise a
// per-campaign estimate would jitter every time someone clicks a filter.
const RATE_WINDOW_DAYS = 30;

// Keyed by "companyId:start:end" — companyId first, so two different
// companies' billing data (each with its own Meta credentials) never share
// a cache entry.
const cache = new Map();

// Rounds "now" down to a 5-minute bucket before it's used as the window's
// `end` — without this, `endUnix` would be computed fresh to the second on
// every request, making every cache key unique and defeating caching
// entirely (confirmed: two requests seconds apart never shared a key).
// Billing data doesn't need per-second precision, so this costs nothing.
const CACHE_BUCKET_SECONDS = 5 * 60;
const roundToBucket = (unixSeconds) =>
  Math.floor(unixSeconds / CACHE_BUCKET_SECONDS) * CACHE_BUCKET_SECONDS;

const getCachedWindow = async (companyId, credentials, startUnix, endUnix, force) => {
  const key = `${companyId}:${startUnix}:${endUnix}`;
  const entry = cache.get(key);

  if (!force && entry && Date.now() - entry.cachedAt < CACHE_TTL_MS) {
    return entry.data;
  }

  const data = await fetchPricingAnalytics(credentials, startUnix, endUnix);
  if (data.available) {
    cache.set(key, { data, cachedAt: Date.now() });
  }
  return data;
};

// Blends Meta's own real recent average rate per category with the
// PricingConfig fallback — Meta wins whenever it has nonzero volume for a
// category; PricingConfig is only consulted per-category when Meta has no
// recent data for that one category (e.g. a brand-new number with no
// Authentication sends yet). Shared by the /pricing route and
// campaignController.js's getCostSummary, so this blending rule lives in
// exactly one place.
const getEffectiveRates = async (companyId) => {
  const fallback = await getOrCreateConfig(companyId);
  const credentials = await getCompanyWhatsAppCredentials(companyId);

  if (!credentials) {
    return { currency: fallback.currency || "INR", rates: fallback.rates || {} };
  }

  const now = roundToBucket(Math.floor(Date.now() / 1000));
  const rateWindow = await getCachedWindow(
    companyId,
    credentials,
    now - RATE_WINDOW_DAYS * 24 * 60 * 60,
    now,
    false,
  );

  const rates = {};
  ["marketing", "utility", "authentication", "service"].forEach((category) => {
    const derived = rateWindow.available ? rateWindow.rates?.[category] : 0;
    rates[category] = derived > 0 ? derived : fallback.rates?.[category] || 0;
  });

  return {
    currency: rateWindow.available && rateWindow.currency ? rateWindow.currency : fallback.currency || "INR",
    rates,
  };
};

const getPricing = async (req, res) => {
  try {
    const { companyId } = req;
    const credentials = await getCompanyWhatsAppCredentials(companyId);

    if (!credentials) {
      return res.status(200).json({ success: true, available: false });
    }

    const force = req.query.force === "true";
    const range = RANGE_TO_DAYS[req.query.range] ? req.query.range : "30d";
    const now = roundToBucket(Math.floor(Date.now() / 1000));

    const displayWindow = await getCachedWindow(
      companyId,
      credentials,
      now - RANGE_TO_DAYS[range] * 24 * 60 * 60,
      now,
      force,
    );
    const effective = await getEffectiveRates(companyId);

    res.status(200).json({
      success: true,
      available: displayWindow.available,
      currency: effective.currency,
      range,
      actual: displayWindow.available
        ? { totalCost: displayWindow.totalCost, byCategory: displayWindow.totals }
        : null,
      derivedRates: effective.rates,
      rateWindowDays: RATE_WINDOW_DAYS,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, available: false });
  }
};

module.exports = { getPricing, getEffectiveRates };
