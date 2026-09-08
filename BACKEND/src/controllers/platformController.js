const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Company = require("../models/company");
const User = require("../models/user");
const Template = require("../models/template");
const Campaign = require("../models/campaign");
const Contact = require("../models/contact");
const Conversation = require("../models/conversation");
const Message = require("../models/message");
const Subscription = require("../models/subscription");
const AuditLog = require("../models/auditLog");
const PlatformConfig = require("../models/platformConfig");
const { logAdminAction } = require("../services/platform/auditService");

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

// v1 scope, deliberately: list + suspend/reactivate + a basic usage snapshot.
// No impersonation, no billing/plan management — both real features, kept
// as deliberate follow-ups rather than bundled into this retrofit.
const listCompanies = async (req, res) => {
  try {
    const companies = await Company.find()
      .select("-whatsapp.accessToken")
      .sort({ createdAt: -1 })
      .lean();

    const companyIds = companies.map((company) => company._id);

    if (companyIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const [
      userStats,
      templateStats,
      campaignStats,
      contactStats,
      conversationStats,
      subscriptions,
    ] = await Promise.all([
      User.aggregate([
        {
          $match: {
            companyId: { $in: companyIds },
          },
        },
        {
          $group: {
            _id: "$companyId",
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $eq: ["$isActive", true] }, 1, 0],
              },
            },
          },
        },
      ]),

      Template.aggregate([
        {
          $match: {
            companyId: { $in: companyIds },
          },
        },
        {
          $group: {
            _id: "$companyId",
            total: { $sum: 1 },
          },
        },
      ]),

      Campaign.aggregate([
        {
          $match: {
            companyId: { $in: companyIds },
          },
        },
        {
          $group: {
            _id: "$companyId",
            total: { $sum: 1 },
          },
        },
      ]),

      Contact.aggregate([
        {
          $match: {
            companyId: { $in: companyIds },
          },
        },
        {
          $group: {
            _id: "$companyId",
            total: { $sum: 1 },
          },
        },
      ]),

      Conversation.aggregate([
        {
          $match: {
            companyId: { $in: companyIds },
          },
        },
        {
          $group: {
            _id: "$companyId",
            total: { $sum: 1 },
          },
        },
      ]),

      Subscription.find({ companyId: { $in: companyIds } })
        .populate("planId", "name slug pricing limits features isFree isTrial trialDays")
        .lean(),
    ]);

    const createStatsMap = (stats) => {
      return new Map(stats.map((item) => [item._id.toString(), item]));
    };

    const usersMap = createStatsMap(userStats);
    const templatesMap = createStatsMap(templateStats);
    const campaignsMap = createStatsMap(campaignStats);
    const contactsMap = createStatsMap(contactStats);
    const conversationsMap = createStatsMap(conversationStats);
    const subscriptionMap = new Map(
      subscriptions.map((sub) => [sub.companyId.toString(), sub]),
    );

    const result = companies.map((company) => {
      const id = company._id.toString();

      const users = usersMap.get(id);
      const templates = templatesMap.get(id);
      const campaigns = campaignsMap.get(id);
      const contacts = contactsMap.get(id);
      const conversations = conversationsMap.get(id);
      const subscription = subscriptionMap.get(id) || null;

      return {
        ...company,
        subscription,

        statistics: {
          users: {
            total: users?.total || 0,
            active: users?.active || 0,
          },

          templates: {
            total: templates?.total || 0,
          },

          campaigns: {
            total: campaigns?.total || 0,
          },

          contacts: {
            total: contacts?.total || 0,
          },

          conversations: {
            total: conversations?.total || 0,
          },

          whatsapp: {
            connected: company.whatsapp?.connected || false,
          },
        },
      };
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("List Platform Companies Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch companies",
    });
  }
};
const getCompanyDetail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const company = await Company.findById(id)
      .select("-whatsapp.accessToken")
      .lean();

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalTemplates,
      totalCampaigns,
      totalContacts,
      totalConversations,
      subscription,
    ] = await Promise.all([
      User.countDocuments({
        companyId: id,
      }),

      User.countDocuments({
        companyId: id,
        isActive: true,
      }),

      User.countDocuments({
        companyId: id,
        role: "ADMIN",
      }),

      Template.countDocuments({
        companyId: id,
      }),

      Campaign.countDocuments({
        companyId: id,
      }),

      Contact.countDocuments({
        companyId: id,
      }),

      Conversation.countDocuments({
        companyId: id,
      }),

      Subscription.findOne({ companyId: id })
        .populate("planId")
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        company,
        subscription: subscription || null,

        users: {
          total: totalUsers,
          active: activeUsers,
          admins: adminUsers,
        },

        templates: {
          total: totalTemplates,
        },

        campaigns: {
          total: totalCampaigns,
        },

        contacts: {
          total: totalContacts,
        },

        conversations: {
          total: totalConversations,
        },
      },
    });
  } catch (error) {
    console.error("Get Platform Company Detail Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company details",
    });
  }
};

