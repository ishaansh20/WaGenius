const Contact = require("../models/contact");
const Conversation = require("../models/conversation");
const Message = require("../models/message");
const User = require("../models/user");
const ROLES = require("../constants/roles");
const { getIO } = require("../sockets/socket");
const Campaign = require("../models/campaign");

const { recalculateCampaignStats } = require("./campaignController");
const {
  getConversationSettings,
} = require("../services/whatsapp/conversationService");
const {
  findOrCreateContact,
  findOrCreateConversation,
  createMessage,
  updateConversation,
} = require("../services/whatsapp/messageService");

// WhatsApp's real delivery lifecycle is pending -> sent -> delivered ->
// read, with `failed` as a separate terminal outcome that can arrive
// *instead of* (or after) `sent` once Meta actually attempts delivery.
// Treating `failed` as strictly lower-priority than `sent` — as a single
// linear scale would — silently drops a genuine late "this couldn't be
// delivered" event once a message is already marked "sent". This function
// only blocks a status update when it would move a message *backwards*
// after delivery/read has already been confirmed.
const STATUS_PROGRESSION = { pending: 0, sent: 1, delivered: 2, read: 3 };

// Which per-contact Campaign timestamp field a given webhook status stamps —
// only delivered/read/failed arrive this way; sent is stamped at send time
// in campaignSenderService.js instead.
const WEBHOOK_STATUS_TIMESTAMP_FIELD = {
  delivered: "deliveredAt",
  read: "readAt",
  failed: "failedAt",
};

const shouldApplyStatusUpdate = (currentStatus, incomingStatus) => {
  if (currentStatus === incomingStatus) return false;

  if (incomingStatus === "failed") {
    // Always honor a failure unless delivery was already confirmed — a
    // stray/late "failed" arriving after "delivered" or "read" is
    // nonsensical and shouldn't downgrade a confirmed successful delivery.
    return currentStatus !== "delivered" && currentStatus !== "read";
  }

  const current = STATUS_PROGRESSION[currentStatus] ?? 0;
  const incoming = STATUS_PROGRESSION[incomingStatus] ?? 0;
  return incoming > current;
};

const saveMessage = async (req, res) => {
  try {
    const {
      phone,
      message,
      sender,
      name,
      status,
      campaignId,
      whatsappMessageId,
      senderName,
    } = req.body;
    const { companyId } = req;

    // 1. Find or create contact
    const contact = await findOrCreateContact({
      companyId,
      phone,
      name,
    });

    // 2. Find or create conversation
    const conversation = await findOrCreateConversation(companyId, contact._id);

    let replyAttributedCampaign = null;

    if (sender === "user") {
      const lastCampaignMessage = await Message.findOne({
        companyId,
        conversation: conversation._id,
        sender: "agent",
        campaignId: { $ne: null },
      }).sort({
        createdAt: -1,
      });

      if (lastCampaignMessage) {
        const hoursDifference =
          (Date.now() - new Date(lastCampaignMessage.createdAt).getTime()) /
          (1000 * 60 * 60);

        if (hoursDifference <= 48) {
          replyAttributedCampaign = lastCampaignMessage.campaignId;

          // First-reply-only stamp — $elemMatch (not two separate dot-path
          // conditions) is required here: with separate "contacts.phone"/
          // "contacts.repliedAt" conditions, Mongo would consider the query
          // satisfied if *any* element matches the phone and *any other*
          // element (e.g. a different contact who hasn't replied yet) has a
          // null repliedAt, then apply $set via the positional operator to
          // an ambiguous element. $elemMatch forces both conditions onto the
          // same array element, making this genuinely idempotent if the
          // same contact replies more than once inside the attribution
          // window — this is the only place that links a reply back onto
          // the campaign's per-contact record.
          const updatedCampaign = await Campaign.findOneAndUpdate(
            {
              _id: replyAttributedCampaign,
              companyId,
              contacts: { $elemMatch: { phone, repliedAt: null } },
            },
            {
              $set: { "contacts.$.repliedAt": new Date() },
              $inc: { repliedCount: 1 },
            },
            { new: true },
          );

          if (updatedCampaign) {
            getIO().to("campaigns").emit("campaign_updated", updatedCampaign);
          }
        }
      }
    }
    // 3. Save message
    const newMessage = await createMessage({
      companyId,
      conversationId: conversation._id,
      sender,
      message,
      status,
      campaignId,
      whatsappMessageId,
      replyAttributedCampaign,
      senderName,
    });

    // 4. Update last message
    await updateConversation({
      conversation,
      message,
      sender,
    });
    const updatedConversation = await Conversation.findById(
      conversation._id,
    ).populate("contact");

    const io = getIO();

    io.to("inbox").emit("new_message", newMessage);
    io.to("inbox").emit("conversation_updated", updatedConversation);

    contact.lastMessage = message;
    await contact.save();

    res.status(201).json({
      success: true,
      phone,
      campaignId,
      message: "Message saved",
      data: newMessage,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const MAX_CONVERSATIONS_PAGE_SIZE = 100;
const DEFAULT_CONVERSATIONS_PAGE_SIZE = 50;

const getConversations = async (req, res) => {
  try {
    const limit = Math.min(
      Number(req.query.limit) || DEFAULT_CONVERSATIONS_PAGE_SIZE,
      MAX_CONVERSATIONS_PAGE_SIZE,
    );

    // Cursor-based, not offset-based: this list re-sorts constantly (any
    // new message bumps a conversation to the top), so "page 2" by offset
    // would skip or duplicate rows as conversations shift around between
    // requests. "Give me everything older than this timestamp" doesn't
    // have that problem.
    const before = req.query.before ? new Date(req.query.before) : null;
    const filter = { companyId: req.companyId, ...(before ? { lastMessageTime: { $lt: before } } : {}) };

    const rows = await Conversation.find(filter)
      .populate("contact")
      .populate("assignedAgent", "_id name email")
      .sort({ lastMessageTime: -1 })
      .limit(limit + 1); // fetch one extra to know if there's another page

    const hasMore = rows.length > limit;
    const conversations = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor =
      conversations.length > 0
        ? conversations[conversations.length - 1].lastMessageTime
        : null;

    res.status(200).json({ conversations, hasMore, nextCursor });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to fetch conversations",
      error: error.message,
    });
  }
};

const getMessagesbyConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({
      companyId: req.companyId,
      conversation: conversationId,
    }).sort({
      createdAt: 1,
    });
    res.status(200).json(messages);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};

const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findOne({ _id: conversationId, companyId: req.companyId });

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }
    conversation.unreadCount = 0;

    await conversation.save();

    res.status(200).json({
      message: "Conversation marked as read",
      conversation,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to mark as read",
      error: error.message,
    });
  }
};

