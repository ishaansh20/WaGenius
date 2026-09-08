const mongoose = require("mongoose");
const Subscription = require("../models/subscription");
const Plan = require("../models/plan");
const Company = require("../models/company");
const { resolveSetupStatus, SETUP_STATUS } = require("../utils/setupStatus");
const { logAdminAction } = require("../services/platform/auditService");
const {
  getOrCreateCompanySubscription,
  getCompanyUsage,
} = require("../middlewares/planGate");

function isValidObjectId(id) {
  return (
    id &&
    typeof id === "string" &&
    id !== "[object Object]" &&
    id !== "undefined" &&
    id !== "null" &&
    mongoose.Types.ObjectId.isValid(id)
  );
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ---- Customer-facing (auth: company user) ----

const getMySubscription = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId;

    const subscription = await getOrCreateCompanySubscription(companyId);

    return res.status(200).json({ success: true, data: subscription || null });
  } catch (error) {
    console.error("Get My Subscription Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch subscription" });
  }
};

/**
 * Central Plan Access Endpoint:
 * Returns the single source of truth for the company's active plan,
 * feature flags, limits, live resource usage, and company setupStatus.
 */
const getMyPlanAccess = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId;

    const [subscription, usage, company] = await Promise.all([
      getOrCreateCompanySubscription(companyId),
      getCompanyUsage(companyId),
      Company.findById(companyId).select("setupStatus whatsapp name slug"),
    ]);

    const plan = subscription?.planId || null;
    const currentSetupStatus = resolveSetupStatus(company, subscription);

    // Self-heal company setupStatus in DB if needed
    if (company && company.setupStatus !== currentSetupStatus) {
      company.setupStatus = currentSetupStatus;
      await company.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        companyId,
        setupStatus: currentSetupStatus,
        subscription: subscription
          ? {
              _id: subscription._id,
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              startDate: subscription.startDate,
              trialEndsAt: subscription.trialEndsAt,
              renewalDate: subscription.renewalDate,
            }
          : null,
        plan: plan
          ? {
              _id: plan._id,
              name: plan.name,
              slug: plan.slug,
              description: plan.description,
              pricing: plan.pricing,
              isFree: plan.isFree,
              isTrial: plan.isTrial,
              isEnterprise: plan.isEnterprise,
            }
          : null,
        limits: plan?.limits || {
          users: 1,
          contacts: 500,
          campaigns: -1, // Unlimited broadcast campaign sending
          templates: 5,
          whatsappNumbers: 1,
        },
        features: plan?.features || {
          whatsapp: false,
          contactImport: false,
          contactExport: false,
          advancedSegmentation: false,
          campaignSchedule: false,
          campaignPauseResume: false,
          ai: false,
          advancedAnalytics: false,
          analyticsExport: false,
          teamManagement: false,
          api: false,
          customWebhooks: false,
        },
        usage,
      },
    });
  } catch (error) {
    console.error("Get My Plan Access Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch plan access" });
  }
};

// Select plan: isFree -> ACTIVE, trialDays > 0 -> TRIAL, else PENDING / ACTIVE
const selectPlan = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId;
    const { planId, billingCycle } = req.body;

    const plan = await Plan.findOne({ _id: planId, isActive: true });

    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found or inactive" });
    }

    const isFree = plan.isFree || plan.pricing?.monthly === 0;
    const isTrial = !isFree && (plan.isTrial || plan.trialDays > 0);
    const cycle = billingCycle === "yearly" ? "yearly" : "monthly";
    const now = new Date();

    let status = "ACTIVE";
    if (isFree) {
      status = "ACTIVE";
    } else if (isTrial) {
      status = "TRIAL";
    } else {
      status = "ACTIVE";
    }

    const trialEndsAt = isTrial ? addDays(now, plan.trialDays || 14) : null;
    const renewalDate =
      !isTrial && !isFree
        ? addDays(now, cycle === "yearly" ? 365 : 30)
        : null;

    const update = {
      planId: plan._id,
      billingCycle: cycle,
      status,
      startDate: now,
      trialEndsAt,
      renewalDate,
    };

    const subscription = await Subscription.findOneAndUpdate(
      { companyId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).populate("planId");

    // Advance company setupStatus from PLAN_SELECTION_REQUIRED to WHATSAPP_ONBOARDING_REQUIRED (or keep READY if already connected)
    const company = await Company.findById(companyId);
    let newSetupStatus = SETUP_STATUS.WHATSAPP_ONBOARDING_REQUIRED;
    if (company) {
      if (company.whatsapp?.connected === true) {
        newSetupStatus = SETUP_STATUS.READY;
      }
      company.setupStatus = newSetupStatus;
      await company.save();
    }

    return res.status(200).json({
      success: true,
      setupStatus: newSetupStatus,
      data: subscription,
    });
  } catch (error) {
    console.error("Select Plan Error:", error);
    return res.status(500).json({ success: false, message: "Failed to select plan" });
  }
};

