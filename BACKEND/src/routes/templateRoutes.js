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
  importTemplatesFromMeta,
} = require("../controllers/templateController");
const { draftTemplate } = require("../controllers/templateDraftController");

const { verifyToken } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const { companyScope } = require("../middlewares/companyScope");
const PERMISSIONS = require("../constants/permissions");
const { checkLimit, checkFeature } = require("../middlewares/planGate");
const { requireCompanySetup } = require("../middlewares/setupGate");

router.use(verifyToken, companyScope, requireCompanySetup());

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
  checkLimit("templates"),
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
  checkFeature("ai"),
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

// IMPORT TEMPLATES FROM META (bring in externally-created/approved templates)
router.post(
  "/import-meta",
  verifyToken,
  companyScope,
  authorize(PERMISSIONS.TEMPLATE_MANAGE),
  importTemplatesFromMeta,
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
