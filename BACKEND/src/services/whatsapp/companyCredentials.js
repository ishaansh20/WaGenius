const crypto = require("crypto");
const Company = require("../../models/company");
const Subscription = require("../../models/subscription");
const { resolveSetupStatus, SETUP_STATUS } = require("../../utils/setupStatus");

// A company's WhatsApp access token is stored encrypted at rest — it's a
// real production secret (equivalent to what used to live in this app's own
// .env file), now held per-tenant in the DB instead of a single shared env
// var. AES-256-GCM with a random IV per encryption; the auth tag guards
// against tampering, not just eavesdropping. The key is hashed down from
// CREDENTIALS_ENCRYPTION_KEY so any secret length works, rather than
// crashing if the env var isn't exactly 32 bytes.
const ALGORITHM = "aes-256-gcm";

function getKey() {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY is not set — cannot encrypt/decrypt company credentials",
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptToken(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    ciphertext.toString("hex"),
  ].join(":");
}

function decryptToken(encrypted) {
  const [ivHex, authTagHex, ciphertextHex] = encrypted.split(":");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

function hasEnvWhatsAppCredentials() {
  return !!(
    process.env.META_ACCESS_TOKEN &&
    process.env.META_PHONE_NUMBER_ID &&
    process.env.META_WABA_ID
  );
}

// The single place every Meta-calling service should get a company's
// WhatsApp credentials from — never read Company.whatsapp directly.
async function getCompanyWhatsAppCredentials(companyId) {
  const company = await Company.findById(companyId).select("whatsapp");

  if (company && company.whatsapp?.connected && company.whatsapp.accessToken) {
    return {
      accessToken: decryptToken(company.whatsapp.accessToken),
      phoneNumberId: company.whatsapp.phoneNumberId,
      wabaId: company.whatsapp.wabaId,
      apiVersion:
        company.whatsapp.apiVersion || process.env.META_API_VERSION || "v23.0",
      pin: company.whatsapp.pin ? decryptToken(company.whatsapp.pin) : null,
    };
  }

  if (hasEnvWhatsAppCredentials()) {
    return {
      accessToken: process.env.META_ACCESS_TOKEN,
      phoneNumberId: process.env.META_PHONE_NUMBER_ID,
      wabaId: process.env.META_WABA_ID,
      apiVersion: process.env.META_API_VERSION || "v23.0",
      pin: null,
    };
  }

  return null;
}

// Used by the manual "Connect WhatsApp" endpoint (and, later, the Embedded
// Signup callback) — the only write path for these fields.
async function setCompanyWhatsAppCredentials(
  companyId,
  {
    accessToken,
    phoneNumberId,
    wabaId,
    apiVersion,
    tokenType,
    onboardingCompletedAt,
    pin,
    phoneStatus,
  },
) {
  // Only "registered" (a number is actually usable on Cloud API) counts as
  // fully connected. "pending" (WABA linked, no number yet) must NOT flip
  // whatsapp.connected — that flag gates message sending, platform
  // dashboard counts, and subscription checks elsewhere in the app.
  const isFullyConnected = phoneStatus
    ? phoneStatus === "registered"
    : true; // manual "Connect WhatsApp" path always supplies a real number

  const updateFields = {
    // When fully connected, require payment verification before moving to READY
    setupStatus: isFullyConnected
      ? SETUP_STATUS.PAYMENT_REQUIRED
      : SETUP_STATUS.WHATSAPP_ONBOARDING_REQUIRED,
    "whatsapp.connected": isFullyConnected,
    "whatsapp.paymentMethodSetup": false,
    "whatsapp.accessToken": encryptToken(accessToken),
    "whatsapp.phoneNumberId": phoneNumberId || "",
    "whatsapp.wabaId": wabaId,
    "whatsapp.apiVersion": apiVersion || "",
    "whatsapp.tokenType": tokenType,
    "whatsapp.phoneStatus": phoneStatus || "",
    "whatsapp.connectedAt": new Date(),
  };

  if (pin) {
    updateFields["whatsapp.pin"] = encryptToken(String(pin));
  }

  if (onboardingCompletedAt !== undefined) {
    updateFields["whatsapp.onboardingCompletedAt"] = onboardingCompletedAt;
  } else if (tokenType === "embedded_signup") {
    updateFields["whatsapp.onboardingCompletedAt"] = new Date();
  }

  await Company.updateOne(
    { _id: companyId },
    {
      $set: updateFields,
    },
  );
}

/**
 * Updates the cached messaging health status and payment verification on a company document.
 * Call this after running checkWabaHealthStatus() from embeddedSignupService.
 */
async function updateCompanyMessagingHealth(
  companyId,
  { canSendMessage, isBlocked, reason, hasPaymentMethod, primaryFundingId },
) {
  const isPaymentSetup = hasPaymentMethod === true && !isBlocked;

  const updateFields = {
    "whatsapp.messagingBlocked": Boolean(isBlocked),
    "whatsapp.messagingStatus": canSendMessage || "",
    "whatsapp.messagingBlockedReason": reason || "",
    "whatsapp.healthCheckedAt": new Date(),
  };

  if (typeof hasPaymentMethod === "boolean") {
    updateFields["whatsapp.paymentMethodSetup"] = isPaymentSetup;
  }
  if (primaryFundingId !== undefined) {
    updateFields["whatsapp.primaryFundingId"] = primaryFundingId || "";
  }

  const [company, subscription] = await Promise.all([
    Company.findById(companyId),
    Subscription.findOne({ companyId }),
  ]);

  if (company) {
    if (!company.whatsapp) company.whatsapp = {};
    company.whatsapp.messagingBlocked = Boolean(isBlocked);
    company.whatsapp.messagingStatus = canSendMessage || "";
    company.whatsapp.messagingBlockedReason = reason || "";
    company.whatsapp.healthCheckedAt = updateFields["whatsapp.healthCheckedAt"];
    if (typeof hasPaymentMethod === "boolean") {
      company.whatsapp.paymentMethodSetup = isPaymentSetup;
    }
    if (primaryFundingId !== undefined) {
      company.whatsapp.primaryFundingId = primaryFundingId || "";
    }

    const calculatedStatus = resolveSetupStatus(company, subscription);
    updateFields["setupStatus"] = calculatedStatus;

    await Company.updateOne({ _id: companyId }, { $set: updateFields });
    return calculatedStatus;
  }

  await Company.updateOne({ _id: companyId }, { $set: updateFields });
  return isPaymentSetup ? SETUP_STATUS.READY : SETUP_STATUS.PAYMENT_REQUIRED;
}

module.exports = {
  encryptToken,
  decryptToken,
  getCompanyWhatsAppCredentials,
  setCompanyWhatsAppCredentials,
  updateCompanyMessagingHealth,
};
