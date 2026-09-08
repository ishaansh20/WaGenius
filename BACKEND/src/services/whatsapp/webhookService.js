const { handleIncomingMessage } = require("./incomingMessageHandler");
const { updateMessageStatus } = require("../../controllers/messageController");
const { createMockResponse } = require("../../utils/mockExpress");
const Template = require("../../models/template");
const { getIO } = require("../../sockets/socket");

// PAUSED/DISABLED arrive through the same message_template_status_update
// webhook field and `event` key as APPROVED/REJECTED/PENDING — Meta pauses
// a template after repeated quality issues and disables it after repeated
// pauses, so these need to flow through the same pipeline rather than
// leaving a template looking permanently "APPROVED" once it stops being
// usable.
const TRACKED_TEMPLATE_STATUSES = [
  "APPROVED",
  "REJECTED",
  "PENDING",
  "PAUSED",
  "DISABLED",
];

const processIncomingMessage = async (companyId, message, metadata) => {
  return await handleIncomingMessage(companyId, message, metadata);
};

const processStatusUpdate = async (companyId, status) => {
  let failure = null;

  if (status.status === "failed" && status.errors?.length) {
    const metaError = status.errors[0];

    console.error(
      `❌ Meta reported delivery failure for message ${status.id} to ${status.recipient_id}:`,
      JSON.stringify(status.errors, null, 2),
    );

    failure = {
      code: metaError.code ? String(metaError.code) : null,
      title: metaError.title || null,
      message: metaError.message || null,
      details: metaError.error_data?.details || metaError.details || null,
    };
  }

  const req = {
    companyId,
    body: {
      phone: status.recipient_id,
      status: status.status,
      whatsappMessageId: status.id,
      failure,
    },
  };

  const res = createMockResponse();

  await updateMessageStatus(req, res);
};

// Applies a Meta template status (from either a live webhook event or a
// Graph API reconciliation poll) to a local template doc. Returns true if
// the doc changed.
const applyMetaTemplateStatus = (template, metaStatus, reason = "") => {
  if (!TRACKED_TEMPLATE_STATUSES.includes(metaStatus)) {
    return false;
  }

  // Meta reports "NONE" (not an empty string) when there's nothing to show
  // — normalize that away so it never gets stored/displayed as a reason.
  const normalizedReason = reason && reason !== "NONE" ? reason : "";

  const changed =
    template.metaStatus !== metaStatus ||
    template.rejectionReason !== normalizedReason;

  template.metaStatus = metaStatus;
  template.rejectionReason = normalizedReason;
  template.status = metaStatus === "APPROVED" ? "active" : template.status;

  return changed;
};

const processTemplateStatusUpdate = async (companyId, value) => {
  const template = await Template.findOne({
    companyId,
    metaTemplateId: String(value.message_template_id),
  });

  // No local template matches this Meta template ID — nothing to update.
  if (!template) return;

  if (!applyMetaTemplateStatus(template, value.event, value.reason)) {
    return;
  }

  await template.save();

  const io = getIO();
  io.to("templates").emit("template_status_updated", template);
};

module.exports = {
  processIncomingMessage,
  processStatusUpdate,
  processTemplateStatusUpdate,
  applyMetaTemplateStatus,
};