const getCompanyUsers = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    // First make sure company exists
    const company = await Company.findById(id).select("name status").lean();

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const users = await User.find({
      companyId: id,
    })
      .select("-password -passwordHash -refreshToken -resetPasswordToken")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        company,
        users,
        total: users.length,
      },
    });
  } catch (error) {
    console.error("Get Company Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch company users",
    });
  }
};

const updateCompanyStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const { status } = req.body;

    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be 'active' or 'suspended'",
      });
    }

    const company = await Company.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    await logAdminAction({
      req,
      action: "COMPANY_STATUS_UPDATED",
      targetModel: "Company",
      targetId: company._id,
      targetName: company.name,
      details: { status: company.status },
    });

    res.status(200).json({ success: true, company });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update company status" });
  }
};

const getPlatformDashboard = async (req, res) => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalUsers,
      activeUsers,
      totalTemplates,
      totalCampaigns,
      totalContacts,
      connectedWhatsApp,
      trialSubs,
      activeSubs,
      pendingSubs,
      totalSubs,
    ] = await Promise.all([
      Company.countDocuments(),

      Company.countDocuments({
        status: "active",
      }),

      Company.countDocuments({
        status: "suspended",
      }),

      User.countDocuments(),

      User.countDocuments({
        isActive: true,
      }),

      Template.countDocuments(),

      Campaign.countDocuments(),

      Contact.countDocuments(),

      Company.countDocuments({
        "whatsapp.connected": true,
      }),

      Subscription.countDocuments({ status: "TRIAL" }),
      Subscription.countDocuments({ status: "ACTIVE" }),
      Subscription.countDocuments({ status: "PENDING" }),
      Subscription.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        companies: {
          total: totalCompanies,
          active: activeCompanies,
          suspended: suspendedCompanies,
        },

        users: {
          total: totalUsers,
          active: activeUsers,
        },

        templates: {
          total: totalTemplates,
        },

        campaigns: {
          total: totalCampaigns,
        },

        contacts: {
          total: totalContacts,
        },

        whatsapp: {
          connected: connectedWhatsApp,
        },

        subscriptions: {
          total: totalSubs,
          trial: trialSubs,
          active: activeSubs,
          pending: pendingSubs,
        },
      },
    });
  } catch (error) {
    console.error("Platform Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load platform dashboard",
    });
  }
};

const listAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate("companyId", "name slug status")
      .populate("planId")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    console.error("List All Subscriptions Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscriptions",
    });
  }
};

const getCompanyCampaigns = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid company ID" });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const [campaigns, total] = await Promise.all([
      Campaign.find({ companyId: id })
        .select(
          "campaignName campaignType status message totalContacts sentCount deliveredCount readCount repliedCount failedCount scheduleAt createdAt",
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Campaign.countDocuments({ companyId: id }),
    ]);

    return res.status(200).json({
      success: true,
      data: campaigns,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get Company Campaigns Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch company campaigns" });
  }
};

