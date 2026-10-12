const { generateReply } = require("./groqService");
const { sendTextMessage } = require("../whatsapp/whatsappService");
const { buildSystemPrompt } = require("../../config/aiPrompt");
const Company = require("../../models/company");

const executeAIWorkflow = async (credentials, message, { companyId } = {}) => {
  const userMessage = message.text?.body || "";

  // Each company's assistant speaks for that company only.
  const company = companyId ? await Company.findById(companyId).select("name aiInstructions").lean() : null;
  const systemPrompt = buildSystemPrompt({
    companyName: company?.name,
    instructions: company?.aiInstructions,
  });

  // Generate AI reply
  const aiReply = await generateReply(userMessage, { systemPrompt });

  // Send reply to WhatsApp
  const metaResponse = await sendTextMessage(credentials, message.from, aiReply);

  return {
    aiReply,
    whatsappMessageId: metaResponse.messages?.[0]?.id,
    status: "sent",
  };
};

module.exports = {
  executeAIWorkflow,
};
