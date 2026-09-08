const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    sender: {
      type: String,
      enum: ["user", "ai", "agent"],
      required: true,
    },

    senderName: {
      type: String,
      default: null,
    },

    content: {
      type: String,
      required: true,
    },

    mediaUrl: {
      type: String,
      default: "",
    },

    mediaType: {
      type: String,
      default: "",
    },

    messageType: {
      type: String,
      default: "text",
    },

    status: {
      type: String,
      default: "sent",
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
    },
    whatsappMessageId: {
      type: String,
      index: true,
    },
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
    replyAttributedCampaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Message", messageSchema);