const getCompanyTemplates = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid company ID" });
    }

    const templates = await Template.find({ companyId: id })
      .select(
        "name category metaCategory metaStatus metaTemplateName language buttons status rejectionReason createdAt updatedAt",
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: templates,
      total: templates.length,
    });
  } catch (error) {
    console.error("Get Company Templates Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch company templates" });
  }
};

const getCompanyContactsSummary = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid company ID" });
    }

    const [totalContacts, optedOutContacts, sourcesAggregation, recentContacts] =
      await Promise.all([
        Contact.countDocuments({ companyId: id }),
        Contact.countDocuments({ companyId: id, optedOut: true }),
        Contact.aggregate([
          { $match: { companyId: new mongoose.Types.ObjectId(id) } },
          { $group: { _id: "$source", count: { $sum: 1 } } },
        ]),
        Contact.find({ companyId: id })
          .select("name phone tags source optedOut createdAt")
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

    const activeContacts = Math.max(0, totalContacts - optedOutContacts);

    return res.status(200).json({
      success: true,
      data: {
        total: totalContacts,
        active: activeContacts,
        optedOut: optedOutContacts,
        optOutRate: totalContacts > 0 ? ((optedOutContacts / totalContacts) * 100).toFixed(1) : 0,
        sources: sourcesAggregation.map((s) => ({ source: s._id || "whatsapp", count: s.count })),
        recentContacts,
      },
    });
  } catch (error) {
    console.error("Get Company Contacts Summary Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch company contacts summary",
    });
  }
};

const getCompanyWhatsAppHealth = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid company ID" });
    }

    const company = await Company.findById(id).select("name status whatsapp createdAt").lean();

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const whatsappData = company.whatsapp || {};

    const [totalMessages, lastMessage, totalConversations] = await Promise.all([
      Message.countDocuments({ companyId: id }),
      Message.findOne({ companyId: id }).sort({ createdAt: -1 }).select("createdAt status sender").lean(),
      Conversation.countDocuments({ companyId: id }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        connected: whatsappData.connected === true,
        phoneNumberId: whatsappData.phoneNumberId || null,
        wabaId: whatsappData.wabaId || null,
        apiVersion: whatsappData.apiVersion || null,
        tokenType: whatsappData.tokenType || "manual",
        connectedAt: whatsappData.connectedAt || null,
        onboardingCompletedAt: whatsappData.onboardingCompletedAt || null,
        stats: {
          totalMessages,
          totalConversations,
          lastActivityAt: lastMessage?.createdAt || null,
        },
      },
    });
  } catch (error) {
    console.error("Get Company WhatsApp Health Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch company WhatsApp health",
    });
  }
};

const listAllPlatformUsers = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { search, companyId, role, status } = req.query;

    const filter = {
      // Exclude platform users from this company user view if desired, or include company users
      companyId: { $ne: null },
    };

    if (companyId) {
      filter.companyId = companyId;
    }

    if (role) {
      filter.role = role;
    }

    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const [users, total, totalAll, totalActive, totalInactive, totalAdmins] = await Promise.all([
      User.find(filter)
        .populate("companyId", "name slug status")
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
      User.countDocuments({ companyId: { $ne: null } }),
      User.countDocuments({ companyId: { $ne: null }, isActive: true }),
      User.countDocuments({ companyId: { $ne: null }, isActive: false }),
      User.countDocuments({ companyId: { $ne: null }, role: "ADMIN" }),
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      summary: {
        total: totalAll,
        active: totalActive,
        inactive: totalInactive,
        admins: totalAdmins,
      },
    });
  } catch (error) {
    console.error("List All Platform Users Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch platform users" });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive: typeof isActive === "boolean" ? isActive : true },
      { new: true },
    )
      .populate("companyId", "name slug status")
      .select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await logAdminAction({
      req,
      action: "USER_STATUS_TOGGLED",
      targetModel: "User",
      targetId: user._id,
      targetName: user.name,
      details: { email: user.email, isActive: user.isActive, company: user.companyId?.name },
    });

    return res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: user,
    });
  } catch (error) {
    console.error("Toggle User Status Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update user status" });
  }
};

