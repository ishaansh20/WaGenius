const mongoose = require("mongoose");

const platformConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global_settings",
      unique: true,
      required: true,
    },
    groq: {
      defaultModel: {
        type: String,
        default: "llama-3.3-70b-versatile",
      },
      fallbackModel: {
        type: String,
        default: "llama-3.1-8b-instant",
      },
      temperature: {
        type: Number,
        default: 0.7,
      },
      maxTokens: {
        type: Number,
        default: 1024,
      },
    },
    onboarding: {
      defaultTrialDays: {
        type: Number,
        default: 14,
      },
      requireCreditCardForTrial: {
        type: Boolean,
        default: false,
      },
    },
    meta: {
      defaultApiVersion: {
        type: String,
        default: "v21.0",
      },
    },
    system: {
      maintenanceMode: {
        type: Boolean,
        default: false,
      },
      bannerMessage: {
        type: String,
        default: "",
      },
      allowNewSignups: {
        type: Boolean,
        default: true,
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("PlatformConfig", platformConfigSchema);
