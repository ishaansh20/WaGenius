const Contact = require("../../models/contact");
const { getIO } = require("../../sockets/socket");
const Conversation = require("../../models/conversation");

// Matched against the whole message, case-insensitively, after trimming. Kept
// as whole-word/phrase matches so words like "stopwatch" don't false-positive.
const OPT_OUT_PATTERNS = [
  /^stop$/i,
  /^unsubscribe$/i,
  /^opt\s*out$/i,
  /\bstop\s+(messages|texting|messaging)\b/i,
  /\bunsubscribe\s+me\b/i,
  /\bdo\s+not\s+(message|text|contact)\s+me\b/i,
  /\bremove\s+me\s+from\s+(this\s+)?(list|campaign)/i,
];

const OPT_IN_PATTERNS = [
  /^start$/i,
  /^subscribe$/i,
  /^opt\s*in$/i,
  /\bsubscribe\s+me\b/i,
  /\bresume\s+messages\b/i,
];

const detectConsentIntent = (text) => {
  const message = (text || "").trim();
  if (!message) return null;

  if (OPT_OUT_PATTERNS.some((pattern) => pattern.test(message))) return "opt_out";
  if (OPT_IN_PATTERNS.some((pattern) => pattern.test(message))) return "opt_in";
  return null;
};

const setContactOptOut = async (companyId, contact, optedOut) => {
  contact.optedOut = optedOut;
  contact.optedOutAt = optedOut ? new Date() : null;
  await contact.save();

  const updatedConversation = await Conversation.findOne({
    companyId,
    contact: contact._id,
  }).populate("contact");

  if (updatedConversation) {
    const io = getIO();
    io.to("inbox").emit("conversation_updated", updatedConversation);
  }

  return updatedConversation;
};

// Applies an opt-out/opt-in message if detected. Returns the intent applied
// ("opt_out" | "opt_in") or null if the message carried no consent intent.
const applyConsentIntent = async (companyId, phone, text) => {
  const intent = detectConsentIntent(text);
  if (!intent) return null;

  const contact = await Contact.findOne({ companyId, phone });
  if (!contact) return null;

  await setContactOptOut(companyId, contact, intent === "opt_out");

  return intent;
};

module.exports = {
  detectConsentIntent,
  applyConsentIntent,
  setContactOptOut,
};
