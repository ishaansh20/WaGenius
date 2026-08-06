const express = require("express");

const { platformLogin } = require("../controllers/authController");
const {
  listCompanies,
  getCompanyDetail,
  updateCompanyStatus,
} = require("../controllers/platformController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requirePlatformRole } = require("../middlewares/requirePlatformRole");

const router = express.Router();

// Separate login surface from /api/auth/login — see authController.js's
// platformLogin for the strict-separation reasoning.
router.post("/auth/login", platformLogin);

router.get("/companies", verifyToken, requirePlatformRole(["SUPER_ADMIN"]), listCompanies);
router.get("/companies/:id", verifyToken, requirePlatformRole(["SUPER_ADMIN"]), getCompanyDetail);
router.patch(
  "/companies/:id/status",
  verifyToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  updateCompanyStatus,
);

module.exports = router;
