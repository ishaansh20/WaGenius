const prepareMessage = require("./prepareMessage");
const { sendTextMessage, sendImageMessage } = require("../whatsapp/whatsappService");
const { sendTemplateMessage } = require("../whatsapp/templateService");
const { getCompanyWhatsAppCredentials } = require("../whatsapp/companyCredentials");
const Template = require("../../models/template");
const Campaign = require("../../models/campaign");
const saveCampaignMessage = require("./saveCampaignMessage");
const { getIO } = require("../../sockets/socket");

// How many sends are in flight at once. WhatsApp's Cloud API has its own
// per-number rate limits, so this isn't about raw parallelism — it's about
// not being fully sequential (one contact at a time) while still staying
// well under anything Meta would throttle.
const CONCURRENCY = Number(process.env.CAMPAIGN_SEND_CONCURRENCY) || 5;

const buildTemplatePreview = (bodyText, variableValues) =>
  variableValues.reduce(
    (text, value, i) => text.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, "g"), value),
    bodyText,
  );

// Send-time events only — delivered/read/failed-after-webhook are stamped
// separately in messageController.js's updateMessageStatus, since those only
// become known once Meta's status webhook arrives.
const SEND_STATUS_TIMESTAMP_FIELD = { sent: "sentAt", failed: "failedAt" };

// Atomically sets one contact's status and bumps the matching counter in a
// single MongoDB update — replaces the old read-full-doc/recompute/save-
// full-doc pattern, which loses updates when multiple contacts finish at
// the same time under concurrent sending.
const updateContactStatus = async (campaignId, phone, status, counterField) => {
  const timestampField = SEND_STATUS_TIMESTAMP_FIELD[status];
  const setFields = { "contacts.$.status": status };
  if (timestampField) {
    setFields[`contacts.$.${timestampField}`] = new Date();
  }

  await Campaign.updateOne(
    { _id: campaignId, "contacts.phone": phone },
    {
      $set: setFields,
      $inc: { [counterField]: 1 },
    },
  );

  const campaign = await Campaign.findById(campaignId);
  if (campaign) {
    getIO().to("campaigns").emit("campaign_updated", campaign);
  }
};

const markContactSent = (campaignId, phone) =>
  updateContactStatus(campaignId, phone, "sent", "sentCount");

const markContactFailed = (campaignId, phone) =>
  updateContactStatus(campaignId, phone, "failed", "failedCount");

// Runs `handler` over `items` with at most `concurrency` in flight — as
// soon as one finishes, the next queued item starts immediately (unlike
// fixed lockstep batches, which wait for the slowest item in a batch
// before starting the next one).
async function runWithConcurrency(items, concurrency, handler) {
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const current = cursor++;
      await handler(items[current]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
}

// Swaps the "{{contact_name}}" sentinel a campaign form can set for a
// variable/button value with the actual per-contact name at send time —
// shared here so a test-send (campaignController.js) resolves the exact
// same sentinel the same way a real send would, using a name of its choosing
// (real sends pass the real contact's name; a test-send passes a fixed
// placeholder like "Test Contact").
const resolvePlaceholder = (value, name) => (value === "{{contact_name}}" ? name || "Customer" : value);

// Sends to a single contact and records the outcome. Never throws — a
// failure here is recorded as that contact's status, not surfaced to the
// caller, so one bad send can't stop the rest of the concurrent workers.
const sendToContact = async (credentials, campaign, template, contact) => {
  try {
    let messageToSave;
    let metaResponse;

    if (template) {
      const variableValues = (campaign.templateVariables || []).map((value) =>
        resolvePlaceholder(value, contact.name),
      );
      const buttonValues = (campaign.buttonVariables || []).map((value) =>
        resolvePlaceholder(value, contact.name),
      );

      metaResponse = await sendTemplateMessage(credentials, contact.phone, template, variableValues, buttonValues);
      messageToSave = buildTemplatePreview(template.description, variableValues);
    } else {
      messageToSave = prepareMessage(campaign.message, contact);
      metaResponse = campaign.mediaUrl
        ? await sendImageMessage(credentials, contact.phone, campaign.mediaUrl, messageToSave)
        : await sendTextMessage(credentials, contact.phone, messageToSave);
    }

    const whatsappMessageId = metaResponse.messages?.[0]?.id;

    await saveCampaignMessage({
      companyId: campaign.companyId,
      phone: contact.phone,
      name: contact.name,
      message: messageToSave,
      campaignId: campaign.campaignId,
      whatsappMessageId,
      mediaUrl: template ? "" : campaign.mediaUrl,
      mediaType: template ? "" : campaign.mediaType,
    });

    await markContactSent(campaign.campaignId, contact.phone);
  } catch (error) {
    const status = error.response?.status;
    console.error(
      `❌ Failed to send campaign message to ${contact.phone} (status: ${status || "network error"}):`,
      error.response?.data || error.message,
    );

    await markContactFailed(campaign.campaignId, contact.phone);
  }
};

const executeCampaign = async (campaign) => {
  console.log(
    `Executing campaign "${campaign.campaignName}" (${campaign.campaignId}): ` +
      `${campaign.contacts.length} contact(s), concurrency ${CONCURRENCY}`,
  );

  const credentials = await getCompanyWhatsAppCredentials(campaign.companyId);
  if (!credentials) {
    console.error(
      `Campaign ${campaign.campaignId} belongs to a company with no connected WhatsApp account — aborting send.`,
    );
    await Campaign.updateOne({ _id: campaign.campaignId }, { $set: { status: "failed" } });
    return;
  }

  let template = null;
  if (campaign.templateId) {
    template = await Template.findOne({ _id: campaign.templateId, companyId: campaign.companyId });

    if (!template || template.metaStatus !== "APPROVED") {
      console.error(
        "Campaign references a template that is not APPROVED — aborting send:",
        campaign.templateId,
      );
      return;
    }
  }

  await runWithConcurrency(campaign.contacts, CONCURRENCY, (contact) =>
    sendToContact(credentials, campaign, template, contact),
  );

  // Every contact now has a terminal status (sent or failed) from the
  // atomic updates above — safe to close the campaign out here instead of
  // waiting on Meta's delivery-status webhook, which depends on an
  // externally reachable tunnel that isn't always up.
  //
  // "completed" should mean the send actually succeeded for at least
  // someone — if every single contact failed, that's a failed campaign,
  // not a completed one, even though processing itself finished normally.
  const sentSoFar = await Campaign.findById(campaign.campaignId).select(
    "sentCount failedCount totalContacts",
  );
  const allFailed =
    sentSoFar &&
    sentSoFar.totalContacts > 0 &&
    sentSoFar.sentCount === 0 &&
    sentSoFar.failedCount === sentSoFar.totalContacts;

  await Campaign.updateOne(
    { _id: campaign.campaignId },
    { $set: { status: allFailed ? "failed" : "completed" } },
  );

  const finalCampaign = await Campaign.findById(campaign.campaignId);
  if (finalCampaign) {
    getIO().to("campaigns").emit("campaign_updated", finalCampaign);
  }
};

module.exports = {
  executeCampaign,
  resolvePlaceholder,
};
