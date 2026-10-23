const Contact = require("../../models/contact");
const Conversation = require("../../models/conversation");
const Company = require("../../models/company");
const { primaryNumberId } = require("../../utils/whatsappNumberList");

// With a phoneNumberId, returns the settings of the chat on that number only
// (a customer can have one chat per number); without it, any chat of theirs.
const getConversationSettings = async (companyId, phone, phoneNumberId = "") => {
  const contact = await Contact.findOne({ companyId, phone });

  if (!contact) {
    return {
      aiEnabled: true,
      status: "AI_ACTIVE",
      contact: null,
      conversation: null,
    };
  }

  let conversation = null;

  if (phoneNumberId) {
    conversation = await Conversation.findOne({ companyId, contact: contact._id, phoneNumberId });

    if (!conversation) {
      const company = await Company.findById(companyId).select("whatsapp").lean();
      if (primaryNumberId(company) === phoneNumberId) {
        conversation = await Conversation.findOne({
          companyId,
          contact: contact._id,
          phoneNumberId: { $in: ["", null] },
        });
      }
    }
  } else {
    conversation = await Conversation.findOne({ companyId, contact: contact._id });
  }

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
