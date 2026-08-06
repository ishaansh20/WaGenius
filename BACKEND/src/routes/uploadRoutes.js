const express = require("express");

const upload = require("../middlewares/uploadMiddleware");

const { uploadCampaign } = require("../controllers/uploadController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const PERMISSIONS = require("../constants/permissions");

const router = express.Router();

router.post(
  "/upload",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CAMPAIGNS),
  upload.single("file"),
  uploadCampaign,
);

module.exports = router;
