const Contact = require("../../models/contact");
const Conversation = require("../../models/conversation");

const getConversationSettings = async (companyId, phone) => {
  const contact = await Contact.findOne({ companyId, phone });

  if (!contact) {
    return {
      aiEnabled: true,
      status: "AI_ACTIVE",
      contact: null,
      conversation: null,
    };
  }

  const conversation = await Conversation.findOne({
    companyId,
    contact: contact._id,
  });

  return {
    aiEnabled: conversation?.aiEnabled ?? true,
    status: conversation?.status || "AI_ACTIVE",
    contact,
    conversation,
  };
};

module.exports = {
  getConversationSettings,
};
