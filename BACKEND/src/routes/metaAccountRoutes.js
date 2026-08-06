const express = require("express");

const { getHealth } = require("../controllers/metaAccountController");
const { getPricing } = require("../controllers/metaPricingController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const PERMISSIONS = require("../constants/permissions");

const router = express.Router();

router.get("/health", verifyToken, companyScope, authorize(PERMISSIONS.DASHBOARD_ANALYTICS), getHealth);
router.get("/pricing", verifyToken, companyScope, authorize(PERMISSIONS.DASHBOARD_ANALYTICS), getPricing);

module.exports = router;