const updateUserRolePlatform = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ["ADMIN", "CAMPAIGN_MANAGER", "SUPPORT_AGENT", "TEAM_LEAD"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(", ")}`,
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true },
    )
      .populate("companyId", "name slug status")
      .select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await logAdminAction({
      req,
      action: "USER_ROLE_UPDATED",
      targetModel: "User",
      targetId: user._id,
      targetName: user.name,
      details: { email: user.email, role: user.role, company: user.companyId?.name },
    });

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update User Role Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update user role" });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    await logAdminAction({
      req,
      action: "USER_PASSWORD_RESET",
      targetModel: "User",
      targetId: user._id,
      targetName: user.name,
      details: { email: user.email },
    });

    return res.status(200).json({
      success: true,
      message: `Password for ${user.email} was reset successfully`,
    });
  } catch (error) {
    console.error("Reset User Password Error:", error);
    return res.status(500).json({ success: false, message: "Failed to reset user password" });
  }
};

const listAllPlatformCampaigns = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { search, companyId, status } = req.query;

    const filter = {};

    if (companyId) {
      filter.companyId = companyId;
    }

    if (status) {
      filter.status = status;
    }

    if (search && search.trim()) {
      filter.campaignName = new RegExp(search.trim(), "i");
    }

    const [
      campaigns,
      total,
      totalAll,
      totalProcessing,
      totalScheduled,
      totalCompleted,
      totalFailed,
      totalsAggregation,
    ] = await Promise.all([
      Campaign.find(filter)
        .populate("companyId", "name slug status")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Campaign.countDocuments(filter),
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: "processing" }),
      Campaign.countDocuments({ status: "scheduled" }),
      Campaign.countDocuments({ status: "completed" }),
      Campaign.countDocuments({ status: "failed" }),
      Campaign.aggregate([
        {
          $group: {
            _id: null,
            totalSent: { $sum: "$sentCount" },
            totalDelivered: { $sum: "$deliveredCount" },
            totalRead: { $sum: "$readCount" },
            totalFailed: { $sum: "$failedCount" },
          },
        },
      ]),
    ]);

    const aggregateMetrics = totalsAggregation[0] || {
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalFailed: 0,
    };

    return res.status(200).json({
      success: true,
      data: campaigns,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      summary: {
        total: totalAll,
        processing: totalProcessing,
        scheduled: totalScheduled,
        completed: totalCompleted,
        failed: totalFailed,
        ...aggregateMetrics,
      },
    });
  } catch (error) {
    console.error("List All Platform Campaigns Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch platform campaigns" });
  }
};

const listAllPlatformTemplates = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { search, companyId, metaStatus, category } = req.query;

    const filter = {};

    if (companyId) {
      filter.companyId = companyId;
    }

    if (metaStatus) {
      filter.metaStatus = metaStatus;
    }

    if (category) {
      filter.$or = [{ category }, { metaCategory: category }];
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: regex }, { metaTemplateName: regex }];
    }

    const [
      templates,
      total,
      totalAll,
      totalApproved,
      totalPending,
      totalRejected,
      totalPaused,
    ] = await Promise.all([
      Template.find(filter)
        .populate("companyId", "name slug status")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Template.countDocuments(filter),
      Template.countDocuments(),
      Template.countDocuments({ metaStatus: "APPROVED" }),
      Template.countDocuments({ metaStatus: "PENDING" }),
      Template.countDocuments({ metaStatus: "REJECTED" }),
      Template.countDocuments({ metaStatus: { $in: ["PAUSED", "DISABLED"] } }),
    ]);

    const approvalRate =
      totalAll > 0 ? ((totalApproved / totalAll) * 100).toFixed(1) : 0;

    return res.status(200).json({
      success: true,
      data: templates,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      summary: {
        total: totalAll,
        approved: totalApproved,
        pending: totalPending,
        rejected: totalRejected,
        paused: totalPaused,
        approvalRate,
      },
    });
  } catch (error) {
    console.error("List All Platform Templates Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch platform templates" });
  }
};

const listAllPlatformWhatsAppAccounts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { search, status, tokenType } = req.query;

    const filter = {};

    if (status === "connected") {
      filter["whatsapp.connected"] = true;
    } else if (status === "disconnected") {
      filter["whatsapp.connected"] = { $ne: true };
    }

    if (tokenType) {
      filter["whatsapp.tokenType"] = tokenType;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { "whatsapp.phoneNumberId": regex },
        { "whatsapp.wabaId": regex },
      ];
    }

    const [
      companies,
      total,
      totalAll,
      totalConnected,
      totalDisconnected,
      totalEmbedded,
      totalManual,
    ] = await Promise.all([
      Company.find(filter)
        .select("-whatsapp.accessToken")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Company.countDocuments(filter),
      Company.countDocuments(),
      Company.countDocuments({ "whatsapp.connected": true }),
      Company.countDocuments({ "whatsapp.connected": { $ne: true } }),
      Company.countDocuments({ "whatsapp.tokenType": "embedded_signup" }),
      Company.countDocuments({ "whatsapp.tokenType": "manual" }),
    ]);

    const companyIds = companies.map((c) => c._id);

    const [messageStats, conversationStats] = await Promise.all([
      Message.aggregate([
        { $match: { companyId: { $in: companyIds } } },
        { $group: { _id: "$companyId", totalMessages: { $sum: 1 } } },
      ]),
      Conversation.aggregate([
        { $match: { companyId: { $in: companyIds } } },
        { $group: { _id: "$companyId", totalConversations: { $sum: 1 } } },
      ]),
    ]);

    const messagesMap = new Map(messageStats.map((m) => [m._id.toString(), m.totalMessages]));
    const conversationsMap = new Map(conversationStats.map((c) => [c._id.toString(), c.totalConversations]));

    const result = companies.map((company) => {
      const id = company._id.toString();
      return {
        ...company,
        statistics: {
          messages: messagesMap.get(id) || 0,
          conversations: conversationsMap.get(id) || 0,
        },
      };
    });

    return res.status(200).json({
      success: true,
      data: result,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      summary: {
        total: totalAll,
        connected: totalConnected,
        disconnected: totalDisconnected,
        embeddedSignup: totalEmbedded,
        manual: totalManual,
      },
    });
  } catch (error) {
    console.error("List All Platform WhatsApp Accounts Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch platform WhatsApp accounts" });
  }
};

const getPlatformAnalyticsOverview = async (req, res) => {
  try {
    const { timeRange = "30d" } = req.query;

    let days = 30;
    if (timeRange === "7d") days = 7;
    else if (timeRange === "90d") days = 90;
    else if (timeRange === "1y") days = 365;
    else if (timeRange === "all") days = 730;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. Subscriptions & Financials (MRR, ARR, ARPU)
    const activeSubscriptions = await Subscription.find({
      status: { $in: ["ACTIVE", "TRIAL"] },
    })
      .populate("planId")
      .lean();

    let mrr = 0;
    let activePaidCount = 0;
    let trialCount = 0;

    activeSubscriptions.forEach((sub) => {
      if (sub.status === "TRIAL") {
        trialCount++;
      } else if (sub.status === "ACTIVE" && sub.planId?.pricing) {
        activePaidCount++;
        if (sub.billingCycle === "yearly" && sub.planId.pricing.yearly) {
          mrr += sub.planId.pricing.yearly / 12;
        } else if (sub.planId.pricing.monthly) {
          mrr += sub.planId.pricing.monthly;
        }
      }
    });

    const arr = mrr * 12;
    const arpu = activePaidCount > 0 ? Math.round(mrr / activePaidCount) : 0;

    // 2. Company growth over last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyCompaniesAgg = await Company.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const companyGrowth = monthlyCompaniesAgg.map((item) => ({
      month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      companies: item.count,
    }));

    // 3. Platform Message Throughput (daily breakdown over time range)
    const dailyMessagesAgg = await Message.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          total: { $sum: 1 },
          sent: {
            $sum: { $cond: [{ $in: ["$status", ["sent", "delivered", "read"]] }, 1, 0] },
          },
          delivered: {
            $sum: { $cond: [{ $in: ["$status", ["delivered", "read"]] }, 1, 0] },
          },
          read: {
            $sum: { $cond: [{ $eq: ["$status", "read"] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const messageThroughput = dailyMessagesAgg.map((item) => ({
      date: item._id,
      sent: item.sent,
      delivered: item.delivered,
      read: item.read,
      failed: item.failed,
      total: item.total,
    }));

    // 4. AI & Automation Intelligence
    const [totalConversations, aiTurnCountAgg, totalMessagesPlatform] = await Promise.all([
      Conversation.countDocuments(),
      Conversation.aggregate([
        { $group: { _id: null, totalTurns: { $sum: "$aiTurnCount" }, avgTurns: { $avg: "$aiTurnCount" } } },
      ]),
      Message.countDocuments(),
    ]);

    const aiMetrics = {
      totalConversations,
      totalAITurns: aiTurnCountAgg[0]?.totalTurns || 0,
      avgTurnsPerConversation: Number((aiTurnCountAgg[0]?.avgTurns || 0).toFixed(1)),
      totalMessages: totalMessagesPlatform,
    };

    return res.status(200).json({
      success: true,
      data: {
        financials: {
          mrr: Math.round(mrr),
          arr: Math.round(arr),
          arpu,
          activePaidSubscriptions: activePaidCount,
          activeTrials: trialCount,
        },
        growth: companyGrowth,
        throughput: messageThroughput,
        ai: aiMetrics,
      },
    });
  } catch (error) {
    console.error("Get Platform Analytics Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load platform analytics" });
  }
};

const listAllPlatformAuditLogs = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const { action, targetModel, search } = req.query;

    const filter = {};

    if (action) {
      filter.action = action;
    }

    if (targetModel) {
      filter.targetModel = targetModel;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { actorName: regex },
        { actorEmail: regex },
        { targetName: regex },
        { action: regex },
      ];
    }

    const [logs, total, totalToday] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
      AuditLog.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      summary: {
        total,
        today: totalToday,
      },
    });
  } catch (error) {
    console.error("List Platform Audit Logs Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
  }
};

const getPlatformSettings = async (req, res) => {
  try {
    let config = await PlatformConfig.findOne({ key: "global_settings" }).lean();

    if (!config) {
      config = await PlatformConfig.create({ key: "global_settings" });
    }

    return res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error("Get Platform Settings Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch platform settings" });
  }
};

const updatePlatformSettings = async (req, res) => {
  try {
    const { groq, onboarding, meta, system } = req.body;

    const update = {};
    if (groq) update.groq = groq;
    if (onboarding) update.onboarding = onboarding;
    if (meta) update.meta = meta;
    if (system) update.system = system;
    if (req.platformUserId) update.updatedBy = req.platformUserId;

    const config = await PlatformConfig.findOneAndUpdate(
      { key: "global_settings" },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    await logAdminAction({
      req,
      action: "PLATFORM_SETTINGS_UPDATED",
      targetModel: "PlatformConfig",
      targetId: config._id,
      targetName: "Global Settings",
      details: req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Platform settings updated successfully",
      data: config,
    });
  } catch (error) {
    console.error("Update Platform Settings Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update platform settings" });
  }
};

module.exports = {
  listCompanies,
  getCompanyDetail,
  getCompanyUsers,
  updateCompanyStatus,
  getPlatformDashboard,
  listAllSubscriptions,
  getCompanyCampaigns,
  getCompanyTemplates,
  getCompanyContactsSummary,
  getCompanyWhatsAppHealth,
  listAllPlatformUsers,
  toggleUserStatus,
  updateUserRolePlatform,
  resetUserPassword,
  listAllPlatformCampaigns,
  listAllPlatformTemplates,
  listAllPlatformWhatsAppAccounts,
  getPlatformAnalyticsOverview,
  listAllPlatformAuditLogs,
  getPlatformSettings,
  updatePlatformSettings,
};
