const Campaign = require("../models/campaign");
const Template = require("../models/template");
const { getIO } = require("../sockets/socket");
const Message = require("../models/message");
const { executeCampaign, resolvePlaceholder } = require("../services/campaign/campaignSenderService");
const { estimateCostSummary } = require("../services/campaign/costEstimationService");
const { getEffectiveRates } = require("./metaPricingController");
const prepareMessage = require("../services/campaign/prepareMessage");
const { sendTextMessage, sendImageMessage } = require("../services/whatsapp/whatsappService");
const { sendTemplateMessage } = require("../services/whatsapp/templateService");
const { getCompanyWhatsAppCredentials } = require("../services/whatsapp/companyCredentials");

// Fixed, obviously-fake stand-in for "{{contact_name}}" in a test send — a
// real contact's name is never used here, so a tester can never mistake this
// for an actual customer.
const TEST_CONTACT_NAME = "Test Contact";

const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ companyId: req.companyId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch campaigns",
    });
  }
};

const getSingleCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOne({ _id: id, companyId: req.companyId });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    res.status(200).json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch campaign",
    });
  }
};

const recalculateCampaignStats = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);

  if (!campaign) return null;

  const sentCount = campaign.contacts.filter(
    (c) =>
      c.status === "sent" || c.status === "delivered" || c.status === "read",
  ).length;

  const failedCount = campaign.contacts.filter(
    (c) => c.status === "failed",
  ).length;

  // Cumulative, same convention as sentCount above — "read" counts toward
  // "delivered" too, since `status` is a single latest-known value, not a
  // set of independent per-stage flags.
  const deliveredCount = campaign.contacts.filter(
    (c) => c.status === "delivered" || c.status === "read",
  ).length;

  const readCount = campaign.contacts.filter(
    (c) => c.status === "read",
  ).length;

  campaign.sentCount = sentCount;
  campaign.failedCount = failedCount;
  campaign.deliveredCount = deliveredCount;
  campaign.readCount = readCount;

  const processedCount = sentCount + failedCount;

  campaign.status =
    processedCount >= campaign.totalContacts ? "completed" : "processing";

  campaign.deliveryTimeline.push({
    time: new Date(),
    sent: sentCount,
    failed: failedCount,
    pending: Math.max(campaign.totalContacts - processedCount, 0),
  });

  await campaign.save();

  return campaign;
};

const updateCampaignStatus = async (req, res) => {
  try {
    const { campaignId, phone, status } = req.body;

    const campaign = await Campaign.findOne({ _id: campaignId, companyId: req.companyId });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    const contact = campaign.contacts.find((item) => item.phone === phone);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    // update contact status
    // Atomic update

    const updateResult = await Campaign.updateOne(
      {
        _id: campaignId,
        "contacts.phone": phone,
      },
      {
        $set: {
          "contacts.$.status": status,
        },
      },
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(200).json({
        success: true,
        message: "Already updated",
      });
    }

    const updatedCampaign = await Campaign.findById(campaignId);

    const sentCount = updatedCampaign.contacts.filter(
      (c) =>
        c.status === "sent" || c.status === "delivered" || c.status === "read",
    ).length;

    const failedCount = updatedCampaign.contacts.filter(
      (c) => c.status === "failed",
    ).length;

    updatedCampaign.sentCount = sentCount;
    updatedCampaign.failedCount = failedCount;

    await updatedCampaign.save();

    const processedCount = sentCount + failedCount;

    const campaignStatus =
      processedCount >= updatedCampaign.totalContacts
        ? "completed"
        : "processing";

    await Campaign.findByIdAndUpdate(campaignId, {
      $set: {
        status: campaignStatus,
      },

      $push: {
        deliveryTimeline: {
          time: new Date(),
          sent: updatedCampaign.sentCount,
          failed: updatedCampaign.failedCount,
          pending: Math.max(
            updatedCampaign.totalContacts -
              (updatedCampaign.sentCount + updatedCampaign.failedCount),
            0,
          ),
        },
      },
    });

    const io = getIO();

    if (io) {
      const latestCampaign = await Campaign.findById(campaignId);

      io.to("campaigns").emit("campaign_updated", latestCampaign);
    }

    res.status(200).json({
      success: true,
      message: "Campaign updated",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to update campaign",
    });
  }
};

