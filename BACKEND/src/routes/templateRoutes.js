const express = require("express");

const router = express.Router();

const upload = require("../middlewares/uploadMiddleware");

const {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  updateTemplateStatus,
  submitTemplateForApproval,
  syncTemplatesFromMeta,
} = require("../controllers/templateController");
const { draftTemplate } = require("../controllers/templateDraftController");

const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const PERMISSIONS = require("../constants/permissions");

// GET ALL TEMPLATES
router.get(
  "/",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.TEMPLATE_VIEW),
  getTemplates,
);

// GET SINGLE TEMPLATE
router.get(
  "/:id",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.TEMPLATE_VIEW),
  getTemplateById,
);

// media = local/normal template attachment, headerMedia = Meta template
// HEADER component media — distinct fields since they serve different
// pipelines (see uploadMiddleware's destination routing).
const templateUploadFields = upload.fields([
  { name: "media", maxCount: 1 },
  { name: "headerMedia", maxCount: 1 },
]);

// CREATE TEMPLATE
router.post(
  "/",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.TEMPLATE_MANAGE),
  templateUploadFields,
  createTemplate,
);

// AI-ASSISTED DRAFT — gives a non-technical user a starting point for the
// message body; never blocks manual entry if it fails
router.post(
  "/draft",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.TEMPLATE_MANAGE),
  draftTemplate,
);

// UPDATE TEMPLATE
router.put(
  "/:id",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.TEMPLATE_MANAGE),
  templateUploadFields,
  updateTemplate,
);

// UPDATE TEMPLATE STATUS
router.patch(
  "/:id/status",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.TEMPLATE_MANAGE),
  updateTemplateStatus,
);

// SUBMIT TEMPLATE FOR META APPROVAL
router.post(
  "/:id/submit",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.TEMPLATE_MANAGE),
  submitTemplateForApproval,
);

// SYNC TEMPLATE STATUSES FROM META (safety net for missed webhooks)
router.post(
  "/sync-meta",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.TEMPLATE_MANAGE),
  syncTemplatesFromMeta,
);

// DELETE TEMPLATE
router.delete(
  "/:id",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.TEMPLATE_DELETE),
  deleteTemplate,
);

module.exports = router;
