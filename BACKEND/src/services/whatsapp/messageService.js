const Conversation = require("../../models/conversation");
const Message = require("../../models/message");
const { getIO } = require("../../sockets/socket");
const { findOrCreateContact: sharedFindOrCreateContact } = require("../contactService");

const findOrCreateContact = async ({ companyId, phone, name }) => {
  const { contact } = await sharedFindOrCreateContact({ companyId, phone, name, source: "whatsapp" });
  return contact;
};

const findOrCreateConversation = async (companyId, contactId) => {
  let conversation = await Conversation.findOne({
    companyId,
    contact: contactId,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      companyId,
      contact: contactId,
    });
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
