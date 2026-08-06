const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const PERMISSIONS = require("../constants/permissions");

const router = express.Router();

const {
  getCampaigns,
  getSingleCampaign,
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
  sendCampaignTestMessage,
);
router.post(
  "/:id/retry-failed",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGNS),
  retryFailedCampaignMessages,
);

router.get(
  "/:id/replies",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGN_ANALYTICS),
  getCampaignReplyAnalytics,
);

router.get(
  "/:id/report",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGN_ANALYTICS),
  downloadCampaignReport,
);

module.exports = router;
