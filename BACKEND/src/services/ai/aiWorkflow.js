const { generateReply } = require("./groqService");
const { sendTextMessage } = require("../whatsapp/whatsappService");

const executeAIWorkflow = async (credentials, message) => {
  const userMessage = message.text?.body || "";

  // Generate AI reply
  const aiReply = await generateReply(userMessage);

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
