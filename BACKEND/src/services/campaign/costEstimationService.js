// Single source of truth for attributing an estimated cost to a campaign.
// Never duplicate this formula elsewhere — both the cost-summary endpoint
// and any per-campaign display must call through here.
//
// Attribution: a templated campaign's cost category comes from the
// template's own Meta-assigned metaCategory (MARKETING/UTILITY/
// AUTHENTICATION) — the same categorization Meta itself already requires at
// template-submission time, not a new scheme invented for this feature.
// Plain-text/session campaigns (no template) fall under "service".
//
// This is still an ESTIMATE (sentCount × rate) — Meta has no way to report
// what one specific campaign cost, only aggregate spend per category across
// the whole WABA. What changed is where `rates` comes from: it's now
// metaPricingController.js's getEffectiveRates() — Meta's own real recent
// average cost per category, falling back to the admin-configured
// PricingConfig only for a category Meta has no recent volume for — rather
// than a purely admin-guessed number. The math here is unchanged either way.
const estimateCampaignCost = (campaign, rates) => {
  const category = campaign.templateId?.metaCategory
    ? campaign.templateId.metaCategory.toLowerCase()
    : "service";

  const rate = rates?.[category] ?? 0;
  const sentCount = campaign.sentCount || 0;

  return {
    campaignId: campaign._id,
    category,
    rate,
    estimatedCost: sentCount * rate,
  };
};

const estimateCostSummary = (campaigns, rates) => {
  const perCampaign = campaigns.map((campaign) => estimateCampaignCost(campaign, rates));

  const byCategory = perCampaign.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] || 0) + entry.estimatedCost;
    return acc;
  }, {});

  const totalEstimated = perCampaign.reduce((sum, entry) => sum + entry.estimatedCost, 0);

  return { totalEstimated, byCategory, campaigns: perCampaign };
};

module.exports = { estimateCampaignCost, estimateCostSummary };
