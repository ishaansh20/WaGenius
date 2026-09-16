const Company = require("../models/company");
const Subscription = require("../models/subscription");
const { resolveSetupStatus, SETUP_STATUS } = require("../utils/setupStatus");
const {
  setCompanyWhatsAppCredentials,
  getCompanyWhatsAppCredentials,
  updateCompanyMessagingHealth,
} = require("../services/whatsapp/companyCredentials");
const {
  checkWabaHealthStatus,
} = require("../services/whatsapp/embeddedSignupService");

function hasEnvWhatsAppCredentials() {
  return !!(
    process.env.META_ACCESS_TOKEN &&
    process.env.META_PHONE_NUMBER_ID &&
    process.env.META_WABA_ID
  );
}

// Never returns the access token itself — only enough to show connection
// status on the Settings page.
const getWhatsAppStatus = async (req, res) => {
  try {
    const [company, subscription] = await Promise.all([
      Company.findById(req.companyId).select("whatsapp name setupStatus"),
      Subscription.findOne({ companyId: req.companyId }),
    ]);

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    const setupStatus = resolveSetupStatus(company, subscription);
    if (company.setupStatus !== setupStatus) {
      company.setupStatus = setupStatus;
      await company.save();
    }

    const isConnected = company.whatsapp?.connected === true;
    const whatsappData = {
      connected: isConnected,
      phoneNumberId: company.whatsapp?.phoneNumberId || "",
      wabaId: company.whatsapp?.wabaId || "",
      tokenType: company.whatsapp?.tokenType || "",
      connectedAt: company.whatsapp?.connectedAt || null,
      onboardingCompleted: Boolean(
        company.whatsapp?.onboardingCompletedAt || isConnected,
      ),
      onboardingCompletedAt: company.whatsapp?.onboardingCompletedAt || null,
      businessId: company.whatsapp?.businessId || "",
      businessName: company.whatsapp?.businessName || "",
      messagingBlocked: Boolean(company.whatsapp?.messagingBlocked),
      messagingStatus: company.whatsapp?.messagingStatus || "",
      messagingBlockedReason: company.whatsapp?.messagingBlockedReason || "",
      needsBusinessVerification: Boolean(company.whatsapp?.needsBusinessVerification),
      healthCheckedAt: company.whatsapp?.healthCheckedAt || null,
    };

    res.status(200).json({
      success: true,
      setupStatus,
      ...whatsappData,
      whatsapp: whatsappData,
    });
  } catch (error) {
    console.error("[WhatsApp] Failed to fetch connection status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch WhatsApp connection status",
    });
  }
};

const getCompanySetupStatus = async (req, res) => {
  try {
    const [company, subscription] = await Promise.all([
      Company.findById(req.companyId).select("name setupStatus whatsapp"),
      Subscription.findOne({ companyId: req.companyId }),
    ]);

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    const setupStatus = resolveSetupStatus(company, subscription);

    if (company.setupStatus !== setupStatus) {
      company.setupStatus = setupStatus;
      await company.save();
    }

    return res.status(200).json({
      success: true,
      setupStatus,
      hasPlan: Boolean(subscription?.planId),
      hasWhatsApp: company?.whatsapp?.connected === true,
      paymentMethodSetup: Boolean(company?.whatsapp?.paymentMethodSetup),
      messagingBlocked: Boolean(company?.whatsapp?.messagingBlocked),
    });
  } catch (error) {
    console.error("[Company] Failed to fetch setup status:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch setup status" });
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

    res
      .status(200)
      .json({ success: true, message: "WhatsApp Business Account connected" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to connect WhatsApp Business Account",
      });
  }
};

const disconnectWhatsApp = async (req, res) => {
  try {
    const result = await Company.updateOne(
      { _id: req.companyId },
      {
        $set: {
          setupStatus: SETUP_STATUS.WHATSAPP_ONBOARDING_REQUIRED,
          "whatsapp.connected": false,
          "whatsapp.accessToken": "",
          "whatsapp.pin": "",
          "whatsapp.phoneNumberId": "",
          "whatsapp.wabaId": "",
          "whatsapp.apiVersion": "",
          "whatsapp.tokenType": "",
          "whatsapp.connectedAt": null,
          "whatsapp.onboardingCompletedAt": null,
          "whatsapp.messagingBlocked": false,
          "whatsapp.messagingStatus": "",
          "whatsapp.messagingBlockedReason": "",
          "whatsapp.healthCheckedAt": null,
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    console.log(
      `[WhatsApp] Disconnected credentials for company ${req.companyId}`,
    );

    return res.status(200).json({
      success: true,
      message: "WhatsApp Business Account disconnected",
    });
  } catch (error) {
    console.error(
      "[WhatsApp] Failed to disconnect WhatsApp:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to disconnect WhatsApp Business Account",
    });
  }
};

const healthCheckWhatsApp = async (req, res) => {
  try {
    const credentials = await getCompanyWhatsAppCredentials(req.companyId);

    if (!credentials?.accessToken || !credentials?.wabaId) {
      return res.status(400).json({
        success: false,
        message: "WhatsApp is not connected for this company yet.",
      });
    }

    const health = await checkWabaHealthStatus(
      credentials.accessToken,
      credentials.wabaId,
    );

    const setupStatus = await updateCompanyMessagingHealth(req.companyId, health);

    return res.status(200).json({
      success: true,
      canSendMessage: health.canSendMessage,
      isBlocked: health.isBlocked,
      hasPaymentIssue: health.hasPaymentIssue,
      hasPaymentMethod: !health.hasPaymentIssue,
      needsBusinessVerification: health.needsBusinessVerification,
      businessId: health.businessId,
      businessName: health.businessName,
      reason: health.reason,
      setupStatus,
    });
  } catch (error) {
    console.error(
      "[WhatsApp] Health check failed:",
      error.response?.data
        ? JSON.stringify(error.response.data, null, 2)
        : error.message,
    );
    return res.status(500).json({
      success: false,
      message: "Could not check WhatsApp messaging health right now.",
    });
  }
};

module.exports = {
  getWhatsAppStatus,
  getCompanySetupStatus,
  connectWhatsApp,
  disconnectWhatsApp,
  healthCheckWhatsApp,
};
