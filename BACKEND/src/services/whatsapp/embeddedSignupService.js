const crypto = require("crypto");
const axios = require("axios");
const {
  setCompanyWhatsAppCredentials,
  updateCompanyMessagingHealth,
} = require("./companyCredentials");
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
 * Generates a cryptographically secure 6-digit numeric PIN for Cloud API phone registration.
 */
function generateSixDigitPin() {
  return crypto.randomInt(100000, 1000000).toString();
}

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
 * Upgrades a short-lived OAuth access token (~1-2 hours) to a 60-day long-lived access token.
 */
async function exchangeForLongLivedToken(shortLivedToken) {
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
            grant_type: "fb_exchange_token",
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: shortLivedToken.trim(),
          },
          timeout: 15000,
        }),
      { label: "exchangeForLongLivedToken" },
    );

    const longLivedToken = response.data?.access_token;
    if (!longLivedToken) {
      console.warn(
        "[EmbeddedSignup] Long-lived token response did not contain access_token; continuing with initial token",
      );
      return shortLivedToken;
    }

    console.log(
      "[EmbeddedSignup] Successfully exchanged short-lived token for long-lived (60-day) token",
    );
    return longLivedToken;
  } catch (error) {
    const metaError = error.response?.data?.error;
    console.warn(
      "[EmbeddedSignup] Failed to exchange short-lived token for long-lived token, falling back to initial token:",
      metaError || error.message,
    );
    return shortLivedToken;
  }
}

/**
 * Registers the phone number with Meta's WhatsApp Cloud API using a 6-digit PIN.
 * Required for sending/receiving WhatsApp messages on the Cloud API.
 */
async function registerPhoneNumber(accessToken, phoneNumberId, pin) {
  if (!phoneNumberId) {
    throw new Error("Cannot register phone number: Phone Number ID is missing");
  }

  const apiVersion = getApiVersion();
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/register`;

  try {
    const response = await withRetry(
      () =>
        axios.post(
          url,
          {
            messaging_product: "whatsapp",
            pin: String(pin).trim(),
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          },
        ),
      { label: "registerPhoneNumber" },
    );

    if (!response.data?.success) {
      throw new Error("Meta rejected phone number registration");
    }

    console.log(
      `[EmbeddedSignup] Successfully registered phone number ${phoneNumberId} with WhatsApp Cloud API`,
    );
    return response.data;
  } catch (error) {
    const metaError = error.response?.data?.error;
    console.error(
      `[EmbeddedSignup] Phone number registration failed for ${phoneNumberId}:`,
      metaError || error.message,
    );

    const err = new Error(
      `Meta phone number registration failed: ${metaError?.message || error.message}`,
    );
    err.code = metaError?.code;
    err.subcode = metaError?.error_subcode;
    err.status = 400;
    throw err;
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
    if (tokenData) {
      console.log(
        `[EmbeddedSignup] Token debug info: is_valid=${tokenData.is_valid}, expires_at=${
          tokenData.expires_at
            ? new Date(tokenData.expires_at * 1000).toISOString()
            : "never"
        }, scopes=${tokenData.scopes?.join(",") || "none"}`,
      );
    }

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
 * Throws on failure so issues are surfaced immediately.
 */
async function subscribeWabaWebhooks(accessToken, wabaId) {
  if (!wabaId) {
    const err = new Error("Cannot subscribe webhooks: WABA ID is missing");
    err.status = 400;
    throw err;
  }
  const apiVersion = getApiVersion();

  try {
    const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/subscribed_apps`;
    const response = await withRetry(
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

    if (response.data && response.data.success === false) {
      throw new Error("Meta rejected webhook subscription");
    }

    console.log(
      `[EmbeddedSignup] Successfully subscribed webhooks for WABA ${wabaId}`,
    );
    return response.data;
  } catch (error) {
    const metaError = error.response?.data?.error;
    console.error(
      `[EmbeddedSignup] Webhook subscription failed for WABA ${wabaId}:`,
      metaError || error.message,
    );

    const err = new Error(
      `Meta webhook subscription failed: ${metaError?.message || error.message}`,
    );
    err.code = metaError?.code;
    err.subcode = metaError?.error_subcode;
    err.status = 400;
    throw err;
  }
}

