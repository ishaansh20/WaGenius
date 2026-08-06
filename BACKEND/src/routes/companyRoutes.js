const express = require("express");

const { getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp } = require("../controllers/companyController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const PERMISSIONS = require("../constants/permissions");

const router = express.Router();

router.get(
  "/whatsapp-status",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.SETTINGS),
  getWhatsAppStatus,
);
router.post(
  "/connect-whatsapp",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.SETTINGS),
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
