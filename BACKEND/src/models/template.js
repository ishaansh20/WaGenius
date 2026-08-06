const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    mediaUrl: {
      type: String,
      default: "",
    },

    mediaType: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["draft", "active", "archived", "pending"],
      default: "draft",
    },

    createdBy: {
      type: String,
      default: "admin",
    },

    // Meta WhatsApp template submission (all optional — local-only
    // templates that are never submitted leave these untouched).
    metaTemplateName: {
      type: String,
      default: "",
      trim: true,
    },

    metaCategory: {
      type: String,
      enum: ["MARKETING", "UTILITY", "AUTHENTICATION", ""],
      default: "",
    },

    language: {
      type: String,
      default: "en_US",
    },

    bodyVariableExamples: {
      type: [String],
      default: [],
    },

    metaTemplateId: {
      type: String,
      default: "",
    },

    // Meta template HEADER component — separate from the local mediaUrl/
    // mediaType above, which is only ever used for the free-text/normal
    // template send path and never reaches Meta.
    headerType: {
      type: String,
      enum: ["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT"],
      default: "NONE",
    },

    headerText: {
      type: String,
      default: "",
    },

    // Header text supports at most one {{1}} placeholder (Meta's rule) —
    // singular, unlike the array of bodyVariableExamples below.
    headerTextExample: {
      type: String,
      default: "",
    },

    headerMediaUrl: {
      type: String,
      default: "",
    },

    headerMediaType: {
      type: String,
      default: "",
    },

    // Meta's asset handle from the Resumable Upload API, embedded in the
    // template creation request's HEADER component example. Kept for
    // reference/debugging a rejected-and-retried submission.
    headerHandle: {
      type: String,
      default: "",
    },

    // Meta template BUTTONS component. Max 10 total (Meta's limit);
    // QUICK_REPLY buttons must all be grouped together and never follow a
    // URL/PHONE_NUMBER button (Meta rejects interspersed ordering) —
    // enforced in templateService.js/CreateApprovedTemplatePage.jsx, not
    // by the schema itself.
    buttons: {
      type: [
        {
          type: {
            type: String,
            enum: ["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE"],
            required: true,
          },
          text: { type: String, default: "" },
          url: { type: String, default: "" },
          // Full example URL with the {{1}} resolved — required by Meta
          // at submission time whenever `url` contains a variable.
          urlExample: { type: String, default: "" },
          phoneNumber: { type: String, default: "" },
        },
      ],
      default: [],
    },

    metaStatus: {
      type: String,
      enum: ["not_submitted", "PENDING", "APPROVED", "REJECTED", "PAUSED", "DISABLED"],
      default: "not_submitted",
    },

    // Maps each friendly body token (from the QUICK_VARS insert buttons,
    // e.g. "name", "phone") to the 1-based positional index it was
    // converted to for Meta ({{1}}, {{2}}, ...) at submission time. The
    // description itself keeps the friendly {{name}} text for editing —
    // this is only for future send-time/UI code that needs to know which
    // slot was which variable.
    variableMap: {
      type: [
        {
          name: { type: String, required: true },
          index: { type: Number, required: true },
        },
      ],
      default: [],
    },

    rejectionReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Template", templateSchema);
