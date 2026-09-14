const path = require("path");
const axios = require("axios");
const Template = require("../models/template");
const {
  submitTemplateToMeta,
  fetchMetaTemplates,
  validateButtons,
} = require("../services/whatsapp/templateService");
const { getHeaderHandle } = require("../services/whatsapp/metaMediaService");
const { applyMetaTemplateStatus } = require("../services/whatsapp/webhookService");
const { getCompanyWhatsAppCredentials } = require("../services/whatsapp/companyCredentials");
const { getIO } = require("../sockets/socket");
const { slugify } = require("../utils/slugify");

// The new template wizard never shows the raw "Meta Template Name" field to
// the user, so this generates one automatically when it's missing —
// duplicating the exact frontend slugify() logic (see utils/slugify.js).
const MAX_NAME_COLLISION_ATTEMPTS = 5;

const generateUniqueMetaTemplateName = async (companyId, template) => {
  const base = slugify(template.name) || `template_${template._id}`;
  let candidate = base;
  let suffix = 1;

  while (suffix <= MAX_NAME_COLLISION_ATTEMPTS) {
    const existing = await Template.findOne({
      companyId,
      metaTemplateName: candidate,
      _id: { $ne: template._id },
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}_${suffix}`;
  }

  return candidate;
};

// True only for Meta's specific "this template name already exists on your
// WABA" rejection — everything else must fall through unchanged to the
// existing generic error response. NOTE: the exact error code/subcode below
// needs confirming against a real rejected-submission response before fully
// relying on it; the message-text check is a safety-net in the meantime so
// an unconfirmed shape still degrades to "treat as a normal error" rather
// than silently mishandling something else.
const isNameCollisionError = (error) => {
  const metaError = error.response?.data?.error;
  if (!metaError) return false;
  if (metaError.error_subcode === 2388023) return true;
  return /already exists|template with this name/i.test(
    metaError.message || metaError.error_user_msg || "",
  );
};

// Retries the Meta submission with an incremented name suffix specifically
// on a name-collision rejection (e.g. a name registered outside this app's
// own DB, so the local pre-check in generateUniqueMetaTemplateName couldn't
// have caught it) — transparent to the user, no manual involvement unless
// every attempt is exhausted.
const submitWithNameCollisionRetry = async (credentials, template) => {
  let attempt = 0;

  while (true) {
    try {
      return await submitTemplateToMeta(credentials, template);
    } catch (error) {
      if (!isNameCollisionError(error) || attempt >= MAX_NAME_COLLISION_ATTEMPTS) {
        throw error;
      }
      attempt += 1;
      template.metaTemplateName = `${template.metaTemplateName}_${attempt + 1}`;
    }
  }
};

// `buttons` arrives as a JSON string over multipart/form-data (it's a
// nested array, not a flat field) — parse defensively since a malformed
// value shouldn't crash the request.
const parseButtons = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// CREATE TEMPLATE
const createTemplate = async (req, res) => {
  try {
    const {
      name,
      subject,
      category,
      description,
      status,
      headerType,
      headerText,
      headerTextExample,
    } = req.body;

    const mediaFile = req.files?.media?.[0];
    const headerMediaFile = req.files?.headerMedia?.[0];
    const buttons = parseButtons(req.body.buttons);

    if (buttons.length > 0) {
      try {
        validateButtons(buttons);
      } catch (validationError) {
        return res.status(400).json({ success: false, message: validationError.message });
      }
    }

    const template = await Template.create({
      companyId: req.companyId,
      name,
      subject,
      category,
      description,
      status,
      mediaUrl: mediaFile ? mediaFile.path : "",
      mediaType: mediaFile ? mediaFile.mimetype : "",
      headerType: headerType || "NONE",
      headerText: headerText || "",
      headerTextExample: headerTextExample || "",
      headerMediaUrl: headerMediaFile ? headerMediaFile.path : "",
      headerMediaType: headerMediaFile ? headerMediaFile.mimetype : "",
      buttons,
    });

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      template,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to create template",
    });
  }
};

// GET ALL TEMPLATES
const getTemplates = async (req, res) => {
  try {
    const templates = await Template.find({ companyId: req.companyId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      templates,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch templates",
    });
  }
};

// GET SINGLE TEMPLATE
const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findOne({ _id: req.params.id, companyId: req.companyId });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      template,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch template",
    });
  }
};

// UPDATE TEMPLATE
const updateTemplate = async (req, res) => {
  try {
    const {
      name,
      subject,
      category,
      description,
      status,
      headerType,
      headerText,
      headerTextExample,
    } = req.body;

    const updatedData = {
      name,
      subject,
      category,
      description,
      status,
      ...(headerType !== undefined && { headerType }),
      ...(headerText !== undefined && { headerText }),
      ...(headerTextExample !== undefined && { headerTextExample }),
    };

    if (req.body.buttons !== undefined) {
      const buttons = parseButtons(req.body.buttons);
      if (buttons.length > 0) {
        try {
          validateButtons(buttons);
        } catch (validationError) {
          return res.status(400).json({ success: false, message: validationError.message });
        }
      }
      updatedData.buttons = buttons;
    }

    if (req.body.removeMedia === "true") {
      updatedData.mediaUrl = "";
      updatedData.mediaType = "";
    }
    if (req.body.removeHeaderMedia === "true") {
      updatedData.headerMediaUrl = "";
      updatedData.headerMediaType = "";
      updatedData.headerHandle = "";
    }

    const mediaFile = req.files?.media?.[0];
    const headerMediaFile = req.files?.headerMedia?.[0];

    if (mediaFile) {
      updatedData.mediaUrl = mediaFile.path;
      updatedData.mediaType = mediaFile.mimetype;
      if (headerType === "IMAGE" || !updatedData.headerMediaUrl) {
        updatedData.headerMediaUrl = mediaFile.path;
        updatedData.headerMediaType = mediaFile.mimetype;
        updatedData.headerHandle = "";
      }
    }

    if (headerMediaFile) {
      updatedData.headerMediaUrl = headerMediaFile.path;
      updatedData.headerMediaType = headerMediaFile.mimetype;
      updatedData.headerHandle = "";
      if (!updatedData.mediaUrl) {
        updatedData.mediaUrl = headerMediaFile.path;
        updatedData.mediaType = headerMediaFile.mimetype;
      }
    }

    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      updatedData,
      {
        new: true,
      },
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      template,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to update template",
    });
  }
};

// DELETE TEMPLATE
const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to delete template",
    });
  }
};

// UPDATE TEMPLATE STATUS
const updateTemplateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      {
        status,
      },
      {
        new: true,
      },
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Template status updated",
      template,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};

// SUBMIT TEMPLATE FOR META APPROVAL
const submitTemplateForApproval = async (req, res) => {
  try {
    const { metaTemplateName, metaCategory, language, bodyVariableExamples } =
      req.body;

    const template = await Template.findOne({ _id: req.params.id, companyId: req.companyId });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    const credentials = await getCompanyWhatsAppCredentials(req.companyId);
    if (!credentials) {
      return res.status(400).json({
        success: false,
        message: "Connect a WhatsApp Business Account before submitting templates for approval",
      });
    }

    template.metaTemplateName = metaTemplateName || template.metaTemplateName;
    template.metaCategory = metaCategory || template.metaCategory;
    template.language = language || template.language;
    template.bodyVariableExamples =
      bodyVariableExamples || template.bodyVariableExamples;

    // The wizard never shows the technical name field — auto-generate it
    // whenever the caller didn't supply one, so this only ever 400s below
    // if metaCategory is missing (metaTemplateName is now always filled).
    if (!template.metaTemplateName) {
      template.metaTemplateName = await generateUniqueMetaTemplateName(req.companyId, template);
    }

    if (!template.metaTemplateName || !template.metaCategory) {
      return res.status(400).json({
        success: false,
        message: "metaTemplateName and metaCategory are required to submit",
      });
    }

    const isMediaHeader = ["IMAGE", "VIDEO", "DOCUMENT"].includes(template.headerType);

    if (isMediaHeader && !template.headerMediaUrl) {
      return res.status(400).json({
        success: false,
        message: `Upload a ${template.headerType.toLowerCase()} for the header before submitting`,
      });
    }

    // Re-upload on every submit attempt rather than trusting a cached
    // handle — simplest way to guarantee it's never stale after a rejected
    // template gets edited and resubmitted with the same media.
    if (isMediaHeader) {
      template.headerHandle = await getHeaderHandle(credentials, {
        filePath: template.headerMediaUrl,
        mimeType: template.headerMediaType || "application/octet-stream",
        fileName: path.basename(template.headerMediaUrl),
        headerType: template.headerType,
      });
    }

    const metaResponse = await submitWithNameCollisionRetry(credentials, template);

    template.metaTemplateId = metaResponse.id;
    template.metaStatus = metaResponse.status || "PENDING";
    template.rejectionReason = "";
    template.status = "pending";
    template.variableMap = metaResponse.variableMap || [];

    await template.save();

    res.status(200).json({
      success: true,
      message: "Template submitted to Meta for approval",
      template,
    });
  } catch (error) {
    console.log(error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message:
        error.response?.data?.error?.error_user_msg ||
        error.response?.data?.error?.message ||
        // Non-axios errors (e.g. validateButtons rejecting an invalid
        // button config) have no `.response` — fall back to their own
        // message instead of the generic one so the real reason surfaces.
        error.message ||
        "Failed to submit template to Meta",
    });
  }
};

// IMPORT TEMPLATES FROM META
// Fetches ALL templates from the WABA and creates local records for any
// that don't already exist in this company's DB (identified by
// metaTemplateId). Safe to call repeatedly — skips already-present ones.
// This is the fix for templates approved directly in Meta Business Manager
// that were never submitted through Wagenius.
const importTemplatesFromMeta = async (req, res) => {
  try {
    const credentials = await getCompanyWhatsAppCredentials(req.companyId);
    if (!credentials) {
      return res.status(400).json({
        success: false,
        message: "Connect a WhatsApp Business Account before importing templates",
      });
    }

    // Fetch full component data from Meta so we can reconstruct body/header/buttons.
    const { accessToken, wabaId, apiVersion } = credentials;
    const metaRes = await axios.get(
      `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`,
      {
        params: {
          access_token: accessToken,
          fields: "id,name,status,category,language,components,rejected_reason",
          limit: 250,
        },
      },
    );
    const metaTemplates = metaRes.data?.data || [];

    // Build maps of metaTemplateIds and names already in this company's DB so we
    // can skip/update them efficiently.
    const existing = await Template.find(
      { companyId: req.companyId },
      { metaTemplateId: 1, name: 1 },
    );
    const existingById = new Map();
    const existingByName = new Map();
    for (const t of existing) {
      if (t.metaTemplateId) existingById.set(String(t.metaTemplateId), t);
      if (t.name) existingByName.set(t.name, t);
    }

    const imported = [];
    const skipped = [];

    for (const mt of metaTemplates) {
      // Parse Meta's components array into our schema fields.
      const components = mt.components || [];
      let description = "";
      let headerType = "NONE";
      let headerText = "";
      let headerMediaUrl = "";
      let headerHandle = "";
      const buttons = [];

      for (const comp of components) {
        switch (comp.type) {
          case "BODY":
            description = comp.text || "";
            break;
          case "HEADER": {
            headerType = comp.format || "NONE";
            if (comp.format === "TEXT") headerText = comp.text || "";
            const rawUrl = comp.example?.header_url;
            const exampleUrl = Array.isArray(rawUrl) ? rawUrl[0] : (typeof rawUrl === "string" ? rawUrl : "");

            const rawHandle = comp.example?.header_handle;
            const exampleHandle = Array.isArray(rawHandle) ? rawHandle[0] : (typeof rawHandle === "string" ? rawHandle : "");

            if (exampleUrl) {
              headerMediaUrl = exampleUrl;
            }
            if (exampleHandle) {
              headerHandle = exampleHandle;
              // Meta Graph API puts direct WhatsApp CDN URLs inside header_handle (e.g. https://scontent.whatsapp.net/...)
              if (/^https?:\/\//i.test(exampleHandle)) {
                headerMediaUrl = exampleHandle;
              }
            }
            break;
          }
          case "BUTTONS":
            for (const btn of comp.buttons || []) {
              if (btn.type === "QUICK_REPLY") {
                buttons.push({ type: "QUICK_REPLY", text: btn.text || "" });
              } else if (btn.type === "URL") {
                buttons.push({ type: "URL", text: btn.text || "", url: btn.url || "", urlExample: "" });
              } else if (btn.type === "PHONE_NUMBER") {
                buttons.push({ type: "PHONE_NUMBER", text: btn.text || "", phoneNumber: btn.phone_number || "" });
              } else if (btn.type === "COPY_CODE") {
                buttons.push({ type: "COPY_CODE", text: btn.text || "" });
              }
            }
            break;
          default:
            break;
        }
      }

      const existingTemplate = existingById.get(String(mt.id)) || existingByName.get(mt.name);
      if (existingTemplate) {
        // Update headerMediaUrl and components on already-imported template
        const updateFields = {
          metaTemplateId: String(mt.id),
        };
        if (headerMediaUrl) {
          updateFields.headerMediaUrl = headerMediaUrl;
          updateFields.mediaUrl = headerMediaUrl;
        }
        if (headerHandle) updateFields.headerHandle = headerHandle;
        if (headerType && headerType !== "NONE") updateFields.headerType = headerType;
        if (headerText) updateFields.headerText = headerText;
        if (buttons.length > 0) updateFields.buttons = buttons;
        if (mt.status) {
          updateFields.metaStatus = mt.status;
          updateFields.status = mt.status === "APPROVED" ? "active" : "draft";
        }

        await Template.updateOne(
          { _id: existingTemplate._id },
          { $set: updateFields },
        );

        skipped.push(mt.id);
        continue;
      }

      // description is required by the schema — fall back to template name
      // if Meta sent us an empty body (e.g. auth templates with no body text).
      if (!description) description = mt.name || "(no body)";

      const metaStatus = mt.status || "PENDING";
      const newTemplate = await Template.create({
        companyId: req.companyId,
        name: mt.name,
        subject: "",
        // Use MARKETING as local category fallback — close enough for
        // display; the metaCategory field carries the authoritative value.
        category: "Marketing",
        description,
        status: metaStatus === "APPROVED" ? "active" : "pending",
        metaTemplateName: mt.name,
        metaCategory: mt.category || "",
        language: mt.language || "en_US",
        metaTemplateId: String(mt.id),
        metaStatus,
        rejectionReason:
          mt.rejected_reason && mt.rejected_reason !== "NONE"
            ? mt.rejected_reason
            : "",
        headerType,
        headerText,
        headerMediaUrl,
        mediaUrl: headerMediaUrl,
        headerHandle,
        buttons,
      });

      imported.push({ id: newTemplate._id, name: mt.name, metaStatus });
    }

    const io = getIO();
    if (imported.length > 0) {
      io.to("templates").emit("templates_imported", { count: imported.length });
    }

    res.status(200).json({
      success: true,
      message:
        imported.length > 0
          ? `Imported ${imported.length} template(s) from Meta`
          : "All Meta templates are synced and updated",
      imported,
      skipped: skipped.length,
    });
  } catch (error) {
    console.error("Meta Template Import Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to import templates from Meta",
    });
  }
};

// SYNC TEMPLATE STATUSES FROM META
// Safety net for missed webhooks (e.g. a rotated tunnel URL) — polls Meta
// directly and reconciles any local template whose status has drifted.
const syncTemplatesFromMeta = async (req, res) => {
  try {
    const credentials = await getCompanyWhatsAppCredentials(req.companyId);
    if (!credentials) {
      return res.status(400).json({
        success: false,
        message: "Connect a WhatsApp Business Account before syncing templates",
      });
    }

    const [metaTemplates, localTemplates] = await Promise.all([
      fetchMetaTemplates(credentials),
      Template.find({ companyId: req.companyId }),
    ]);

    const metaById = new Map(metaTemplates.map((t) => [String(t.id), t]));
    const metaByName = new Map(metaTemplates.map((t) => [t.name, t]));
    const io = getIO();
    const updated = [];

    for (const template of localTemplates) {
      const metaTemplate =
        (template.metaTemplateId && metaById.get(String(template.metaTemplateId))) ||
        metaByName.get(template.name) ||
        (template.metaTemplateName && metaByName.get(template.metaTemplateName));

      if (!metaTemplate) continue;

      if (!template.metaTemplateId && metaTemplate.id) {
        template.metaTemplateId = String(metaTemplate.id);
      }

      const changed = applyMetaTemplateStatus(
        template,
        metaTemplate.status,
        metaTemplate.rejected_reason,
      );

      // Reconcile header media and handle from Meta's components
      let mediaChanged = false;
      for (const comp of metaTemplate.components || []) {
        if (comp.type === "HEADER") {
          const rawUrl = comp.example?.header_url;
          const exampleUrl = Array.isArray(rawUrl) ? rawUrl[0] : (typeof rawUrl === "string" ? rawUrl : "");

          const rawHandle = comp.example?.header_handle;
          const exampleHandle = Array.isArray(rawHandle) ? rawHandle[0] : (typeof rawHandle === "string" ? rawHandle : "");

          let incomingUrl = exampleUrl || "";
          if (exampleHandle) {
            template.headerHandle = exampleHandle;
            if (/^https?:\/\//i.test(exampleHandle)) {
              incomingUrl = exampleHandle;
            }
          }
          if (incomingUrl && incomingUrl !== template.headerMediaUrl) {
            template.headerMediaUrl = incomingUrl;
            template.mediaUrl = incomingUrl;
            mediaChanged = true;
          }
          if (comp.format && template.headerType !== comp.format) {
            template.headerType = comp.format;
            mediaChanged = true;
          }
        }
      }

      if (changed || mediaChanged) {
        await template.save();
        io.to("templates").emit("template_status_updated", template);
        updated.push({
          id: template._id,
          name: template.name,
          metaStatus: template.metaStatus,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Synced ${updated.length} template(s) from Meta`,
      updated,
    });
  } catch (error) {
    console.error("Meta Template Sync Error:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "Failed to sync templates from Meta",
    });
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  updateTemplateStatus,
  submitTemplateForApproval,
  syncTemplatesFromMeta,
  importTemplatesFromMeta,
};