const { sendTextMessage } = require("../services/whatsapp/whatsappService");
const { getCompanyWhatsAppCredentials } = require("../services/whatsapp/companyCredentials");

const ROLE_LABELS = {
  ADMIN: "Admin",
  SUPPORT_AGENT: "Support",
  CAMPAIGN_MANAGER: "Sales",
  TEAM_LEAD: "Team Lead",
};

const resolveSenderName = async (req) => {
  if (!req.user?.userId) return null;

  const agent = await User.findById(req.user.userId).select("name role");

  return agent?.name || ROLE_LABELS[agent?.role] || null;
};

const sendMessage = async (req, res) => {
  const { phone, message, sender } = req.body;
  const senderName = await resolveSenderName(req);

  try {
    const credentials = await getCompanyWhatsAppCredentials(req.companyId);
    if (!credentials) {
      return res.status(400).json({
        success: false,
        message: "Connect a WhatsApp Business Account before sending messages",
      });
    }

    const metaResponse = await sendTextMessage(credentials, phone, message);

    req.body.sender = sender || "agent";
    req.body.status = "sent";
    req.body.senderName = senderName;
    // Without this, a reply sent from the inbox never gets its delivery
    // status (sent -> delivered -> read) updated later, since
    // updateMessageStatus matches incoming webhook events by this field.
    req.body.whatsappMessageId = metaResponse.messages?.[0]?.id;

    await saveMessage(req, res);
  } catch (error) {
    console.log(error.response?.data || error.message);

    req.body.sender = sender || "agent";
    req.body.status = "failed";
    req.body.senderName = senderName;

    await saveMessage(req, res);
  }
};

