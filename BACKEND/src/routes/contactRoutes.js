const express = require("express");

const {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  bulkDeleteContacts,
  bulkUpdateTags,
  importContacts,
  exportContacts,
  getSegmentationStats,
} = require("../controllers/contactController");

const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const upload = require("../middlewares/uploadMiddleware");
const PERMISSIONS = require("../constants/permissions");
const { checkLimit, checkFeature } = require("../middlewares/planGate");
const { requireCompanySetup } = require("../middlewares/setupGate");

const router = express.Router();

router.use(verifyToken, companyScope, requireCompanySetup());

router.get("/", verifyToken, companyScope, authorize(PERMISSIONS.CONTACTS), getContacts);
router.post(
  "/",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CONTACTS),
  checkLimit("contacts"),
  createContact,
);
router.post(
  "/bulk-delete",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CONTACTS),
  bulkDeleteContacts,
);
router.patch(
  "/bulk-tags",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CONTACTS),
  bulkUpdateTags,
);

// Bulk CSV import — gated on contactImport feature flag (Pro+)
router.post(
  "/import",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CONTACTS),
  checkFeature("contactImport"),
  checkLimit("contacts"),
  upload.single("file"),
  importContacts,
);

// CSV export — gated on contactExport feature flag (Pro+)
router.get(
  "/export",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CONTACTS),
  checkFeature("contactExport"),
  exportContacts,
);

router.get(
  "/stats/segmentation",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.DASHBOARD_ANALYTICS),
  getSegmentationStats,
);
router.get("/:id", verifyToken, companyScope, authorize(PERMISSIONS.CONTACTS), getContact);
router.patch("/:id", verifyToken, companyScope, authorize(PERMISSIONS.CONTACTS), updateContact);
router.delete("/:id", verifyToken, companyScope, authorize(PERMISSIONS.CONTACTS), deleteContact);

module.exports = router;
