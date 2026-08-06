const mongoose = require("mongoose");

const templateCategorySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Not globally unique — two companies can each have their own
    // "Marketing" category. Enforced per-company via the compound index.
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

templateCategorySchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("TemplateCategory", templateCategorySchema);
