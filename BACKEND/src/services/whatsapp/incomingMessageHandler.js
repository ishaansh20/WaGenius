const { saveMessage } = require("../../controllers/messageController");
const { createMockResponse } = require("../../utils/mockExpress");
const { getConversationSettings } = require("./conversationService");
const { executeAIWorkflow } = require("../ai/aiWorkflow");
const { applyConsentIntent } = require("./consentService");
const { getCompanyWhatsAppCredentials } = require("./companyCredentials");
const {
  AI_TURN_LIMIT,
  detectExplicitEscalationRequest,
  detectLowConfidenceReply,
  escalateConversation,
} = require("../ai/escalationService");
const Conversation = require("../../models/conversation");

const handleIncomingMessage = async (companyId, message, metadata) => {
  try {
    const req = {
      companyId,
      body: {
        phone: message.from,
        message: message.text?.body || "",
        sender: "user",
        name: metadata?.profile?.name || message.from,
        status: "received",
        whatsappMessageId: message.id,
      },
    };

    const res = createMockResponse();

    await saveMessage(req, res);

    const incomingText = message.text?.body || "";

    // Consent intent is checked first and takes priority regardless of AI
    // state — an opt-out must be honored even mid human-handled conversation.
    const consentIntent = await applyConsentIntent(companyId, message.from, incomingText);
    if (consentIntent === "opt_out") {
      return res.getData();
    }

    const conversationSettings = await getConversationSettings(companyId, message.from);

    // An already opted-out contact must not receive further AI replies on
    // any later message, not just the one carrying the opt-out keyword.
    if (conversationSettings.contact?.optedOut) {
      return res.getData();
    }

    if (!conversationSettings.aiEnabled) {
      return res.getData();
    }

    if (detectExplicitEscalationRequest(incomingText)) {
      await escalateConversation(conversationSettings.conversation._id, "customer_request");
      return res.getData();
    }

    try {
      const credentials = await getCompanyWhatsAppCredentials(companyId);
      if (!credentials) {
        console.error(`Company ${companyId} has no connected WhatsApp account — cannot send AI reply.`);
        return res.getData();
      }

      const result = await executeAIWorkflow(credentials, message);
      const aiReq = {
        companyId,
        body: {
          phone: message.from,
          message: result.aiReply,
          sender: "ai",
          status: result.status,
          whatsappMessageId: result.whatsappMessageId,
          senderName: "AI Assistant",
        },
      };

      const aiRes = createMockResponse();

      await saveMessage(aiReq, aiRes);

      // Atomic $inc so this never clobbers the lastMessage/lastMessageTime
      // fields the saveMessage call above just wrote to this same document.
      const updatedConversation = await Conversation.findByIdAndUpdate(
        conversationSettings.conversation._id,
        { $inc: { aiTurnCount: 1 } },
        { new: true },
      );

      if (detectLowConfidenceReply(result.aiReply)) {
        await escalateConversation(updatedConversation._id, "low_confidence");
      } else if (updatedConversation.aiTurnCount >= AI_TURN_LIMIT) {
        await escalateConversation(updatedConversation._id, "turn_limit");
      }
    } catch (aiError) {
      // Incoming message is already saved at this point — an AI/Meta send
      // failure here must not bubble up and fail the whole webhook, or Meta
      // will retry the entire delivery and re-save a duplicate user message.
      console.error("AI Workflow Error (reply not sent):", aiError.response?.data || aiError.message);
    }

    return res.getData();
  } catch (error) {
    console.error("Incoming Message Handler Error:", error);
    throw error;
  }
};

module.exports = {
  handleIncomingMessage,
};
