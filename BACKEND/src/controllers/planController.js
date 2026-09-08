const Plan = require("../models/plan");
const { logAdminAction } = require("../services/platform/auditService");

// Public — used by pricing page & customer Billing tab. Active plans only.
const getPublicPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true })
      .sort({ "pricing.monthly": 1 })
      .lean();

    return res.status(200).json({ success: true, data: plans });
  } catch (error) {
    console.error("Get Public Plans Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch plans" });
  }
};

// Super Admin — all plans, including inactive ones.
const listAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ "pricing.monthly": 1 }).lean();
    return res.status(200).json({ success: true, data: plans });
  } catch (error) {
    console.error("List Plans Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch plans" });
  }
};

const createPlan = async (req, res) => {
  try {
    const plan = await Plan.create(req.body);

    await logAdminAction({
      req,
      action: "PLAN_CREATED",
      targetModel: "Plan",
      targetId: plan._id,
      targetName: plan.name,
      details: { pricing: plan.pricing, limits: plan.limits, features: plan.features },
    });

    return res.status(201).json({ success: true, data: plan });
  } catch (error) {
    console.error("Create Plan Error:", error);
    return res.status(400).json({
      success: false,
      message: error.code === 11000 ? "A plan with this slug already exists" : "Failed to create plan",
    });
  }
};

const updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    await logAdminAction({
      req,
      action: "PLAN_UPDATED",
      targetModel: "Plan",
      targetId: plan._id,
      targetName: plan.name,
      details: req.body,
    });

    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    console.error("Update Plan Error:", error);
    return res.status(400).json({ success: false, message: "Failed to update plan" });
  }
};

const togglePlanStatus = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    await logAdminAction({
      req,
      action: "PLAN_STATUS_TOGGLED",
      targetModel: "Plan",
      targetId: plan._id,
      targetName: plan.name,
      details: { isActive: plan.isActive },
    });

    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    console.error("Toggle Plan Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update plan status" });
  }
};

module.exports = {
  getPublicPlans,
  listAllPlans,
  createPlan,
  updatePlan,
  togglePlanStatus,
};
