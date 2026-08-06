const Conversation = require("../../models/conversation");
const {
  findOrCreateContact,
  findOrCreateConversation,
  createMessage,
  updateConversation,
} = require("../whatsapp/messageService");
const { getIO } = require("../../sockets/socket");

const saveCampaignMessage = async ({
  companyId,
  phone,
  name,
  message,
  campaignId,
  whatsappMessageId,
  mediaUrl,
  mediaType,
}) => {
  const contact = await findOrCreateContact({
    companyId,
    phone,
    name,
  });

  const conversation = await findOrCreateConversation(companyId, contact._id);

  const newMessage = await createMessage({
    companyId,
    conversationId: conversation._id,
    sender: "agent",
    message,
    status: "pending",
    campaignId,
    whatsappMessageId,
    replyAttributedCampaign: null,
    mediaUrl,
    mediaType,
  });

  await updateConversation({
    conversation,
    message,
    sender: "agent",
  });

  contact.lastMessage = message;

  await contact.save();

  const updatedConversation = await Conversation.findById(
    conversation._id,
  ).populate("contact");

  const io = getIO();

  io.to("inbox").emit("new_message", newMessage);

  io.to("inbox").emit("conversation_updated", updatedConversation);
};

module.exports = saveCampaignMessage;
