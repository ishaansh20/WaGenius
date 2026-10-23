const Conversation = require("../../models/conversation");
const Company = require("../../models/company");
const { primaryNumberId } = require("../../utils/whatsappNumberList");
const Message = require("../../models/message");
const { getIO } = require("../../sockets/socket");
const { findOrCreateContact: sharedFindOrCreateContact } = require("../contactService");

const findOrCreateContact = async ({ companyId, phone, name }) => {
  const { contact } = await sharedFindOrCreateContact({ companyId, phone, name, source: "whatsapp" });
  return contact;
};

// One conversation per (company, contact, WhatsApp number): the same customer
// talking to two of the company's numbers has two separate chats, so replies
// and history never mix between numbers. With no number given (legacy
// callers) the old company+contact lookup is used.
const findOrCreateConversation = async (companyId, contactId, phoneNumberId = "") => {
  const numberId = phoneNumberId || "";

  if (!numberId) {
    let conversation = await Conversation.findOne({ companyId, contact: contactId });
    if (!conversation) conversation = await Conversation.create({ companyId, contact: contactId });
    return conversation;
  }

  let conversation = await Conversation.findOne({ companyId, contact: contactId, phoneNumberId: numberId });

  if (!conversation) {
    // Chats created before multi-number support have no number stamped; they
    // belong to the company's primary number, and only to that one.
    const company = await Company.findById(companyId).select("whatsapp").lean();
    if (primaryNumberId(company) === numberId) {
      conversation = await Conversation.findOneAndUpdate(
        { companyId, contact: contactId, phoneNumberId: { $in: ["", null] } },
        { $set: { phoneNumberId: numberId } },
        { new: true },
      );
    }
  }

  if (!conversation) {
    conversation = await Conversation.create({ companyId, contact: contactId, phoneNumberId: numberId });
  }

  return conversation;
};

const createMessage = async ({
  companyId,
  conversationId,
  sender,
  message,
  status,
  campaignId,
  whatsappMessageId,
  replyAttributedCampaign,
  senderName,
  mediaUrl,
  mediaType,
}) => {
  const newMessage = await Message.create({
    companyId,
    conversation: conversationId,
    sender: sender || "user",
    content: message,
    status: status || "pending",
    campaignId: campaignId || null,
    whatsappMessageId: whatsappMessageId || null,
    replyAttributedCampaign,
    senderName: senderName || null,
    mediaUrl: mediaUrl || "",
    mediaType: mediaType || "",
  });

  return newMessage;
};

const updateConversation = async ({ conversation, message, sender }) => {
  conversation.lastMessage = message;
  conversation.lastMessageTime = new Date();

  if (sender === "user") {
    conversation.unreadCount += 1;
  } else {
    conversation.unreadCount = 0;
  }

  await conversation.save();

  return conversation;
};

module.exports = {
  findOrCreateContact,
  findOrCreateConversation,
  createMessage,
  updateConversation,
};
