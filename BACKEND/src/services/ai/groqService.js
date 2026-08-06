const axios = require("axios");

const SYSTEM_PROMPT = require("../../config/aiPrompt");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const generateReply = async (userMessage) => {
  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: MODEL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("\n========== GROQ ERROR ==========");
    console.error(error.response?.data || error.message);
    console.error("================================\n");

    throw error;
  }
};

module.exports = {
  generateReply,
};
