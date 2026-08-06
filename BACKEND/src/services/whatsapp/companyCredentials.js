const crypto = require("crypto");
const Company = require("../../models/company");

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
    throw new Error("CREDENTIALS_ENCRYPTION_KEY is not set — cannot encrypt/decrypt company credentials");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptToken(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":");
}

function decryptToken(encrypted) {
  const [ivHex, authTagHex, ciphertextHex] = encrypted.split(":");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

// The single place every Meta-calling service should get a company's
// WhatsApp credentials from — never read Company.whatsapp directly.
async function getCompanyWhatsAppCredentials(companyId) {
  const company = await Company.findById(companyId).select("whatsapp");
  if (!company || !company.whatsapp?.connected) {
    return null;
  }
  return {
    accessToken: decryptToken(company.whatsapp.accessToken),
    phoneNumberId: company.whatsapp.phoneNumberId,
    wabaId: company.whatsapp.wabaId,
    apiVersion: company.whatsapp.apiVersion || process.env.META_API_VERSION || "v23.0",
  };
}

// Used by the manual "Connect WhatsApp" endpoint (and, later, the Embedded
// Signup callback) — the only write path for these fields.
async function setCompanyWhatsAppCredentials(companyId, { accessToken, phoneNumberId, wabaId, apiVersion, tokenType }) {
  await Company.updateOne(
    { _id: companyId },
    {
      $set: {
        "whatsapp.connected": true,
        "whatsapp.accessToken": encryptToken(accessToken),
        "whatsapp.phoneNumberId": phoneNumberId,
        "whatsapp.wabaId": wabaId,
        "whatsapp.apiVersion": apiVersion || "",
        "whatsapp.tokenType": tokenType,
        "whatsapp.connectedAt": new Date(),
      },
    },
  );
}

module.exports = {
  encryptToken,
  decryptToken,
  getCompanyWhatsAppCredentials,
  setCompanyWhatsAppCredentials,
};