const retryFailedCampaignMessages = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOne({ _id: id, companyId: req.companyId });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    const { phone } = req.body || {};

    const failedContacts = campaign.contacts.filter(
      (contact) =>
        contact.status === "failed" && (!phone || contact.phone === phone),
    );

    if (!failedContacts.length) {
      return res.status(400).json({
        success: false,
        message: "No failed contacts to retry",
      });
    }

    // reset failed contacts to pending — also clear failedAt so a retried
    // contact that later succeeds doesn't show a stale Failed-At timestamp
    // next to a non-failed status.
    campaign.contacts = campaign.contacts.map((contact) =>
      contact.status === "failed" && (!phone || contact.phone === phone)
        ? {
            ...contact.toObject(),
            status: "pending",
            failedAt: null,
          }
        : contact,
    );

    campaign.failedCount = 0;
    campaign.status = "processing";

    await campaign.save();

    const io = getIO();

    if (io) {
      io.to("campaigns").emit("campaign_updated", campaign);
    }

    res.status(200).json({
      success: true,
      message: "Retry triggered successfully",
    });

    // Send after responding — delivery status arrives asynchronously via
    // webhook and updates the campaign through the normal status pipeline.
    executeCampaign({
      companyId: campaign.companyId,
      campaignId: campaign._id,
      campaignName: campaign.campaignName,
      contacts: failedContacts.map((c) => ({
        phone: c.phone,
        name: c.name,
      })),
      message: campaign.message,
      mediaUrl: campaign.mediaUrl,
      mediaType: campaign.mediaType,
      campaignType: campaign.campaignType,
      isScheduled: false,
      templateId: campaign.templateId,
      templateVariables: campaign.templateVariables,
      buttonVariables: campaign.buttonVariables,
    }).catch((error) => {
      console.error("Retry campaign send error:", error.response?.data || error.message);
    });
  } catch (error) {
    console.log(error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "Retry failed",
    });
  }
};

const getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ companyId: req.companyId })
      .populate("templateId", "metaCategory")
      .sort({
        createdAt: -1,
      });

    res.json(campaigns);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Failed to fetch campaigns",
    });
  }
};

const getCampaignReplyAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const replies = await Message.find({
      companyId: req.companyId,
      sender: "user",
      replyAttributedCampaign: id,
    })
      .sort({
        createdAt: 1,
      })
      .populate({
        path: "conversation",
        populate: {
          path: "contact",
        },
      });

    const uniqueContacts = new Map();

    replies.forEach((reply) => {
      const contact = reply.conversation?.contact;

      if (!contact) return;

      if (!uniqueContacts.has(contact.phone)) {
        uniqueContacts.set(contact.phone, {
          name: contact.name,
          phone: contact.phone,

          replyCount: 0,

          firstReply: reply.content,
          firstReplyAt: reply.createdAt,

          latestReply: reply.content,
          latestReplyAt: reply.createdAt,
        });
      }

      const analytics = uniqueContacts.get(contact.phone);

      analytics.replyCount++;

      if (new Date(reply.createdAt) > new Date(analytics.latestReplyAt)) {
        analytics.latestReply = reply.content;
        analytics.latestReplyAt = reply.createdAt;
      }
    });

    res.json({
      success: true,

      repliedContactsCount: uniqueContacts.size,

      totalReplies: replies.length,

      repliedContacts: [...uniqueContacts.values()],
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch reply analytics",
    });
  }
};

// Wraps a cell in quotes and escapes embedded quotes only when the value
// actually needs it (contains a comma/quote/newline) — keeps the common case
// readable while staying safe for names with commas in them.
const escapeCsvCell = (value) => {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const downloadCampaignReport = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOne({ _id: id, companyId: req.companyId });

    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    const rows = [
      "Name,Phone,Status",
      ...campaign.contacts.map((c) =>
        [c.name, c.phone, c.status].map(escapeCsvCell).join(","),
      ),
    ];

    const safeName = (campaign.campaignName || "campaign").replace(/[^a-z0-9-_]+/gi, "_");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}-report.csv"`);
    res.send(rows.join("\n"));
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to generate campaign report",
    });
  }
};

const getCostSummary = async (req, res) => {
  try {
    const [campaigns, effective] = await Promise.all([
      Campaign.find({ companyId: req.companyId }).populate("templateId", "metaCategory"),
      getEffectiveRates(req.companyId),
    ]);

    const summary = estimateCostSummary(campaigns, effective.rates);

    res.status(200).json({
      success: true,
      currency: effective.currency,
      ...summary,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to compute cost summary",
    });
  }
};

// Sends a single real WhatsApp message to one number, using the exact
// message/template/variables a campaign is about to broadcast — so a typo or
// broken variable can be caught before it goes out to real customers.
// Deliberately never touches the Campaign model (no Campaign.create, no
// counters) and never creates/updates a Contact or Conversation — a test
// send must not leak into the Inbox, the Contacts address book, or any
// campaign's stats.
const sendCampaignTestMessage = async (req, res) => {
  try {
    const {
      phone,
      useMetaTemplate,
      templateId,
      templateVariables,
      buttonVariables,
      message,
      mediaUrl,
    } = req.body;

    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    const credentials = await getCompanyWhatsAppCredentials(req.companyId);
    if (!credentials) {
      return res.status(400).json({
        success: false,
        message: "Connect a WhatsApp Business Account before sending a test message",
      });
    }

    let whatsappMessageId;

    if (useMetaTemplate) {
      if (!templateId) {
        return res.status(400).json({ success: false, message: "templateId is required" });
      }

      const template = await Template.findOne({ _id: templateId, companyId: req.companyId });

      if (!template) {
        return res.status(404).json({ success: false, message: "Template not found" });
      }

      if (template.metaStatus !== "APPROVED") {
        return res.status(400).json({
          success: false,
          message: "This template hasn't been approved by Meta yet — you can only test-send approved templates.",
        });
      }

      const variableValues = (templateVariables || []).map((v) => resolvePlaceholder(v, TEST_CONTACT_NAME));
      const buttonValues = (buttonVariables || []).map((v) => resolvePlaceholder(v, TEST_CONTACT_NAME));

      const metaResponse = await sendTemplateMessage(credentials, phone, template, variableValues, buttonValues);
      whatsappMessageId = metaResponse.messages?.[0]?.id;
    } else {
      if (!message || !message.trim()) {
        return res.status(400).json({ success: false, message: "Message is required" });
      }

      const resolvedMessage = prepareMessage(message, { name: TEST_CONTACT_NAME });
      const metaResponse = mediaUrl
        ? await sendImageMessage(credentials, phone, mediaUrl, resolvedMessage)
        : await sendTextMessage(credentials, phone, resolvedMessage);
      whatsappMessageId = metaResponse.messages?.[0]?.id;
    }

    res.status(200).json({ success: true, whatsappMessageId });
  } catch (error) {
    console.error("Test Send Error:", error.response?.data || error.message);

    res.status(502).json({
      success: false,
      message:
        error.response?.data?.error?.error_user_msg ||
        error.response?.data?.error?.message ||
        error.message ||
        "Test send failed",
    });
  }
};

module.exports = {
  getCampaigns,
  getSingleCampaign,
  getAllCampaigns,
  updateCampaignStatus,
  downloadCampaignReport,
  getCostSummary,
  sendCampaignTestMessage,
  retryFailedCampaignMessages,
  recalculateCampaignStats,
  getCampaignReplyAnalytics,
};
