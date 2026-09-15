const SETUP_STATUS = Object.freeze({
  PLAN_SELECTION_REQUIRED: "PLAN_SELECTION_REQUIRED",
  WHATSAPP_ONBOARDING_REQUIRED: "WHATSAPP_ONBOARDING_REQUIRED",
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  READY: "READY",
});

/**
 * Derives or validates the setupStatus of a company.
 * Handles legacy companies that may not have setupStatus saved yet,
 * ensuring seamless backward compatibility without breaking existing setups.
 */
function resolveSetupStatus(company, subscription) {
  if (!company) return SETUP_STATUS.PLAN_SELECTION_REQUIRED;

  const hasWhatsApp = company.whatsapp?.connected === true;
  const hasPlan = Boolean(subscription && subscription.planId);

  const wouldOtherwiseBeReady =
    company.setupStatus === SETUP_STATUS.READY ||
    company.setupStatus === SETUP_STATUS.PAYMENT_REQUIRED ||
    (hasWhatsApp && hasPlan);

  if (wouldOtherwiseBeReady) {
    // WABA is connected and a plan is active — but messaging itself can
    // still be blocked, most commonly because no payment method is
    // attached to the WhatsApp Business Account yet. Treat that as its
    // own gated state, exactly as serious as any other incomplete-setup
    // state, instead of letting the company into the rest of the app.
    if (company.whatsapp?.messagingBlocked === true) {
      return SETUP_STATUS.PAYMENT_REQUIRED;
    }
    return SETUP_STATUS.READY;
  }

  // If marked WHATSAPP_ONBOARDING_REQUIRED or has a plan selected
  if (
    company.setupStatus === SETUP_STATUS.WHATSAPP_ONBOARDING_REQUIRED ||
    hasPlan
  ) {
    return SETUP_STATUS.WHATSAPP_ONBOARDING_REQUIRED;
  }

  return SETUP_STATUS.PLAN_SELECTION_REQUIRED;
}

module.exports = {
  SETUP_STATUS,
  resolveSetupStatus,
};
