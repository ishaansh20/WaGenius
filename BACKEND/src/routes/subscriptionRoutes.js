const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const {
  getMySubscription,
  getMyPlanAccess,
  selectPlan,
  endTrial,
} = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/me", verifyToken, companyScope, getMySubscription);
router.get("/plan-access", verifyToken, companyScope, getMyPlanAccess);
router.patch("/me", verifyToken, companyScope, selectPlan);
router.post("/me/end-trial", verifyToken, companyScope, endTrial);

module.exports = router;
