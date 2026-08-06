const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["ADMIN", "CAMPAIGN_MANAGER", "SUPPORT_AGENT", "TEAM_LEAD"],
      default: "SUPPORT_AGENT",
    },

    // Which tenant this user belongs to. Absent (null) only for a
    // platform-tier account — see platformRole below.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },

    // Platform-tier staff (you, the service provider) vs. an ordinary
    // company user — deliberately mutually exclusive with companyId (see
    // the pre-validate check below). A platform account is never also a
    // company's ADMIN; if the same person needs both, they hold two
    // separate accounts.
    platformRole: {
      type: String,
      enum: ["SUPER_ADMIN", null],
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("validate", function enforceCompanyPlatformExclusivity() {
  if (this.companyId && this.platformRole) {
    throw new Error("A user cannot have both a companyId and a platformRole");
  }
});

module.exports = mongoose.model("User", userSchema);
