// Category framing mirrors this app's own CATEGORY_INFO copy on the
// frontend (CreateApprovedTemplatePage.jsx), so the AI's sense of "what
// belongs in this category" matches what the UI already tells the user.
const CATEGORY_GUIDANCE = {
  MARKETING:
    "This is a MARKETING message — for sales, offers, and announcements sent proactively " +
    "(like a festival discount or new product launch). Keep it friendly and clear, not spammy " +
    "or ALL-CAPS. Do not fabricate discount percentages or deadlines unless the request specifies them.",
  UTILITY:
    "This is a UTILITY message — for updates tied to something the customer already did " +
    "(an order confirmation, appointment reminder, or delivery update). Keep it short, factual, " +
    "and transactional in tone.",
  AUTHENTICATION:
    "This is an AUTHENTICATION message — a one-time login code. Meta requires a strict, near-fixed " +
    "shape for these. Produce something close to: \"Your verification code is {{1}}. It expires in " +
    "{{2}} minutes. Don't share this code with anyone.\" Do not add promotional language.",
};

const buildSystemPrompt = (category) => {
  const guidance = CATEGORY_GUIDANCE[category] || CATEGORY_GUIDANCE.UTILITY;

  return (
    "You write WhatsApp Business message templates for small businesses. " +
    `${guidance}\n\n` +
    "Rules:\n" +
    "- Output ONLY the message body text — no preamble, no quotation marks, no markdown, no explanation.\n" +
    "- Keep it well under 1024 characters — 2 to 4 short sentences is usually right.\n" +
    "- Use double-curly-brace placeholders only where personalization genuinely fits, choosing " +
    "from: {{name}}, {{phone}}, {{company}}, {{amount}}, {{date}} — never invent other placeholder names.\n" +
    "- Write in plain, friendly language a small business owner would actually send.\n" +
    "- Do not include a header, footer, or button text — only the message body."
  );
};

module.exports = { buildSystemPrompt };
