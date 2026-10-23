const crypto = require("crypto");
const Company = require("../../models/company");
const Subscription = require("../../models/subscription");
const { resolveSetupStatus, SETUP_STATUS } = require("../../utils/setupStatus");
const { entriesOf, isCompanyNumber } = require("../../utils/whatsappNumberList");

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

// The single place every Meta-calling service should get a company's
// WhatsApp credentials from — never read Company.whatsapp directly.
//
// `phoneNumberId` is optional: omit it to send from the company's default
// number, or pass one of the company's own numbers to send from that one.
// A number that isn't in this company's list returns null (never falls back
// to the default — that would send from a different number than asked).
async function getCompanyWhatsAppCredentials(companyId, phoneNumberId) {
  const company = await Company.findById(companyId).select("whatsapp");

  if (company && company.whatsapp?.connected && company.whatsapp.accessToken) {
    if (phoneNumberId && !isCompanyNumber(company, phoneNumberId)) return null;

    return {
      accessToken: decryptToken(company.whatsapp.accessToken),
      phoneNumberId: phoneNumberId ? String(phoneNumberId) : company.whatsapp.phoneNumberId,
      wabaId: company.whatsapp.wabaId,
      apiVersion:
        company.whatsapp.apiVersion || process.env.META_API_VERSION || "v23.0",
      pin: company.whatsapp.pin ? decryptToken(company.whatsapp.pin) : null,
    };
  }

  // No fallback to the platform's own .env credentials: a company that
  // hasn't connected WhatsApp must not send from someone else's number.
  // Every caller handles null ("WhatsApp not connected").
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

  // Keep the number list in step with the default number: the number being
  // connected must be in it, and a number connected earlier is never lost.
  let phoneNumbers;
  if (phoneNumberId) {
    const existing = await Company.findById(companyId).select("whatsapp");
    const entries = entriesOf(existing);
    if (!entries.some((n) => n.phoneNumberId === phoneNumberId)) {
      entries.push({
        phoneNumberId,
        displayNumber: "",
        verifiedName: "",
        qualityRating: "",
        status: "",
        isPrimary: entries.length === 0,
        addedAt: new Date(),
      });
    }
    phoneNumbers = entries;
  }

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

  if (phoneNumbers) {
    updateFields["whatsapp.phoneNumbers"] = phoneNumbers;
  }

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
  {
    canSendMessage,
    isBlocked,
    reason,
    businessId,
    businessName,
    needsBusinessVerification,
  },
) {
  const updateFields = {
    "whatsapp.messagingBlocked": Boolean(isBlocked),
    "whatsapp.messagingStatus": canSendMessage || "",
    "whatsapp.messagingBlockedReason": reason || "",
    "whatsapp.needsBusinessVerification": Boolean(needsBusinessVerification),
    "whatsapp.healthCheckedAt": new Date(),
  };

  if (businessId) {
    updateFields["whatsapp.businessId"] = businessId;
  }
  if (businessName) {
    updateFields["whatsapp.businessName"] = businessName;
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
    company.whatsapp.needsBusinessVerification = Boolean(needsBusinessVerification);
    company.whatsapp.healthCheckedAt = updateFields["whatsapp.healthCheckedAt"];
    if (businessId) company.whatsapp.businessId = businessId;
    if (businessName) company.whatsapp.businessName = businessName;

    const calculatedStatus = resolveSetupStatus(company, subscription);
    updateFields["setupStatus"] = calculatedStatus;

    await Company.updateOne({ _id: companyId }, { $set: updateFields });
    return calculatedStatus;
  }

  await Company.updateOne({ _id: companyId }, { $set: updateFields });
  return isBlocked ? SETUP_STATUS.PAYMENT_REQUIRED : SETUP_STATUS.READY;
}

module.exports = {
  encryptToken,
  decryptToken,
  getCompanyWhatsAppCredentials,
  setCompanyWhatsAppCredentials,
  updateCompanyMessagingHealth,
};
