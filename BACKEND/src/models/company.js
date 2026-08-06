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

    whatsapp: {
      connected: { type: Boolean, default: false },
      // Encrypted at rest — see services/whatsapp/companyCredentials.js,
      // which is the only place this should be decrypted.
      accessToken: { type: String, default: "" },
      phoneNumberId: { type: String, default: "", index: true },
      wabaId: { type: String, default: "", index: true },
      apiVersion: { type: String, default: "" },
      tokenType: { type: String, enum: ["manual", "embedded_signup", ""], default: "" },
      connectedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Company", companySchema);
