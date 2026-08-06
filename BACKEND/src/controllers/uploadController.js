const csv = require("csv-parser");
const fs = require("fs");

const Campaign = require("../models/campaign");
const Contact = require("../models/contact");
const { findOrCreateContact } = require("../services/contactService");
const {
  scheduleCampaign,
} = require("../services/campaign/campaignSchedulerService");

const uploadCampaign = async (req, res) => {
  try {
    const {
      campaignName,
      message,
      campaignType,
      scheduleAt,
      templateId,
      mediaUrl,
      mediaType,
    } = req.body;

    let templateVariables = [];
    if (req.body.templateVariables) {
      try {
        templateVariables = JSON.parse(req.body.templateVariables);
      } catch {
        templateVariables = [];
      }
    }

    let buttonVariables = [];
    if (req.body.buttonVariables) {
      try {
        buttonVariables = JSON.parse(req.body.buttonVariables);
      } catch {
        buttonVariables = [];
      }
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required",
      });
    }

    const contacts = [];

    const stream = fs.createReadStream(req.file.path);

    stream
      .pipe(csv())
      .on("data", (row) => {
        contacts.push({
          name: row.name || "Unknown",
          phone: row.phone,
        });
      })
      .on("end", async () => {
        try {
          const { companyId } = req;

          const optedOutContacts = await Contact.find({
            companyId,
            phone: { $in: contacts.map((c) => c.phone) },
            optedOut: true,
          }).select("phone");

          const optedOutPhones = new Set(optedOutContacts.map((c) => c.phone));
          const eligibleContacts = contacts.filter((c) => !optedOutPhones.has(c.phone));
          const excludedCount = contacts.length - eligibleContacts.length;

          // Makes every broadcast contribute to the address book too, using
          // the same name-merge rule as every other contact-creation path —
          // this must run after the opted-out filter above, never before, so
          // an opted-out phone can't be re-surfaced as "eligible" by it.
          await Promise.all(
            eligibleContacts.map((c) =>
              findOrCreateContact({ companyId, phone: c.phone, name: c.name, source: "campaign" }),
            ),
          );

          const campaign = await Campaign.create({
            companyId,
            campaignName,
            campaignType,
            message,
            mediaUrl: mediaUrl || "",
            mediaType: mediaType || "",
            contacts: eligibleContacts,
            totalContacts: eligibleContacts.length,
            scheduleAt: scheduleAt || null,
            status: scheduleAt ? "scheduled" : "processing",
            templateId: templateId || null,
            templateVariables,
            buttonVariables,
          });

          await scheduleCampaign({
            companyId,
            campaignId: campaign._id,
            campaignName,
            contacts: eligibleContacts,
            message,
            mediaUrl: mediaUrl || "",
            mediaType: mediaType || "",
            campaignType,
            scheduleAt,
            isScheduled: Boolean(scheduleAt),
            templateId: templateId || null,
            templateVariables,
            buttonVariables,
          });

          res.status(201).json({
            success: true,
            message: "Campaign created successfully",
            campaign,
            excludedCount,
          });
        } catch (error) {
          console.log(error);

          res.status(500).json({
            success: false,
            message: "Error processing campaign",
          });
        }
      });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  uploadCampaign,
};
