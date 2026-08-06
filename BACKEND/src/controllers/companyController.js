const Company = require("../models/company");
const { setCompanyWhatsAppCredentials } = require("../services/whatsapp/companyCredentials");

// Never returns the access token itself — only enough to show connection
// status on the Settings page.
const getWhatsAppStatus = async (req, res) => {
  try {
    const company = await Company.findById(req.companyId).select("whatsapp name");

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    res.status(200).json({
      success: true,
      whatsapp: {
        connected: company.whatsapp.connected,
        phoneNumberId: company.whatsapp.phoneNumberId,
        wabaId: company.whatsapp.wabaId,
        tokenType: company.whatsapp.tokenType,
        connectedAt: company.whatsapp.connectedAt,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to fetch WhatsApp connection status" });
  }
};

// Manual "paste your own credentials" connection method — the one every
// company can use immediately, without waiting on Meta's Embedded Signup
// (Tech Provider) approval. Stays useful afterward too, for anyone who
// prefers pasting a long-lived token they manage themselves.
const connectWhatsApp = async (req, res) => {
  try {
    const { accessToken, phoneNumberId, wabaId, apiVersion } = req.body;

    if (!accessToken || !phoneNumberId || !wabaId) {
      return res.status(400).json({
        success: false,
        message: "accessToken, phoneNumberId, and wabaId are all required",
      });
    }

    await setCompanyWhatsAppCredentials(req.companyId, {
      accessToken: accessToken.trim(),
      phoneNumberId: phoneNumberId.trim(),
      wabaId: wabaId.trim(),
      apiVersion: (apiVersion || "v23.0").trim(),
      tokenType: "manual",
    });

    res.status(200).json({ success: true, message: "WhatsApp Business Account connected" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to connect WhatsApp Business Account" });
  }
};

const disconnectWhatsApp = async (req, res) => {
  try {
    await Company.updateOne(
      { _id: req.companyId },
      {
        $set: {
          "whatsapp.connected": false,
          "whatsapp.accessToken": "",
          "whatsapp.phoneNumberId": "",
          "whatsapp.wabaId": "",
          "whatsapp.tokenType": "",
          "whatsapp.connectedAt": null,
        },
      },
    );

    res.status(200).json({ success: true, message: "WhatsApp Business Account disconnected" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to disconnect WhatsApp Business Account" });
  }
};

module.exports = { getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp };
