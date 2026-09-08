const axios = require("axios");
const { setCompanyWhatsAppCredentials } = require("./companyCredentials");
const { withRetry } = require("../../utils/withRetry");

/**
 * Server-side service for handling Meta WhatsApp Embedded Signup.
 * Exclusively performs server-to-server operations with Meta Graph API
 * without exposing application secrets to the frontend client.
 */

const getApiVersion = () => process.env.META_API_VERSION || "v23.0";
const getAppId = () => process.env.META_APP_ID;
const getAppSecret = () => process.env.META_APP_SECRET;

/**
 * Exchanges the client-provided authorization code for a Meta access token.
 */
async function exchangeCodeForAccessToken(code) {
  const appId = getAppId();
  const appSecret = getAppSecret();
  const apiVersion = getApiVersion();

  if (!appId || !appSecret) {
    throw new Error(
      "Meta application credentials (META_APP_ID, META_APP_SECRET) are not configured on the server",
    );
  }

  const url = `https://graph.facebook.com/${apiVersion}/oauth/access_token`;

  try {
    const response = await withRetry(
      () =>
        axios.get(url, {
          params: {
            client_id: appId,
            client_secret: appSecret,
            code: code.trim(),
          },
          timeout: 15000,
        }),
      { label: "exchangeCodeForAccessToken" },
    );

    const accessToken = response.data?.access_token;
    if (!accessToken) {
      throw new Error("Meta OAuth response did not contain an access token");
    }

    return accessToken;
  } catch (error) {
    const metaError = error.response?.data?.error;
    console.error(
      "[EmbeddedSignup] Failed to exchange authorization code with Meta:",
      metaError || error.message,
    );

    if (metaError?.message) {
      const err = new Error(`Meta authorization failed: ${metaError.message}`);
      err.code = metaError.code;
      err.subcode = metaError.error_subcode;
      throw err;
    }
    throw error;
  }
}

/**
 * Inspects the token using Meta's debug_token endpoint to discover granted scopes and shared WABA ID.
 */
async function getWabaIdFromToken(accessToken, wabaIdHint) {
  const appId = getAppId();
  const appSecret = getAppSecret();
  const apiVersion = getApiVersion();

  let discoveredWabaId = null;

  try {
    const debugUrl = `https://graph.facebook.com/${apiVersion}/debug_token`;
    const response = await withRetry(
      () =>
        axios.get(debugUrl, {
          params: {
            input_token: accessToken,
            access_token: `${appId}|${appSecret}`,
          },
          timeout: 10000,
        }),
      { label: "debugToken(EmbeddedSignup)" },
    );

    const tokenData = response.data?.data;
    const granularScopes = tokenData?.granular_scopes || [];

    for (const scopeObj of granularScopes) {
      if (
        scopeObj.scope === "whatsapp_business_management" &&
        Array.isArray(scopeObj.target_ids) &&
        scopeObj.target_ids.length > 0
      ) {
        discoveredWabaId = scopeObj.target_ids[0];
        break;
      }
    }

    // If not found in whatsapp_business_management, check any target_ids in granular_scopes
    if (!discoveredWabaId) {
      for (const scopeObj of granularScopes) {
        if (
          Array.isArray(scopeObj.target_ids) &&
          scopeObj.target_ids.length > 0
        ) {
          discoveredWabaId = scopeObj.target_ids[0];
          break;
        }
      }
    }
  } catch (debugError) {
    console.warn(
      "[EmbeddedSignup] Token debug lookup non-fatal error:",
      debugError.response?.data?.error?.message || debugError.message,
    );
  }

  // Fallback to client hint if debug_token did not yield a WABA ID
  if (!discoveredWabaId && wabaIdHint) {
    console.log(
      `[EmbeddedSignup] Using WABA ID hint from signup session: ${wabaIdHint}`,
    );
    discoveredWabaId = String(wabaIdHint).trim();
  }

  return discoveredWabaId;
}

/**
 * Retrieves the Phone Number ID associated with the WABA.
 */