// End trial early - converts trial to active plan
const endTrial = async (req, res) => {
  try {
    const companyId = req.user.companyId || req.companyId;

    const subscription = await Subscription.findOne({ companyId });

    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    if (subscription.status !== "TRIAL") {
      return res.status(400).json({ success: false, message: "Subscription is not in trial status" });
    }

    const now = new Date();
    const cycle = subscription.billingCycle === "yearly" ? "yearly" : "monthly";

    subscription.status = "ACTIVE";
    subscription.trialEndsAt = null;
    subscription.renewalDate = addDays(now, cycle === "yearly" ? 365 : 30);
    await subscription.save();
    await subscription.populate("planId");

    return res.status(200).json({
      success: true,
      message: "Trial ended successfully. Your subscription is now active.",
      data: subscription,
    });
  } catch (error) {
    console.error("End Trial Error:", error);
    return res.status(500).json({ success: false, message: "Failed to end trial" });
  }
};

// ---- Super Admin (auth: platform) ----

const getCompanySubscription = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid company ID" });
    }

    const subscription = await getOrCreateCompanySubscription(id);

    return res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    console.error("Get Company Subscription Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch subscription" });
  }
};

// Body: { planId?, status?, billingCycle?, extendTrialDays?, renewalDate?, trialEndsAt? }
const updateCompanySubscription = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid company ID" });
    }

    const { planId, status, billingCycle, extendTrialDays, renewalDate, trialEndsAt } = req.body;

    let subscription = await Subscription.findOne({ companyId: id });

    if (!subscription) {
      if (!planId) {
        return res.status(404).json({ success: false, message: "Subscription not found" });
      }
      subscription = new Subscription({
        companyId: id,
        planId,
        status: status || "ACTIVE",
        billingCycle: billingCycle || "monthly",
      });
    }

    if (planId) subscription.planId = planId;
    if (status) subscription.status = status;
    if (billingCycle) subscription.billingCycle = billingCycle;

    if (extendTrialDays) {
      const base = subscription.trialEndsAt || new Date();
      subscription.trialEndsAt = addDays(base, Number(extendTrialDays));
      subscription.status = "TRIAL";
    }

    if (renewalDate !== undefined) {
      subscription.renewalDate = renewalDate ? new Date(renewalDate) : null;
    }

    if (trialEndsAt !== undefined) {
      subscription.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    }

    // Auto-compute renewalDate if active and unset
    if (subscription.status === "ACTIVE" && !subscription.renewalDate) {
      const start = subscription.startDate || new Date();
      const cycle = subscription.billingCycle === "yearly" ? "yearly" : "monthly";
      subscription.renewalDate = addDays(start, cycle === "yearly" ? 365 : 30);
    }

    await subscription.save();
    await subscription.populate("planId");

    await logAdminAction({
      req,
      action: "SUBSCRIPTION_UPDATED",
      targetModel: "Subscription",
      targetId: subscription._id,
      targetName: `Company ${req.params.id}`,
      details: {
        plan: subscription.planId?.name,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        trialEndsAt: subscription.trialEndsAt,
        renewalDate: subscription.renewalDate,
      },
    });

    return res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    console.error("Update Company Subscription Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update subscription" });
  }
};

module.exports = {
  getMySubscription,
  getMyPlanAccess,
  selectPlan,
  endTrial,
  getCompanySubscription,
  updateCompanySubscription,
};
