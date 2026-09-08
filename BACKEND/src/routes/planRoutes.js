const express = require("express");
const { getPublicPlans } = require("../controllers/planController");

const router = express.Router();

// Public — used by pricing page & customer Billing tab.
router.get("/", getPublicPlans);

module.exports = router;
