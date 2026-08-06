const mongoose = require("mongoose");

// Two kinds of segment share this one model:
// - "filter" (the original kind): a saved filter, not a frozen snapshot —
//   membership is re-evaluated live against the current Contact collection
//   every time it's viewed or used, via buildContactFilter().
// - "static" (a "group"): membership is an explicit, stored contactIds list
//   that only changes via the add/remove-member endpoints — never as a side
//   effect of unrelated contact/tag edits elsewhere.
const segmentSchema = new mongoose.Schema(
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
    },

    type: {
      type: String,
      enum: ["filter", "static"],
      default: "filter",
    },

    filter: {
      search: { type: String, default: "" },
      tags: [String],
      source: { type: String, default: "" },
      optedOut: { type: Boolean, default: null },
      dateAddedFrom: { type: Date, default: null },
      dateAddedTo: { type: Date, default: null },
    },

    // Only used when type is "static".
    contactIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Contact" }],
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Segment", segmentSchema);
