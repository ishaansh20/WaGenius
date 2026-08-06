const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["AI_ACTIVE", "HUMAN_PENDING", "RESOLVED"],
      default: "AI_ACTIVE",
    },

    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedAt: {
      type: Date,
      default: null,
    },

    aiEnabled: {
      type: Boolean,
      default: true,
    },

    lastMessage: {
      type: String,
      default: "",
    },
    unreadCount: {
      type: Number,
      default: 0,
    },

    lastMessageTime: {
      type: Date,
      default: Date.now,
      index: true,
    },

    escalationReason: {
      type: String,
      enum: ["customer_request", "low_confidence", "turn_limit", null],
      default: null,
    },

    escalatedAt: {
      type: Date,
      default: null,
    },

    aiTurnCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Conversation", conversationSchema);
