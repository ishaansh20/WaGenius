const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    name: {
      type: String,
      default: "Unknown",
    },

    // Not globally unique — two different companies' customers can share a
    // phone number. Uniqueness is only enforced per-company, via the
    // compound index below.
    phone: {
      type: String,
      required: true,
    },

    profilePic: {
      type: String,
      default: "",
    },

    tags: [String],

    lastMessage: {
      type: String,
      default: "",
    },

    optedOut: {
      type: Boolean,
      default: false,
      index: true,
    },

    optedOutAt: {
      type: Date,
      default: null,
    },

    source: {
      type: String,
      enum: ["whatsapp", "manual", "imported", "campaign"],
      default: "whatsapp",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

contactSchema.index({ companyId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model("Contact", contactSchema);
