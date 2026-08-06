const mongoose = require("mongoose");

// One doc per company — each tenant sets its own WhatsApp conversation
// rates. `key` used to be a fixed "default" singleton before multi-tenancy;
// it's kept (now set to the companyId string) so existing lookup code that
// keys off `key` doesn't need to change shape, just what value it passes.
const pricingConfigSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },

    key: {
      type: String,
      default: "default",
    },

    currency: {
      type: String,
      default: "INR",
    },

    rates: {
      marketing: { type: Number, default: 0 },
      utility: { type: Number, default: 0 },
      authentication: { type: Number, default: 0 },
      service: { type: Number, default: 0 },
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("PricingConfig", pricingConfigSchema);
