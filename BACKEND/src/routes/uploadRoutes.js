const express = require("express");

const upload = require("../middlewares/uploadMiddleware");

const { uploadCampaign } = require("../controllers/uploadController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const PERMISSIONS = require("../constants/permissions");
const { requireCompanySetup } = require("../middlewares/setupGate");
const { SETUP_STATUS } = require("../utils/setupStatus");

const router = express.Router();

router.post(
  "/upload",
  verifyToken,
  companyScope,
  requireCompanySetup(SETUP_STATUS.READY),
  authorize(PERMISSIONS.CAMPAIGNS),
  upload.single("file"),
  uploadCampaign,
);

module.exports = router;
