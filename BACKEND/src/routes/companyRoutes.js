const express = require("express");

const {
  getWhatsAppStatus,
  getCompanySetupStatus,
  connectWhatsApp,
  disconnectWhatsApp,
  healthCheckWhatsApp,
  getWhatsAppNumbers,
  syncWhatsAppNumbers,
  setDefaultWhatsAppNumber,
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

router.get(
  "/whatsapp/health-check",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.SETTINGS),
  healthCheckWhatsApp,
);

// WhatsApp numbers of this company. Listing is open to every signed-in user
// of the company (campaign makers and inbox agents need to see which number
// they use); syncing and changing the default are settings-only.
router.get("/whatsapp/numbers", verifyToken, companyScope, getWhatsAppNumbers);
router.post(
  "/whatsapp/numbers/sync",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.SETTINGS),
  syncWhatsAppNumbers,
);
router.put(
  "/whatsapp/numbers/default",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.SETTINGS),
  setDefaultWhatsAppNumber,
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
