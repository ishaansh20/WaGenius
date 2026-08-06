const axios = require("axios");
const { withRetry } = require("../../utils/withRetry");

// Meta's quality signal is a traffic-light string (GREEN/YELLOW/RED/UNKNOWN),
// not the "High/Medium/Low" wording products like this app's UI use — map it
// to a friendly label without losing the underlying signal.
const QUALITY_LABELS = {
  GREEN: "High",
  YELLOW: "Medium",
  RED: "Low",
  UNKNOWN: "Unknown",
};

// messaging_limit_tier values are named like TIER_50/TIER_250/TIER_1K/
// TIER_10K/TIER_100K/TIER_UNLIMITED — this is the max number of
// business-initiated conversations allowed per rolling 24h window, which is
// the closest thing to a "quota" Meta exposes via a simple Graph API call.
// There is no separate "remaining count used so far" field available this
// way, so this app shows the tier itself rather than fabricating a number.
const TIER_LABELS = {
  TIER_50: "50 conversations/day",
  TIER_250: "250 conversations/day",
  TIER_1K: "1,000 conversations/day",
  TIER_10K: "10,000 conversations/day",
  TIER_100K: "100,000 conversations/day",
  TIER_UNLIMITED: "Unlimited",
};

const getAccountHealth = async (credentials) => {
  const baseUrl = `https://graph.facebook.com/${credentials.apiVersion}`;

  try {
    const [phoneRes, wabaRes] = await Promise.all([
      withRetry(
        () =>
          axios.get(`${baseUrl}/${credentials.phoneNumberId}`, {
            params: {
              access_token: credentials.accessToken,
              fields: "quality_rating,messaging_limit_tier,verified_name",
            },
            timeout: 10000,
          }),
        { label: "getAccountHealth(phone)" },
      ),
      withRetry(
        () =>
          axios.get(`${baseUrl}/${credentials.wabaId}`, {
            params: {
              access_token: credentials.accessToken,
              fields: "name,account_review_status",
            },
            timeout: 10000,
          }),
        { label: "getAccountHealth(waba)" },
      ),
    ]);

    const qualityRating = phoneRes.data.quality_rating || "UNKNOWN";
    const messagingTier = phoneRes.data.messaging_limit_tier || null;

    return {
      available: true,
      qualityRating,
      qualityLabel: QUALITY_LABELS[qualityRating] || qualityRating,
      messagingTier,
      messagingTierLabel: messagingTier
        ? TIER_LABELS[messagingTier] || messagingTier
        : "Unavailable",
      verifiedName: phoneRes.data.verified_name || "",
      businessName: wabaRes.data.name || "",
      accountReviewStatus: wabaRes.data.account_review_status || "UNKNOWN",
    };
  } catch (error) {
    console.error(
      "Meta Account Health Error:",
      error.response?.data || error.message,
    );

    return { available: false };
  }
};

module.exports = { getAccountHealth };
