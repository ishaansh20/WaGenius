const mongoose = require("mongoose");

// A Company is a tenant — every contact/conversation/template/campaign/etc.
// belongs to exactly one. `whatsapp.wabaId`/`phoneNumberId` are indexed
// because they're the lookup key incoming webhooks use to figure out which
// company a message belongs to (see webhookController.js).
const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },

    setupStatus: {
      type: String,
      enum: [
        "PLAN_SELECTION_REQUIRED",
        "WHATSAPP_ONBOARDING_REQUIRED",
        "READY",
      ],
      default: "PLAN_SELECTION_REQUIRED",
      index: true,
    },

    whatsapp: {
      connected: { type: Boolean, default: false },

      // Encrypted at rest
      accessToken: { type: String, default: "" },

      // 6-digit registration PIN, encrypted at rest
      pin: { type: String, default: "" },

      phoneNumberId: { type: String, default: "", index: true },

      wabaId: { type: String, default: "", index: true },

      // "pending" = WABA linked via Embedded Signup but no phone number
      // registered yet (Meta v3+ allows finishing signup without one).
      // "registered" = phone number is registered with Cloud API and
      // usable for sending/receiving messages.
      phoneStatus: {
        type: String,
        enum: ["pending", "registered", ""],
        default: "",
      },

      apiVersion: { type: String, default: "" },

      tokenType: {
        type: String,
        enum: ["manual", "embedded_signup", ""],
        default: "",
      },

      connectedAt: { type: Date, default: null },

      // Used to determine whether WhatsApp onboarding is complete
      onboardingCompletedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Company", companySchema);
