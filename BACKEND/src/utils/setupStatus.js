const SETUP_STATUS = Object.freeze({
  PLAN_SELECTION_REQUIRED: "PLAN_SELECTION_REQUIRED",
  WHATSAPP_ONBOARDING_REQUIRED: "WHATSAPP_ONBOARDING_REQUIRED",
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

  // If already marked READY or both requirements are satisfied
  if (company.setupStatus === SETUP_STATUS.READY || (hasWhatsApp && hasPlan)) {
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
