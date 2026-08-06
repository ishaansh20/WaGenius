const axios = require("axios");
const { withRetry } = require("../../utils/withRetry");

// Confirmed via a live call: requesting beyond this triggers a hard Meta
// rejection ("Insights can only cover the past 365 days", error_subcode
// 2388336) — any range this app requests must stay inside it.
const MAX_LOOKBACK_DAYS = 365;

// Meta's pricing_category strings, lowercased onto this app's existing
// Template.metaCategory vocabulary (marketing/utility/authentication/
// service). UTILITY, MARKETING, SERVICE were confirmed via a live call;
// AUTHENTICATION is assumed but not yet observed. Anything unrecognized
// folds into "service" (the same fallback costEstimationService.js already
// uses for no-template campaigns) with a console.warn, so a wrong guess is
// visible in logs rather than silently mis-billed.
const CATEGORY_MAP = {
  MARKETING: "marketing",
  UTILITY: "utility",
  AUTHENTICATION: "authentication",
  SERVICE: "service",
};

const mapCategory = (raw) => {
  const mapped = CATEGORY_MAP[raw];
  if (!mapped) {
    console.warn(`[metaPricingService] Unknown pricing_category "${raw}" — folding into "service"`);
    return "service";
  }
  return mapped;
};

const clampRange = (startUnix, endUnix) => {
  const now = Math.floor(Date.now() / 1000);
  const minStart = now - MAX_LOOKBACK_DAYS * 24 * 60 * 60;
  return { start: Math.max(startUnix, minStart), end: Math.min(endUnix, now) };
};

// Confirmed via a live call: Meta's actual error here is
// "Insights lookback is limited to 1 year starting Dec 1, 2025" — a fixed
// rollout date, not a true rolling 365-day window from today. Until enough
// time has passed for that fixed date to itself be within the last 365
// days, requesting the full MAX_LOOKBACK_DAYS can still be rejected. Rather
// than hardcode "Dec 1, 2025" (which would go stale), retry with the start
// moved forward (a shorter range) specifically on this error, converging on
// whatever the real earliest allowed date is right now.
const LOOKBACK_EXCEEDED_SUBCODE = 2388336;
const MAX_SHRINK_ATTEMPTS = 6;

const isLookbackExceededError = (error) =>
  error.response?.data?.error?.error_subcode === LOOKBACK_EXCEEDED_SUBCODE;

const callPricingAnalytics = (credentials, start, end) => {
  const baseUrl = `https://graph.facebook.com/${credentials.apiVersion}`;
  return withRetry(
    () =>
      axios.get(`${baseUrl}/${credentials.wabaId}`, {
        params: {
          access_token: credentials.accessToken,
          fields:
            `currency,pricing_analytics.start(${start}).end(${end})` +
            `.granularity(DAILY).dimensions(["PRICING_CATEGORY","PRICING_TYPE"])`,
        },
        timeout: 15000,
      }),
    { label: "fetchPricingAnalytics" },
  );
};

// Retries with the start pulled forward (a shorter range) each time it hits
// specifically the lookback-exceeded error, halving the requested span on
// every attempt until Meta accepts it or attempts run out. Returns the
// actually-accepted start alongside the response, so callers can report the
// real queried range rather than the originally-requested one.
const callWithShrinkingRange = async (credentials, start, end) => {
  let attemptStart = start;

  for (let attempt = 1; attempt <= MAX_SHRINK_ATTEMPTS; attempt++) {
    try {
      const response = await callPricingAnalytics(credentials, attemptStart, end);
      return { response, actualStart: attemptStart };
    } catch (error) {
      if (!isLookbackExceededError(error) || attempt === MAX_SHRINK_ATTEMPTS) {
        throw error;
      }
      attemptStart = Math.floor((attemptStart + end) / 2);
      console.warn(
        `[metaPricingService] Lookback exceeded — retrying with a shorter range (attempt ${attempt + 1})`,
      );
    }
  }
};

// Real WhatsApp billing data for this WABA, not an estimate — confirmed via
// a live call that Meta's `cost` field is already in the WABA's own
// configured currency, not USD.
const fetchPricingAnalytics = async (credentials, startUnix, endUnix) => {
  const { start, end } = clampRange(startUnix, endUnix);

  try {
    const { response, actualStart } = await callWithShrinkingRange(credentials, start, end);

    const points = response.data.pricing_analytics?.data?.[0]?.data_points || [];

    // Every point counts here (REGULAR + FREE_CUSTOMER_SERVICE) — real spend
    // and real volume for reporting. A free-window reply's cost is always 0,
    // so including it never inflates totalCost; it only adds to volume,
    // which is correct — that message really was sent, just not billed.
    const totals = {};
    // REGULAR-only mirror of the above, used exclusively for rate
    // derivation — a free reply's zero cost would otherwise artificially
    // deflate the real per-message paid rate.
    const regularOnly = {};

    for (const point of points) {
      const category = mapCategory(point.pricing_category);

      totals[category] = totals[category] || { cost: 0, volume: 0 };
      totals[category].cost += point.cost || 0;
      totals[category].volume += point.volume || 0;

      if (point.pricing_type === "REGULAR") {
        regularOnly[category] = regularOnly[category] || { cost: 0, volume: 0 };
        regularOnly[category].cost += point.cost || 0;
        regularOnly[category].volume += point.volume || 0;
      }
    }

    const rates = {};
    ["marketing", "utility", "authentication", "service"].forEach((category) => {
      const bucket = regularOnly[category];
      rates[category] = bucket && bucket.volume > 0 ? bucket.cost / bucket.volume : 0;
    });

    const totalCost = Object.values(totals).reduce((sum, bucket) => sum + bucket.cost, 0);

    return {
      available: true,
      currency: response.data.currency || null,
      rangeStart: actualStart,
      rangeEnd: end,
      totals,
      totalCost,
      rates,
    };
  } catch (error) {
    console.error("Meta Pricing Analytics Error:", error.response?.data || error.message);
    return { available: false };
  }
};

module.exports = { fetchPricingAnalytics, mapCategory, MAX_LOOKBACK_DAYS };
