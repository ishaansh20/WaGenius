const Company = require("../models/company");
const Subscription = require("../models/subscription");
const { resolveSetupStatus, SETUP_STATUS } = require("../utils/setupStatus");

/**
 * Middleware that ensures a company has satisfied the required onboarding setup state
 * before accessing operational platform APIs (e.g. campaigns, inbox messages, contacts, templates).
 *
 * State hierarchy:
 *   PLAN_SELECTION_REQUIRED -> WHATSAPP_ONBOARDING_REQUIRED -> READY
 */
const requireCompanySetup = (
  requiredState = SETUP_STATUS.READY,
  { requireMessagingHealth = false } = {},
) => {
  return async (req, res, next) => {
    try {
      // Super Admins / Platform staff have overall platform access
      if (req.user?.platformRole || req.platformUser) {
        return next();
      }

      const companyId = req.companyId || req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({
          success: false,
          message: "Company context missing",
        });
      }

      const [company, subscription] = await Promise.all([
        Company.findById(companyId).select("name setupStatus whatsapp"),
        Subscription.findOne({ companyId }),
      ]);

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Company not found",
        });
      }

      const currentStatus = resolveSetupStatus(company, subscription);

      // Self-heal stored status if out of sync
      if (company.setupStatus !== currentStatus) {
        company.setupStatus = currentStatus;
        await company.save();
      }

      if (requiredState === SETUP_STATUS.READY) {
        if (currentStatus === SETUP_STATUS.PLAN_SELECTION_REQUIRED) {
          return res.status(403).json({
            success: false,
            code: "PLAN_SELECTION_REQUIRED",
            message: "Please select a subscription plan before continuing.",
          });
        }

        if (currentStatus === SETUP_STATUS.WHATSAPP_ONBOARDING_REQUIRED) {
          return res.status(403).json({
            success: false,
            code: "WHATSAPP_ONBOARDING_REQUIRED",
            message: "Connect your WhatsApp Business account to complete setup.",
          });
        }
      }

      if (
        requiredState === SETUP_STATUS.WHATSAPP_ONBOARDING_REQUIRED &&
        currentStatus === SETUP_STATUS.PLAN_SELECTION_REQUIRED
      ) {
        return res.status(403).json({
          success: false,
          code: "PLAN_SELECTION_REQUIRED",
          message: "Please select a subscription plan before continuing.",
        });
      }

      // Gate message-sending routes on cached payment/health status too —
      // a company can be fully "READY" (WABA + phone registered) but still
      // unable to send messages if they haven't attached a payment method.
      // Only enforce this for routes that actually explicitly opt in via
      // requireMessagingHealth (see below) — it should NOT block routes
      // like settings or dashboard viewing.
      if (requireMessagingHealth && company.whatsapp?.messagingBlocked) {
        return res.status(403).json({
          success: false,
          code: "PAYMENT_METHOD_REQUIRED",
          message:
            company.whatsapp?.messagingBlockedReason ||
            "Add a payment method to your WhatsApp Business Account to start sending messages.",
        });
      }

      req.setupStatus = currentStatus;
      return next();
    } catch (error) {
      console.error("[SetupGate] Error verifying company setup status:", error);
      return res.status(500).json({
        success: false,
        message: "Error verifying company setup status",
      });
    }
  };
};

module.exports = {
  requireCompanySetup,
};
