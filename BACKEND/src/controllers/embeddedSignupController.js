const Company = require("../models/company");
const {
  processEmbeddedSignup,
} = require("../services/whatsapp/embeddedSignupService");

/**
 * Controller to handle Meta WhatsApp Embedded Signup completion.
 * Ensures the company is strictly resolved from authentication context (req.companyId).
 */
const completeEmbeddedSignup = async (req, res) => {
  try {
    const companyId = req.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "No active company context found for this request",
      });
    }

    const { code, wabaId, phoneNumberId, pin } = req.body || {};

    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Embedded Signup authorization code is missing",
      });
    }

    // Check existing company state to ensure idempotency / handle duplicate connection safely
    const existingCompany = await Company.findById(companyId).select(
      "whatsapp name",
    );

    if (!existingCompany) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // If company is already connected with valid credentials and same token type,
    // we safely log and process the update or refresh connection
    if (existingCompany.whatsapp?.connected) {
      console.log(
        `[EmbeddedSignup] Company ${companyId} (${existingCompany.name}) already has a connected WhatsApp account; refreshing credentials via Embedded Signup...`,
      );
    }

    const result = await processEmbeddedSignup(companyId, {
      code: code.trim(),
      wabaId: wabaId ? String(wabaId).trim() : undefined,
      phoneNumberId: phoneNumberId ? String(phoneNumberId).trim() : undefined,
      pin: pin ? String(pin).trim() : undefined,
    });

    return res.status(200).json({
      success: true,
      message: "WhatsApp Business Account connected successfully via Embedded Signup",
      setupStatus: result.setupStatus,
      phoneStatus: result.phoneStatus,
      paymentMethodSetup: result.paymentMethodSetup,
      messagingBlocked: result.messagingBlocked,
      messagingBlockedReason: result.messagingBlockedReason,
      whatsapp: {
        connected: true,
        tokenType: "embedded_signup",
        wabaId: result.wabaId,
        phoneNumberId: result.phoneNumberId,
        connectedAt: result.connectedAt,
        onboardingCompleted: true,
        setupStatus: result.setupStatus,
        paymentMethodSetup: result.paymentMethodSetup,
        messagingBlocked: result.messagingBlocked,
        messagingBlockedReason: result.messagingBlockedReason,
      },
    });
  } catch (error) {
    console.error("[EmbeddedSignup] Error completing embedded signup:", error);

    const statusCode = error.status || (error.code ? 400 : 500);
    const userMessage =
      error.message && !error.message.includes("secret")
        ? error.message
        : "Failed to complete Meta Embedded Signup. Please try again or connect manually.";

    return res.status(statusCode).json({
      success: false,
      message: userMessage,
    });
  }
};

module.exports = {
  completeEmbeddedSignup,
};
