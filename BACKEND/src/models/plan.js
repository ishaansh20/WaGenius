const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },

    pricing: {
      monthly: { type: Number, default: 0 },
      yearly: { type: Number, default: 0 },
    },

    limits: {
      users: { type: Number, default: 1 },
      contacts: { type: Number, default: 500 },
      // -1 = unlimited broadcast campaign sending across all plans
      campaigns: { type: Number, default: -1 },
      templates: { type: Number, default: 5 },
      // 0 = single number, -1 = unlimited / custom (Enterprise)
      whatsappNumbers: { type: Number, default: 1 },
    },

    isFree: { type: Boolean, default: false },
    isTrial: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },    // drives "MOST POPULAR" badge on billing page
    isEnterprise: { type: Boolean, default: false }, // drives "Contact Sales" CTA on billing page

    usageLimits: {
      contacts: { type: Number, default: 0 },
      messages: { type: Number, default: 0 },
    },
    restrictions: [{ type: String }],

    features: {
      // ── Core ──────────────────────────────────────────────────────────
      whatsapp:             { type: Boolean, default: false },

      // ── Contacts ──────────────────────────────────────────────────────
      contactImport:        { type: Boolean, default: false }, // Bulk CSV import
      contactExport:        { type: Boolean, default: false }, // CSV download

      // ── Audience / Segmentation ────────────────────────────────────────
      advancedSegmentation: { type: Boolean, default: false }, // Contact groups & advanced filters

      // ── Campaigns ─────────────────────────────────────────────────────
      campaignSchedule:     { type: Boolean, default: false }, // Schedule campaigns
      campaignPauseResume:  { type: Boolean, default: false }, // Pause & resume campaigns

      // ── AI ────────────────────────────────────────────────────────────
      ai:                   { type: Boolean, default: false }, // AI template drafting

      // ── Analytics ─────────────────────────────────────────────────────
      advancedAnalytics:    { type: Boolean, default: false }, // Advanced dashboard & campaign analytics
      analyticsExport:      { type: Boolean, default: false }, // Export CSV reports

      // ── Team ──────────────────────────────────────────────────────────
      teamManagement:       { type: Boolean, default: false }, // Invite & manage team members

      // ── Developer / Enterprise ────────────────────────────────────────
      api:                  { type: Boolean, default: false }, // Public API access
      customWebhooks:       { type: Boolean, default: false }, // Custom webhooks
    },

    trialDays: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Plan", planSchema);
