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

    // Which of the company's WhatsApp numbers this chat happens on. One
    // customer messaging two numbers is two separate conversations, and every
    // reply goes out from the number the chat belongs to. Empty = created
    // before multi-number support (owned by the company's primary number).
    phoneNumberId: {
      type: String,
      default: "",
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
