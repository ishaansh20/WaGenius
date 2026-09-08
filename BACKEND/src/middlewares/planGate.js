const Subscription = require("../models/subscription");
const Plan = require("../models/plan");
const User = require("../models/user");
const Contact = require("../models/contact");
const Campaign = require("../models/campaign");
const Template = require("../models/template");
const Company = require("../models/company");

/**
 * Safely fetches the subscription for a company without auto-creating one.
 * If no subscription exists, returns null so the company setup flow
 * requires deliberate plan selection.
 */
async function getCompanySubscription(companyId) {
  if (!companyId) return null;
  return await Subscription.findOne({ companyId }).populate("planId");
}

const getOrCreateCompanySubscription = getCompanySubscription;

/**
 * Calculates current resource usage for a company
 */
async function getCompanyUsage(companyId) {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [contactCount, monthlyCampaignCount, templateCount, userCount, companyDoc] =
    await Promise.all([
      Contact.countDocuments({ companyId }),
      Campaign.countDocuments({ companyId, createdAt: { $gte: startOfMonth } }),
      Template.countDocuments({ companyId }),
      User.countDocuments({ companyId, isActive: true }),
      Company.findById(companyId).select("whatsapp").lean(),
    ]);

  const whatsappNumbersCount = companyDoc?.whatsapp?.phoneNumberId ? 1 : 0;

  return {
    contacts: contactCount,
    campaigns: monthlyCampaignCount,
    templates: templateCount,
    users: userCount,
    whatsappNumbers: whatsappNumbersCount,
  };
}

/**
 * Checks if the company's active plan enables a specific boolean feature flag
 * e.g., checkFeature("contactImport"), checkFeature("ai"), checkFeature("api")
 */
const checkFeature = (featureName) => async (req, res, next) => {
  try {
    // Super Admins have overall access to all features and tools
    if (req.user?.platformRole || req.platformUser) {
      return next();
    }

    const companyId = req.companyId || req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Company context missing" });
    }

    const subscription = await getOrCreateCompanySubscription(companyId);

    if (!subscription) {
      return res.status(403).json({
        success: false,
        code: "NO_SUBSCRIPTION",
        message: "No subscription found for this company. Please select a plan.",
      });
    }

    // Block if subscription is suspended, expired, or cancelled
    if (["SUSPENDED", "EXPIRED", "CANCELLED"].includes(subscription.status)) {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_INACTIVE",
        message: `Your subscription is ${subscription.status.toLowerCase()}. Please update your subscription to continue.`,
      });
    }

    const plan = subscription.planId;
    if (!plan) {
      return res.status(403).json({
        success: false,
        code: "NO_PLAN",
        message: "No active plan associated with this subscription.",
      });
    }

    const isFeatureEnabled = plan.features && plan.features[featureName] === true;

    if (!isFeatureEnabled) {
      return res.status(403).json({
        success: false,
        code: "FEATURE_LOCKED",
        feature: featureName,
        message: `The '${featureName}' feature is not included in your current '${plan.name}' plan. Please upgrade to access this feature.`,
      });
    }

    req.subscription = subscription;
    req.plan = plan;
    next();
  } catch (error) {
    console.error("checkFeature middleware error:", error);
    return res.status(500).json({ success: false, message: "Error verifying feature access" });
  }
};

/**
 * Checks if creating new resources would exceed the company's plan quotas
 * e.g., checkLimit("users"), checkLimit("contacts"), checkLimit("campaigns"), checkLimit("templates"), checkLimit("whatsappNumbers")
 */
const checkLimit = (resourceName) => async (req, res, next) => {
  try {
    // Super Admins have overall access without quota blocks
    if (req.user?.platformRole || req.platformUser) {
      return next();
    }

    const companyId = req.companyId || req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Company context missing" });
    }

    const subscription = await getOrCreateCompanySubscription(companyId);

    if (!subscription) {
      return res.status(403).json({
        success: false,
        code: "NO_SUBSCRIPTION",
        message: "No subscription found for this company. Please select a plan.",
      });
    }

    // Check trial expiration
    if (subscription.status === "TRIAL" && subscription.trialEndsAt) {
      if (new Date() > new Date(subscription.trialEndsAt)) {
        return res.status(403).json({
          success: false,
          code: "TRIAL_EXPIRED",
          message: "Your free trial has expired. Please upgrade to a paid plan to continue creating resources.",
        });
      }
    }

    // Block if subscription is suspended, expired, or cancelled
    if (["SUSPENDED", "EXPIRED", "CANCELLED"].includes(subscription.status)) {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_INACTIVE",
        message: `Your subscription is ${subscription.status.toLowerCase()}. Please update your subscription to continue.`,
      });
    }

    const plan = subscription.planId;
    if (!plan || !plan.limits) {
      return next();
    }

    const limits = plan.limits;

    if (resourceName === "users") {
      const allowedUsers = limits.users ?? 1;
      const currentUsers = await User.countDocuments({ companyId, isActive: true });
      if (currentUsers >= allowedUsers) {
        return res.status(403).json({
          success: false,
          code: "USER_LIMIT_REACHED",
          message: `User limit reached (${currentUsers}/${allowedUsers}). Please upgrade your plan to add more team members.`,
        });
      }
    }

    if (resourceName === "contacts") {
      const allowedContacts = limits.contacts ?? 500;
      const currentContacts = await Contact.countDocuments({ companyId });
      if (currentContacts >= allowedContacts) {
        return res.status(403).json({
          success: false,
          code: "CONTACT_LIMIT_REACHED",
          message: `Contact limit reached (${currentContacts}/${allowedContacts}). Please upgrade your plan to store more contacts.`,
        });
      }
    }

    if (resourceName === "campaigns") {
      // Per Wagenius specification: Broadcast campaign sending is unlimited across all plans (Free, Pro, Enterprise)
      return next();
    }

    if (resourceName === "templates") {
      const allowedTemplates = limits.templates ?? 5;
      const currentTemplates = await Template.countDocuments({ companyId });
      if (currentTemplates >= allowedTemplates) {
        return res.status(403).json({
          success: false,
          code: "TEMPLATE_LIMIT_REACHED",
          message: `Template limit reached (${currentTemplates}/${allowedTemplates}). Please upgrade your plan to create more templates.`,
        });
      }
    }

    if (resourceName === "whatsappNumbers") {
      const allowedNumbers = limits.whatsappNumbers ?? 1;
      // In single-number plans, if one number is already connected, allow updating/reconnecting existing connection
      const companyDoc = await Company.findById(companyId).select("whatsapp").lean();
      const isReconnecting = companyDoc?.whatsapp?.connected === true;
      const currentNumbers = companyDoc?.whatsapp?.phoneNumberId ? 1 : 0;
      if (!isReconnecting && allowedNumbers !== -1 && currentNumbers >= allowedNumbers) {
        return res.status(403).json({
          success: false,
          code: "WHATSAPP_NUMBER_LIMIT_REACHED",
          message: `Your current plan allows up to ${allowedNumbers} WhatsApp number(s). Upgrade to Enterprise to connect multiple numbers.`,
        });
      }
    }

    req.subscription = subscription;
    req.plan = plan;
    next();
  } catch (error) {
    console.error("checkLimit middleware error:", error);
    return res.status(500).json({ success: false, message: "Error checking plan limits" });
  }
};

module.exports = {
  checkFeature,
  checkLimit,
  getOrCreateCompanySubscription,
  getCompanyUsage,
};
