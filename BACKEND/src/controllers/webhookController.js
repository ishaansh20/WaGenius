const crypto = require("crypto");
const Company = require("../models/company");
const {
  processIncomingMessage,
  processStatusUpdate,
  processTemplateStatusUpdate,
} = require("../services/whatsapp/webhookService");

const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

let warnedMissingAppSecret = false;

// Verifies Meta's X-Hub-Signature-256 header — an HMAC-SHA256 of the exact
// raw request bytes, keyed by the app secret. Every tenant's webhook
// traffic now flows through this one shared endpoint, so this matters far
// more than it did single-tenant. Soft-fails (skips verification, logs
// once) when META_APP_SECRET isn't configured yet, rather than breaking
// the webhook outright — but that's a gap to close before relying on this
// in production with real external companies' data.
const isSignatureValid = (req) => {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    if (!warnedMissingAppSecret) {
      console.warn(
        "META_APP_SECRET is not set — webhook signature verification is disabled. " +
          "Set it before relying on this endpoint for real external companies' data.",
      );
      warnedMissingAppSecret = true;
    }
    return true;
  }

  const signatureHeader = req.headers["x-hub-signature-256"];
  if (!signatureHeader || !req.rawBody) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(req.rawBody).digest("hex");

  // Constant-time comparison — a plain string `===` would leak timing
  // information about how many leading bytes matched.
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
};

// Every entry in a webhook payload carries the WABA ID at entry.id, and
// (for message/status changes) the phone_number_id under
// change.value.metadata — both are the lookup key for which company this
// traffic belongs to. Checked against whichever field the company actually
// has connected (manual entry may only have one filled in, depending on
// what the user pasted).
const resolveCompanyIdForEntry = async (entry) => {
  const phoneNumberIds = (entry.changes || [])
    .map((change) => change.value?.metadata?.phone_number_id)
    .filter(Boolean);

  const company = await Company.findOne({
    $or: [
      { "whatsapp.wabaId": entry.id },
      ...(phoneNumberIds.length > 0
        ? [{ "whatsapp.phoneNumberId": { $in: phoneNumberIds } }]
        : []),
    ],
  }).select("_id");

  return company?._id || null;
};

const receiveWebhook = async (req, res) => {
  try {
    if (!isSignatureValid(req)) {
      console.error("Webhook Error: invalid signature");
      return res.sendStatus(401);
    }

    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      return res.sendStatus(404);
    }

    const entries = body.entry || [];

    for (const entry of entries) {
      const companyId = await resolveCompanyIdForEntry(entry);

      if (!companyId) {
        console.warn(`Webhook entry for WABA ${entry.id} matches no connected company — dropping.`);
        continue;
      }

      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;

        if (!value) continue;

        // Incoming Messages
        if (value.messages) {
          for (const message of value.messages) {
            await processIncomingMessage(companyId, message, value.metadata);
          }
        }

        // Status Updates
        if (value.statuses) {
          for (const status of value.statuses) {
            await processStatusUpdate(companyId, status);
          }
        }

        // Template Approval Status Updates
        if (change.field === "message_template_status_update") {
          await processTemplateStatusUpdate(companyId, value);
        }
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Error:", error);

    return res.sendStatus(500);
  }
};

module.exports = {
  verifyWebhook,
  receiveWebhook,
};
