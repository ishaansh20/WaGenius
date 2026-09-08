const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },

    status: {
      type: String,
      enum: ["TRIAL", "ACTIVE", "PENDING", "SUSPENDED", "CANCELLED", "EXPIRED"],
      default: "PENDING",
    },

    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },

    startDate: { type: Date, default: Date.now },
    trialEndsAt: { type: Date },
    renewalDate: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
