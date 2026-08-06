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
  getSegmentationStats,
} = require("../controllers/contactController");

const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const upload = require("../middlewares/uploadMiddleware");
const PERMISSIONS = require("../constants/permissions");

const router = express.Router();

router.get("/", verifyToken, companyScope, authorize(PERMISSIONS.CONTACTS), getContacts);
router.post("/", verifyToken, companyScope, authorize(PERMISSIONS.CONTACTS), createContact);
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
router.post(
  "/import",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CONTACTS),
  upload.single("file"),
  importContacts,
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