const updateMessageStatus = async (req, res) => {
  try {
    const { phone, status, whatsappMessageId } = req.body;
    const { companyId } = req;

    const lastMessage = await Message.findOne({
      companyId,
      whatsappMessageId,
    });

    if (!lastMessage) {
      // If this fires for a wamid we just sent, the stored whatsappMessageId
      // on the Message doc does not match what Meta is echoing back here —
      // check saveCampaignMessage / saveMessage for how it was stored.
      return res.status(200).json({
        success: true,
        message: "Ignored unknown message",
      });
    }

    if (lastMessage.status === status) {
      return res.status(200).json({
        success: true,
        message: "Already updated",
      });
    }

    if (shouldApplyStatusUpdate(lastMessage.status, status)) {
      lastMessage.status = status;
      await lastMessage.save();
    } else {
      console.log("Ignoring out-of-order or redundant status", {
        current: lastMessage.status,
        incoming: status,
      });

      return res.status(200).json({
        success: true,
        message: "Ignored older status",
      });
    }
    if (lastMessage.campaignId) {
      // Only delivered/read/failed arrive via this webhook path — sent and
      // send-time failures are stamped in campaignSenderService.js instead,
      // at the moment the send actually happens.
      const timestampField = WEBHOOK_STATUS_TIMESTAMP_FIELD[status];
      const setFields = { "contacts.$.status": status };
      if (timestampField) {
        setFields[`contacts.$.${timestampField}`] = new Date();
      }

      await Campaign.updateOne(
        {
          _id: lastMessage.campaignId,
          companyId,
          "contacts.phone": phone,
        },
        {
          $set: setFields,
        },
      );
      const updatedCampaign = await recalculateCampaignStats(
        lastMessage.campaignId,
      );

      getIO().to("campaigns").emit("campaign_updated", updatedCampaign);
    }

    getIO().to("inbox").emit("message_status_updated", lastMessage);

    res.status(200).json({
      success: true,
      message: "Status updated",
    });
  } catch (error) {
    console.error("Update status error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const toggleConversationAi = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { aiEnabled } = req.body;

    const conversation = await Conversation.findOne({ _id: conversationId, companyId: req.companyId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    conversation.aiEnabled = aiEnabled;

    conversation.status = aiEnabled ? "AI_ACTIVE" : "HUMAN_PENDING";

    if (aiEnabled) {
      // Manual re-enable clears prior escalation state so an old low-
      // confidence/turn-limit trigger doesn't immediately re-fire.
      conversation.escalationReason = null;
      conversation.escalatedAt = null;
      conversation.aiTurnCount = 0;
    }

    await conversation.save();

    const updatedConversation =
      await Conversation.findById(conversationId).populate("contact");

    const io = getIO();

    io.to("inbox").emit("conversation_updated", updatedConversation);

    res.status(200).json({
      success: true,
      conversation: updatedConversation,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to toggle AI mode",
    });
  }
};

const getConversationByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    const result = await getConversationSettings(req.companyId, phone);

    return res.status(200).json({
      aiEnabled: result.aiEnabled,
      status: result.status,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch conversation",
      error: error.message,
    });
  }
};

const updateContactTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    const contact = await Contact.findOne({ _id: id, companyId: req.companyId });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    contact.tags = tags || [];

    await contact.save();

    const updatedConversation = await Conversation.findOne({
      companyId: req.companyId,
      contact: contact._id,
    }).populate("contact");

    const io = getIO();

    if (updatedConversation) {
      io.to("inbox").emit("conversation_updated", updatedConversation);
    }

    res.status(200).json({
      success: true,
      contact,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to update contact tags",
    });
  }
};

const updateContactConsent = async (req, res) => {
  try {
    const { id } = req.params;
    const { optedOut } = req.body;

    const contact = await Contact.findOne({ _id: id, companyId: req.companyId });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    contact.optedOut = Boolean(optedOut);
    contact.optedOutAt = contact.optedOut ? new Date() : null;

    await contact.save();

    const updatedConversation = await Conversation.findOne({
      companyId: req.companyId,
      contact: contact._id,
    }).populate("contact");

    const io = getIO();

    if (updatedConversation) {
      io.to("inbox").emit("conversation_updated", updatedConversation);
    }

    res.status(200).json({
      success: true,
      contact,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to update contact consent",
    });
  }
};

const assignConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    const { companyId } = req;

    const conversation = await Conversation.findOne({ _id: id, companyId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Unassign path — agentId null/undefined clears all assignment fields
    if (!agentId) {
      conversation.assignedAgent = null;
      conversation.assignedBy = null;
      conversation.assignedAt = null;
      await conversation.save();

      const updatedConversation = await Conversation.findById(id).populate("contact");

      const io = getIO();
      io.to("inbox").emit("conversation_assigned", {
        conversationId: id,
        assignedAgent: null,
        assignedBy: null,
      });

      return res.status(200).json({ success: true, conversation: updatedConversation });
    }

    // Scoped to the same company — otherwise Company A could assign one of
    // its conversations to a User document that happens to belong to
    // Company B.
    const agent = await User.findOne({ _id: agentId, companyId });
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }

    if (agent.role !== ROLES.SUPPORT_AGENT) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    conversation.assignedAgent = agentId;
    conversation.assignedBy = req.user.userId;
    conversation.assignedAt = new Date();
    await conversation.save();

    const updatedConversation = await Conversation.findById(id)
      .populate("contact")
      .populate("assignedAgent", "_id name email");

    const io = getIO();
    io.to("inbox").emit("conversation_assigned", {
      conversationId: id,
      assignedAgent: updatedConversation.assignedAgent,
      assignedBy: req.user.userId,
    });

    return res.status(200).json({ success: true, conversation: updatedConversation });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to assign conversation" });
  }
};

module.exports = {
  saveMessage,
  getConversations,
  getMessagesbyConversation,
  getConversationByPhone,
  markConversationAsRead,
  sendMessage,
  updateMessageStatus,
  toggleConversationAi,
  updateContactTags,
  updateContactConsent,
  assignConversation,
};
