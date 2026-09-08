const express = require("express");

const {
  createSegment,
  listSegments,
  deleteSegment,
  getSegmentContacts,
  addContactsToSegment,
  removeContactFromSegment,
} = require("../controllers/segmentController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const { checkFeature } = require("../middlewares/planGate");
const { requireCompanySetup } = require("../middlewares/setupGate");
const PERMISSIONS = require("../constants/permissions");

const router = express.Router();

router.use(verifyToken, companyScope, requireCompanySetup());

router.get("/", verifyToken, companyScope, authorize(PERMISSIONS.CONTACTS), listSegments);
router.post(
  "/",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CONTACTS),
  checkFeature("advancedSegmentation"),
  createSegment,
);
router.delete("/:id", verifyToken, companyScope, authorize(PERMISSIONS.CONTACTS), deleteSegment);
router.get(
  "/:id/contacts",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CONTACTS),
  getSegmentContacts,
);
router.post(
  "/:id/contacts",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CONTACTS),
  checkFeature("advancedSegmentation"),
  addContactsToSegment,
);
router.delete(
  "/:id/contacts/:contactId",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CONTACTS),
  checkFeature("advancedSegmentation"),
  removeContactFromSegment,
);

module.exports = router;
