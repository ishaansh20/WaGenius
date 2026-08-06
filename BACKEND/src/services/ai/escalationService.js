const Conversation = require("../../models/conversation");
const { getIO } = require("../../sockets/socket");

// Max number of AI-authored replies allowed in a conversation before it is
// handed to a human regardless of content, so a customer never gets stuck
// looping with the bot indefinitely.
const AI_TURN_LIMIT = 6;

const HUMAN_REQUEST_PATTERNS = [
  /\bhuman\b/i,
  /\bagent\b/i,
  /\breal\s+person\b/i,
  /\btalk\s+to\s+(a\s+)?(someone|person|human|agent|representative)\b/i,
  /\bspeak\s+(to|with)\s+(a\s+)?(someone|person|human|agent|representative)\b/i,
  /\bconnect\s+me\s+to\b/i,
  /\brepresentative\b/i,
  /\bcustomer\s+service\b/i,
  /\bmanager\b/i,
  /\bstop\s+the\s+bot\b/i,
  /\bnot\s+a\s+bot\b/i,
];

// Phrases Groq tends to produce when it's guessing/uncertain rather than
// giving a grounded answer — no real confidence score is available from the
// API, so this scans its own reply text as a heuristic stand-in for one.
const LOW_CONFIDENCE_PATTERNS = [
  /\bi'?m\s+not\s+sure\b/i,
  /\bi\s+do\s+not\s+know\b/i,
  /\bi\s+don'?t\s+know\b/i,
  /\bi'?m\s+unable\s+to\b/i,
  /\bi\s+cannot\s+help\s+with\b/i,
  /\bas\s+an\s+ai\b/i,
  /\bi\s+don'?t\s+have\s+(that|access|enough)\s+information\b/i,
  /\bi\s+recommend\s+(contacting|reaching\s+out\s+to)\s+(our\s+)?(support|team|agent)\b/i,
  /\bplease\s+contact\s+(our\s+)?support\b/i,
];

const detectExplicitEscalationRequest = (text) => {
  const message = (text || "").trim();
  if (!message) return false;
  return HUMAN_REQUEST_PATTERNS.some((pattern) => pattern.test(message));
};

const detectLowConfidenceReply = (aiReply) => {
  const reply = (aiReply || "").trim();
  if (!reply) return false;
  return LOW_CONFIDENCE_PATTERNS.some((pattern) => pattern.test(reply));
};

const escalateConversation = async (conversationId, reason) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.aiEnabled) return null;

  conversation.aiEnabled = false;
  conversation.status = "HUMAN_PENDING";
  conversation.escalationReason = reason;
  conversation.escalatedAt = new Date();
  await conversation.save();

  const updatedConversation = await Conversation.findById(conversationId).populate("contact");

  const io = getIO();
  io.to("inbox").emit("conversation_updated", updatedConversation);

  return updatedConversation;
};

module.exports = {
  AI_TURN_LIMIT,
  detectExplicitEscalationRequest,
  detectLowConfidenceReply,
  escalateConversation,
};
