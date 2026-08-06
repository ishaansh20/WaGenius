const axios = require("axios");

const { buildSystemPrompt } = require("../../config/templateDraftPrompt");
const { normalizeLineEndings } = require("../whatsapp/templateService");
const { withRetry } = require("../../utils/withRetry");

// Mirrors groqService.js's exact call shape (endpoint, model env fallback,
// auth header) — deliberately a separate service from groqService.js, not a
// retrofit of it: that file's SYSTEM_PROMPT is a fixed customer-support
// persona for live chat replies, unrelated to drafting a template body.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const MAX_BODY_LENGTH = 1024; // Meta's template body character limit

// Strips wrapping quotes a model sometimes adds despite being told not to.
const stripWrappingQuotes = (text) => {
  const trimmed = text.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

// Drafts a WhatsApp template body from a plain-language goal — used only to
// give a non-technical user a starting point; the result is always
// editable, never submitted as-is without the user seeing it first.
const draftTemplateBody = async ({ goal, category }) => {
  const response = await withRetry(
    () =>
      axios.post(
        GROQ_URL,
        {
          model: MODEL,
          messages: [
            { role: "system", content: buildSystemPrompt(category) },
            { role: "user", content: goal },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        },
      ),
    { label: "draftTemplateBody" },
  );

  const raw = response.data.choices[0].message.content;
  const cleaned = normalizeLineEndings(stripWrappingQuotes(raw));

  return cleaned.slice(0, MAX_BODY_LENGTH);
};

module.exports = { draftTemplateBody };