/**
 * Verifies whether the application is actively subscribed to a WABA's webhooks.
 */
async function checkWabaWebhookSubscription(accessToken, wabaId) {
  if (!wabaId) return false;
  const apiVersion = getApiVersion();
  const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/subscribed_apps`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 10000,
    });
    const subscribedApps = response.data?.data || [];
    return subscribedApps.length > 0;
  } catch (error) {
    console.warn(
      `[EmbeddedSignup] Failed to check subscribed apps for WABA ${wabaId}:`,
      error.response?.data?.error?.message || error.message,
    );
    return false;
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
 * @param {string} [options.pin] - Optional 6-digit registration PIN override
 */
async function processEmbeddedSignup(
  companyId,
  {
    code,
    wabaId: wabaIdHint,
    phoneNumberId: phoneNumberIdHint,
    pin: pinOption,
  },
) {
  if (!code || typeof code !== "string" || !code.trim()) {
    const err = new Error("Embedded Signup authorization code is missing");
    err.status = 400;
    throw err;
  }

  const apiVersion = getApiVersion();

  console.log(
    `[EmbeddedSignup] Initiating Meta code exchange for company ${companyId}...`,
  );

  // 1. Exchange authorization code with Meta for short-lived access token
  const shortLivedToken = await exchangeCodeForAccessToken(code);

  // 2. Exchange short-lived token for 60-day long-lived access token
  const accessToken = await exchangeForLongLivedToken(shortLivedToken);

  // 3. Discover WABA ID
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

  // 4. Discover Phone Number ID (OPTIONAL as of Meta Embedded Signup v3+ —
  // a business can finish the flow with no phone number yet and add one later
  // via WhatsApp Manager or the Phone Number Registration API)
  const phoneNumberId = await getPhoneNumberIdForWaba(
    accessToken,
    wabaId,
    phoneNumberIdHint,
  );

  let pin = null;
  let phoneRegistered = false;

  if (phoneNumberId) {
    // 5. Register phone number for Cloud API (hard fail only if a number IS
    // present but registration itself fails — a real, actionable error)
    pin =
      pinOption && String(pinOption).trim().length === 6
        ? String(pinOption).trim()
        : generateSixDigitPin();

    console.log(
      `[EmbeddedSignup] Registering phone number ${phoneNumberId} with Cloud API for company ${companyId}...`,
    );
    await registerPhoneNumber(accessToken, phoneNumberId, pin);
    phoneRegistered = true;
  } else {
    console.log(
      `[EmbeddedSignup] No phone number was added during signup for company ${companyId} — ` +
        `saving WABA link as pending. Call completePhoneRegistration() later once a number is available.`,
    );
  }

  // 6. Subscribe app to WABA webhooks (REQUIRED — hard fail if this breaks;
  // this doesn't depend on a phone number existing)
  console.log(`[EmbeddedSignup] Subscribing webhooks for WABA ${wabaId}...`);
  await subscribeWabaWebhooks(accessToken, wabaId);

  // 7. Store encrypted credentials (access token and PIN, if any) for this
  // company and update connection status
  const now = new Date();
  await setCompanyWhatsAppCredentials(companyId, {
    accessToken,
    pin,
    phoneNumberId: phoneNumberId || null,
    wabaId,
    apiVersion,
    tokenType: "embedded_signup",
    onboardingCompletedAt: now,
    phoneStatus: phoneRegistered ? "registered" : "pending",
  });

  console.log(
    `[EmbeddedSignup] Successfully connected WhatsApp for company ${companyId} ` +
      `(WABA: ${wabaId}, Phone: ${phoneNumberId || "pending"})`,
  );

  // 8. Attempt initial messaging health check so initial status is populated.
  // Never fail the entire signup if this check fails — it is also checked on-demand.
  try {
    const health = await checkWabaHealthStatus(accessToken, wabaId);
    await updateCompanyMessagingHealth(companyId, health);
  } catch (healthErr) {
    console.warn(
      `[EmbeddedSignup] Initial health status check skipped/failed for WABA ${wabaId}:`,
      healthErr.message,
    );
  }

  return {
    success: true,
    connected: true,
    wabaId,
    phoneNumberId: phoneNumberId || null,
    phoneStatus: phoneRegistered ? "registered" : "pending",
    tokenType: "embedded_signup",
    connectedAt: now,
    onboardingCompleted: true,
  };
}

/**
 * Completes phone registration for a company that finished Embedded Signup
 * without a phone number (phoneStatus: "pending"). Call this once the
 * business has a real number to add, either via a fresh Embedded Signup
 * re-run for the same WABA or a number entered directly in your UI.
 */
async function completePhoneRegistration(companyId, { accessToken, wabaId, phoneNumberIdHint, pin: pinOption }) {
  const phoneNumberId = await getPhoneNumberIdForWaba(
    accessToken,
    wabaId,
    phoneNumberIdHint,
  );
  if (!phoneNumberId) {
    const err = new Error(
      "Still no phone number found for this WABA. Complete phone addition in WhatsApp Manager or Embedded Signup first.",
    );
    err.status = 422;
    throw err;
  }

  const pin =
    pinOption && String(pinOption).trim().length === 6
      ? String(pinOption).trim()
      : generateSixDigitPin();

  await registerPhoneNumber(accessToken, phoneNumberId, pin);

  await setCompanyWhatsAppCredentials(companyId, {
    accessToken,
    pin,
    phoneNumberId,
    wabaId,
    apiVersion: getApiVersion(),
    tokenType: "embedded_signup",
    onboardingCompletedAt: new Date(),
    phoneStatus: "registered",
  });

  return { success: true, phoneNumberId, phoneStatus: "registered" };
}

/**
 * Queries Meta's official health_status field for a WABA to determine
 * whether messaging is currently possible. Returns a normalized summary —
 * this is what a missing payment method (or other blocking issue) looks
 * like from Meta's side.
 */
async function checkWabaHealthStatus(accessToken, wabaId) {
  const apiVersion = getApiVersion();
  const url = `https://graph.facebook.com/${apiVersion}/${wabaId}`;

  const response = await withRetry(
    () =>
      axios.get(url, {
        params: { fields: "health_status" },
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      }),
    { label: "checkWabaHealthStatus" },
  );

  const healthStatus = response.data?.health_status;
  const canSendMessage = healthStatus?.can_send_message || "AVAILABLE";
  const entities = healthStatus?.entities || [];

  // Collect the most useful human-readable reason, if any entity is
  // blocked or limited. Prefer BLOCKED reasons over LIMITED ones.
  let reason = "";
  const blockedEntity = entities.find((e) => e.can_send_message === "BLOCKED");
  const limitedEntity = entities.find((e) => e.can_send_message === "LIMITED");
  const relevantEntity = blockedEntity || limitedEntity;

  if (relevantEntity) {
    const messages =
      relevantEntity.errors?.map((e) => e.error_description || e.message) ||
      relevantEntity.additional_info ||
      [];
    reason = messages.join(" ") || "";
  }

  return {
    canSendMessage, // "AVAILABLE" | "LIMITED" | "BLOCKED"
    isBlocked: canSendMessage === "BLOCKED",
    reason,
  };
}

module.exports = {
  processEmbeddedSignup,
  completePhoneRegistration,
  checkWabaHealthStatus,
  exchangeCodeForAccessToken,
  exchangeForLongLivedToken,
  generateSixDigitPin,
  registerPhoneNumber,
  getWabaIdFromToken,
  getPhoneNumberIdForWaba,
  subscribeWabaWebhooks,
  checkWabaWebhookSubscription,
};
