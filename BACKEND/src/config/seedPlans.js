const Plan = require("../models/plan");

// Canonical 3-plan structure with defined SaaS limits and fixed pricing.
// Uses $set so re-running this always syncs feature flags, limits, and pricing.
const DEFAULT_PLANS = [
  {
    name: "Free",
    slug: "free",
    description: "For individuals and businesses getting started with WhatsApp marketing.",
    pricing: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      users: 1,
      contacts: 500,
      campaigns: -1, // Unlimited broadcast campaign sending
      templates: 5,
      whatsappNumbers: 1,
    },
    isFree: true,
    isTrial: false,
    isPopular: false,
    isEnterprise: false,
    usageLimits: {
      contacts: 500,
      messages: 0, // Meta controls messaging limits independently
    },
    restrictions: [],
    features: {
      whatsapp:             true,
      contactImport:        false,
      contactExport:        false,
      advancedSegmentation: false,
      campaignSchedule:     false,
      campaignPauseResume:  false,
      ai:                   false,
      advancedAnalytics:    false,
      analyticsExport:      false,
      teamManagement:       false,
      api:                  false,
      customWebhooks:       false,
    },
    trialDays: 0,
    isActive: true,
  },
  {
    name: "Pro",
    slug: "pro",
    description: "For growing businesses running regular campaigns.",
    pricing: {
      monthly: 1999,
      yearly: 19188, // ₹1,599/mo × 12 (Save 20%)
    },
    limits: {
      users: 5,
      contacts: 5000,
      campaigns: -1, // Unlimited broadcast campaign sending
      templates: 100,
      whatsappNumbers: 1,
    },
    isFree: false,
    isTrial: false,
    isPopular: false, // Highlighter removed per request
    isEnterprise: false,
    usageLimits: {
      contacts: 5000,
      messages: 0,
    },
    restrictions: [],
    features: {
      whatsapp:             true,
      contactImport:        true,
      contactExport:        true,
      advancedSegmentation: true,
      campaignSchedule:     true,
      campaignPauseResume:  true,
      ai:                   true,
      advancedAnalytics:    true,
      analyticsExport:      true,
      teamManagement:       true,
      api:                  false,
      customWebhooks:       false,
    },
    trialDays: 0,
    isActive: true,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    description: "For growing teams and businesses with higher-volume WhatsApp requirements.",
    pricing: {
      monthly: 4999,
      yearly: 47988, // ₹3,999/mo × 12 (Save 20%)
    },
    limits: {
      users: 20,
      contacts: 50000,
      campaigns: -1, // Unlimited broadcast campaign sending
      templates: 500,
      whatsappNumbers: 5,
    },
    isFree: false,
    isTrial: false,
    isPopular: false,
    isEnterprise: true,
    usageLimits: {
      contacts: 50000,
      messages: 0,
    },
    restrictions: [],
    features: {
      whatsapp:             true,
      contactImport:        true,
      contactExport:        true,
      advancedSegmentation: true,
      campaignSchedule:     true,
      campaignPauseResume:  true,
      ai:                   true,
      advancedAnalytics:    true,
      analyticsExport:      true,
      teamManagement:       true,
      api:                  true,
      customWebhooks:       true,
    },
    trialDays: 0,
    isActive: true,
  },
];

async function seedDefaultPlans() {
  try {
    for (const planData of DEFAULT_PLANS) {
      await Plan.findOneAndUpdate(
        { slug: planData.slug },
        { $set: planData },
        { upsert: true, returnDocument: "after" },
      );
    }
    console.log("✓ 3 subscription plans (Free, Pro, Enterprise) seeded/synced with defined SaaS limits.");
  } catch (error) {
    console.error("Error seeding default plans:", error);
  }
}

module.exports = { seedDefaultPlans, DEFAULT_PLANS };
