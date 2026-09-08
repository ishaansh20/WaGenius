const express = require("express");

const router = express.Router();

const {
  saveMessage,
  getConversations,
  getMessagesbyConversation,
  markConversationAsRead,
  sendMessage,
  updateMessageStatus,
  toggleConversationAi,
  getConversationByPhone,
  updateContactTags,
  updateContactConsent,
  assignConversation,
} = require("../controllers/messageController");

const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const { requireCompanySetup } = require("../middlewares/setupGate");
const PERMISSIONS = require("../constants/permissions");

router.use(
  ["/messages", "/conversations", "/send-message"],
  verifyToken,
  companyScope,
  requireCompanySetup(),
);

// These three previously had no auth at all — saveMessage/updateMessageStatus
// are also invoked directly (bypassing Express entirely, via a synthetic req)
// from incomingMessageHandler.js/webhookService.js for real inbound WhatsApp
// traffic, which is unaffected by adding auth to the HTTP route itself.
router.post("/messages", verifyToken, companyScope, saveMessage);
router.get(
  "/conversations",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.INBOX),
  getConversations,
);
router.get(
  "/messages/:conversationId",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.INBOX),
  getMessagesbyConversation,
);
router.patch(
  "/conversations/:conversationId/read",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.INBOX),
  markConversationAsRead,
);
router.post(
  "/send-message",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.INBOX),
  sendMessage,
);
router.post("/messages/status", verifyToken, companyScope, updateMessageStatus);
router.patch(
  "/conversations/:conversationId/toggle-ai",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.INBOX),
  toggleConversationAi,
);
router.get("/conversations/by-phone/:phone", verifyToken, companyScope, getConversationByPhone);
router.patch(
  "/messages/contacts/:id/tags",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.INBOX),
  updateContactTags,
);
router.patch(
  "/messages/contacts/:id/consent",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.INBOX),
  updateContactConsent,
);
router.patch(
  "/conversations/:id/assign",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.ASSIGN_CONVERSATION),
  assignConversation,
);

module.exports = router;