async function getPhoneNumberIdForWaba(
  accessToken,
  wabaId,
  phoneNumberIdHint,
) {
  const apiVersion = getApiVersion();
  let discoveredPhoneId = null;

  if (wabaId) {
    try {
      const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/phone_numbers`;
      const response = await withRetry(
        () =>
          axios.get(url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              fields: "id,display_phone_number,verified_name,status",
            },
            timeout: 10000,
          }),
        { label: "getPhoneNumberIdForWaba" },
      );

      const phoneNumbers = response.data?.data || [];

      // If user supplied a hint, try matching it
      if (phoneNumberIdHint) {
        const matched = phoneNumbers.find(
          (p) => String(p.id) === String(phoneNumberIdHint).trim(),
        );
        if (matched) {
          discoveredPhoneId = matched.id;
        }
      }

      // Otherwise default to the first available phone number
      if (!discoveredPhoneId && phoneNumbers.length > 0) {
        discoveredPhoneId = phoneNumbers[0].id;
      }
    } catch (phoneError) {
      console.warn(
        "[EmbeddedSignup] Failed to fetch phone numbers for WABA:",
        phoneError.response?.data?.error?.message || phoneError.message,
      );
    }
  }

  // Fallback to client hint if Graph API query yielded no phone numbers
  if (!discoveredPhoneId && phoneNumberIdHint) {
    console.log(
      `[EmbeddedSignup] Using Phone Number ID hint from signup session: ${phoneNumberIdHint}`,
    );
    discoveredPhoneId = String(phoneNumberIdHint).trim();
  }

  return discoveredPhoneId;
}

/**
 * Subscribes the application to the WABA's webhooks so incoming messages
 * and template updates flow into Wagenius.
 */
async function subscribeWabaWebhooks(accessToken, wabaId) {
  if (!wabaId) return;
  const apiVersion = getApiVersion();

  try {
    const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/subscribed_apps`;
    await withRetry(
      () =>
        axios.post(
          url,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            timeout: 10000,
          },
        ),
      { label: "subscribeWabaWebhooks" },
    );
    console.log(
      `[EmbeddedSignup] Successfully subscribed webhooks for WABA ${wabaId}`,
    );
  } catch (error) {
    console.warn(
      `[EmbeddedSignup] Webhook subscription non-fatal warning for WABA ${wabaId}:`,
      error.response?.data?.error?.message || error.message,
    );
  }
}

/**
 * Main entrypoint for processing an Embedded Signup authorization code.
 *
 * @param {string|mongoose.Types.ObjectId} companyId - Authenticated company ID
 * @param {Object} options
 * @param {string} options.code - Meta authorization code
 * @param {string} [options.wabaId] - Optional WABA ID hint from WA_EMBEDDED_SIGNUP event
 * @param {string} [options.phoneNumberId] - Optional Phone Number ID hint from WA_EMBEDDED_SIGNUP event
 */
async function processEmbeddedSignup(companyId, { code, wabaId: wabaIdHint, phoneNumberId: phoneNumberIdHint }) {
  if (!code || typeof code !== "string" || !code.trim()) {
    const err = new Error("Embedded Signup authorization code is missing");
    err.status = 400;
    throw err;
  }

  const apiVersion = getApiVersion();

  console.log(
    `[EmbeddedSignup] Initiating Meta code exchange for company ${companyId}...`,
  );

  // 1. Exchange authorization code with Meta for access token
  const accessToken = await exchangeCodeForAccessToken(code);

  // 2. Discover WABA ID
  const wabaId = await getWabaIdFromToken(accessToken, wabaIdHint);
  if (!wabaId) {
    console.error(
      `[EmbeddedSignup] WABA ID could not be identified for company ${companyId}`,
    );
    const err = new Error(
      "Could not identify WhatsApp Business Account (WABA) ID from Meta. Please ensure setup was completed in the Meta dialog.",
    );
    err.status = 422;
    throw err;
  }

  // 3. Discover Phone Number ID
  const phoneNumberId = await getPhoneNumberIdForWaba(
    accessToken,
    wabaId,
    phoneNumberIdHint,
  );
  if (!phoneNumberId) {
    console.error(
      `[EmbeddedSignup] Phone Number ID could not be identified for WABA ${wabaId}, company ${companyId}`,
    );
    const err = new Error(
      "Could not identify WhatsApp Phone Number ID from Meta. Please ensure a phone number was selected during setup.",
    );
    err.status = 422;
    throw err;
  }

  // 4. Subscribe app to WABA webhooks
  await subscribeWabaWebhooks(accessToken, wabaId);

  // 5. Store encrypted credentials for this company and update connection status
  const now = new Date();
  await setCompanyWhatsAppCredentials(companyId, {
    accessToken,
    phoneNumberId,
    wabaId,
    apiVersion,
    tokenType: "embedded_signup",
    onboardingCompletedAt: now,
  });

  console.log(
    `[EmbeddedSignup] Successfully connected WhatsApp for company ${companyId} (WABA: ${wabaId}, Phone: ${phoneNumberId})`,
  );

  return {
    success: true,
    connected: true,
    wabaId,
    phoneNumberId,
    tokenType: "embedded_signup",
    connectedAt: now,
    onboardingCompleted: true,
  };
}

module.exports = {
  processEmbeddedSignup,
  exchangeCodeForAccessToken,
  getWabaIdFromToken,
  getPhoneNumberIdForWaba,
  subscribeWabaWebhooks,
};
