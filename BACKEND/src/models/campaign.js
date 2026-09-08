const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  name: String,

  phone: String,

  status: {
    type: String,
    enum: ["pending", "sent", "delivered", "read", "failed"],
    default: "pending",
  },

  // Per-event timestamps, independent of the single `status` above — a
  // contact can e.g. reply without a read receipt ever confirming, so these
  // aren't just a breakdown of `status`. clickedAt is reserved for future
  // button/quick-reply click tracking — no write path sets it yet.
  sentAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  readAt: { type: Date, default: null },
  repliedAt: { type: Date, default: null },
  failedAt: { type: Date, default: null },
  clickedAt: { type: Date, default: null },
  failure: {
    code: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      default: null,
    },
    details: {
      type: String,
      default: null,
    },
  },
});

const campaignSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    campaignName: {
      type: String,
      required: true,
    },

    campaignType: {
      type: String,
      default: "broadcast",
    },

    message: {
      type: String,
      required: true,
    },

    // Snapshotted from the selected (non-Meta) template's attachment at
    // launch time, same as `message` — not a live reference, so editing or
    // deleting the template later never changes what an in-flight campaign
    // sends.
    mediaUrl: {
      type: String,
      default: "",
    },

    mediaType: {
      type: String,
      default: "",
    },

    contacts: [contactSchema],

    totalContacts: {
      type: Number,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },

    failedCount: {
      type: Number,
      default: 0,
    },

    deliveredCount: {
      type: Number,
      default: 0,
    },

    readCount: {
      type: Number,
      default: 0,
    },

    repliedCount: {
      type: Number,
      default: 0,
    },

    // Reserved for future button/quick-reply click tracking — no write
    // path sets this yet.
    clickedCount: {
      type: Number,
      default: 0,
    },

    deliveryTimeline: [
      {
        time: {
          type: Date,
          default: Date.now,
        },
        sent: Number,
        failed: Number,
        pending: Number,
      },
    ],

    scheduleAt: {
      type: Date,
      default: null,
    },

    // Optional — when set, the campaign sends via an Meta-approved
    // template instead of free text (required to reach contacts outside
    // the 24-hour session window). Existing free-text campaigns are
    // unaffected since this is never required.
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      default: null,
    },

    templateVariables: {
      type: [String],
      default: [],
    },

    // Parallel to template.buttons — buttonVariables[i] is the value for
    // buttons[i]'s {{1}} if that button is a dynamic URL type, "" otherwise.
    // Same "one value for the whole campaign" model as templateVariables
    // (or {{contact_name}} substitution) — not per-contact CSV data.
    buttonVariables: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["draft", "scheduled", "processing", "completed", "failed"],
      default: "draft",
    },
  },
  {
    timestamps: true,
  },
);

// Backs the scheduler poller's `{ status: "scheduled", scheduleAt: { $lte: now } }`
// query in campaignSchedulerService.js.
campaignSchema.index({ status: 1, scheduleAt: 1 });

module.exports = mongoose.model("Campaign", campaignSchema);
