const axios = require("axios");
const { withRetry } = require("../../utils/withRetry");

// Meta fetches image links directly from the internet, so a bare local path
// (what multer stores on the Template/Campaign docs) has to be turned into a
// publicly reachable URL first — same tunnel requirement the webhook already
// has (see templateController's Meta sync comment). Set PUBLIC_BASE_URL to
// that tunnel's origin in .env; without it this falls back to localhost,
// which Meta cannot reach.
const resolvePublicMediaUrl = (mediaPath) => {
  if (/^https?:\/\//i.test(mediaPath)) return mediaPath;

  const base =
    process.env.PUBLIC_BASE_URL ||
    `http://localhost:${process.env.PORT || 5000}`;
  const normalizedPath = mediaPath.replace(/\\/g, "/").replace(/^\/?/, "/");

  return `${base.replace(/\/$/, "")}${normalizedPath}`;
};

// Every exported call here takes the sending company's own credentials
// (from companyCredentials.js's getCompanyWhatsAppCredentials) instead of a
// single hardcoded env-var token/number — this is a multi-tenant deployment,
// each company sends from its own connected WhatsApp number.
const sendImageMessage = async (credentials, to, mediaPath, caption = "") => {
  const { accessToken, phoneNumberId, apiVersion } = credentials;
  const baseUrl = `https://graph.facebook.com/${apiVersion}`;

  try {
    const response = await withRetry(
      () =>
        axios.post(
          `${baseUrl}/${phoneNumberId}/messages`,
          {
            messaging_product: "whatsapp",
            to,
            type: "image",
            image: {
              link: resolvePublicMediaUrl(mediaPath),
              ...(caption && { caption }),
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            timeout: 15000,
          },
        ),
      { label: `sendImageMessage(${to})` },
    );

    return response.data;
  } catch (error) {
    console.error("Meta Send Error:", error.response?.data || error.message);
    throw error;
  }
};

const sendTextMessage = async (credentials, to, text) => {
  const { accessToken, phoneNumberId, apiVersion } = credentials;
  const baseUrl = `https://graph.facebook.com/${apiVersion}`;

  try {
    const response = await withRetry(
      () =>
        axios.post(
          `${baseUrl}/${phoneNumberId}/messages`,
          {
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: {
              body: text,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            timeout: 15000,
          },
        ),
      { label: `sendTextMessage(${to})` },
    );

    return response.data;
  } catch (error) {
    console.error("Meta Send Error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  sendTextMessage,
  sendImageMessage,
  resolvePublicMediaUrl,
};
