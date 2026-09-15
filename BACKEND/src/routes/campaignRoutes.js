const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const PERMISSIONS = require("../constants/permissions");
const { checkFeature } = require("../middlewares/planGate");
const { requireCompanySetup } = require("../middlewares/setupGate");
const { SETUP_STATUS } = require("../utils/setupStatus");

const router = express.Router();

// Require authenticated company context and READY setup status for all campaign actions
router.use(verifyToken, companyScope, requireCompanySetup());

const {
  getCampaigns,
  getSingleCampaign,
  duplicateCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  updateCampaignStatus,
  retryFailedCampaignMessages,
  getAllCampaigns,
  getCampaignReplyAnalytics,
  downloadCampaignReport,
  getCostSummary,
  sendCampaignTestMessage,
} = require("../controllers/campaignController");

router.get(
  "/list",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGN_ANALYTICS),
  getCampaigns,
);
router.get(
  "/",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.DASHBOARD_ANALYTICS),
  getAllCampaigns,
);
// Registered before "/:id" — a bare literal path like this would otherwise
// be swallowed by the "/:id" param route below.
router.get(
  "/cost-summary",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGN_ANALYTICS),
  getCostSummary,
);
router.get(
  "/:id",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGN_ANALYTICS),
  getSingleCampaign,
);
// Previously had no auth at all — no known caller today, secured defensively.
router.post("/update-status", verifyToken, companyScope, updateCampaignStatus);
router.post(
  "/test-send",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGNS),
  requireCompanySetup(SETUP_STATUS.READY),
  sendCampaignTestMessage,
);
router.post(
  "/:id/retry-failed",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGNS),
  requireCompanySetup(SETUP_STATUS.READY),
  retryFailedCampaignMessages,
);
router.post(
  "/:id/duplicate",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGNS),
  duplicateCampaign,
);
router.post(
  "/:id/pause",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGNS),
  pauseCampaign,
);
router.post(
  "/:id/resume",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGNS),
  resumeCampaign,
);
router.post(
  "/:id/cancel",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGNS),
  cancelCampaign,
);

router.get(
  "/:id/replies",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGN_ANALYTICS),
  getCampaignReplyAnalytics,
);

// Campaign report CSV download — gated on analyticsExport feature flag (Pro+)
router.get(
  "/:id/report",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGN_ANALYTICS),
  checkFeature("analyticsExport"),
  downloadCampaignReport,
);

module.exports = router;
