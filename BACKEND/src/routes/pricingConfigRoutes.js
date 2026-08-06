const express = require("express");

const {
  getPricingConfig,
  updatePricingConfig,
} = require("../controllers/pricingConfigController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const PERMISSIONS = require("../constants/permissions");

const router = express.Router();

router.get("/pricing", verifyToken, companyScope, authorize(PERMISSIONS.SETTINGS), getPricingConfig);
router.put("/pricing", verifyToken, companyScope, authorize(PERMISSIONS.SETTINGS), updatePricingConfig);

module.exports = router;
