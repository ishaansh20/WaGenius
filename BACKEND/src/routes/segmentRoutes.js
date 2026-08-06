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
const PERMISSIONS = require("../constants/permissions");

const router = express.Router();

router.get("/", verifyToken, companyScope, authorize(PERMISSIONS.CONTACTS), listSegments);
router.post("/", verifyToken, companyScope, authorize(PERMISSIONS.CONTACTS), createSegment);
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
  addContactsToSegment,
);
router.delete(
  "/:id/contacts/:contactId",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.CONTACTS),
  removeContactFromSegment,
);

module.exports = router;
