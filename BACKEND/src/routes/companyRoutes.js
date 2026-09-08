const express = require("express");

const {
  getWhatsAppStatus,
  getCompanySetupStatus,
  connectWhatsApp,
  disconnectWhatsApp,
} = require("../controllers/companyController");
const {
  completeEmbeddedSignup,
} = require("../controllers/embeddedSignupController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const { checkLimit } = require("../middlewares/planGate");
const PERMISSIONS = require("../constants/permissions");

const router = express.Router();

// Company Setup State (Single source of truth for onboarding access)
router.get(
  "/setup-status",
  verifyToken,
  companyScope,
  getCompanySetupStatus,
);

// WhatsApp Connection Status (both paths supported)
router.get(
  "/whatsapp/status",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.SETTINGS),
  getWhatsAppStatus,
);
router.get(
  "/whatsapp-status",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.SETTINGS),
  getWhatsAppStatus,
);

// Meta Embedded Signup completion endpoint
router.post(
  "/whatsapp/embedded-signup/complete",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.SETTINGS),
  checkLimit("whatsappNumbers"),
  completeEmbeddedSignup,
);

// Manual WhatsApp Connection
router.post(
  "/connect-whatsapp",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.SETTINGS),
  checkLimit("whatsappNumbers"),
  connectWhatsApp,
);
router.post(
  "/disconnect-whatsapp",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.SETTINGS),
  disconnectWhatsApp,
);

module.exports = router;
