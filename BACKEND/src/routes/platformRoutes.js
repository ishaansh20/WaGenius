const express = require("express");

const { platformLogin, refreshPlatformToken } = require("../controllers/authController");
const {
  getPlatformDashboard,
  listCompanies,
  getCompanyDetail,
  getCompanyUsers,
  updateCompanyStatus,
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
} = require("../controllers/platformController");
const {
  listAllPlans,
  createPlan,
  updatePlan,
  togglePlanStatus,
} = require("../controllers/planController");
const {
  getCompanySubscription,
  updateCompanySubscription,
} = require("../controllers/subscriptionController");
const {
  verifyPlatformToken,
  verifyPlatformTokenWithGrace,
} = require("../middlewares/platformAuthMiddleware");
const { requirePlatformRole } = require("../middlewares/requirePlatformRole");

const router = express.Router();

// Separate login surface from /api/auth/login — see authController.js's
// platformLogin for the strict-separation reasoning.
router.post("/auth/login", platformLogin);
router.post(
  "/auth/refresh",
  verifyPlatformTokenWithGrace,
  refreshPlatformToken,
);

router.get(
  "/dashboard",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  getPlatformDashboard,
);

router.get(
  "/companies",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  listCompanies,
);
router.get(
  "/companies/:id",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  getCompanyDetail,
);

router.get(
  "/companies/:id/users",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  getCompanyUsers,
);

// Global User Directory (Super Admin)
router.get(
  "/users",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  listAllPlatformUsers,
);
router.patch(
  "/users/:id/status",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  toggleUserStatus,
);
router.patch(
  "/users/:id/role",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  updateUserRolePlatform,
);
router.post(
  "/users/:id/reset-password",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  resetUserPassword,
);

// Cross-Tenant Broadcasts Queue
router.get(
  "/campaigns",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  listAllPlatformCampaigns,
);

// Cross-Tenant Templates Feed
router.get(
  "/templates",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  listAllPlatformTemplates,
);

// Multi-Tenant WhatsApp Accounts Monitor
router.get(
  "/whatsapp",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  listAllPlatformWhatsAppAccounts,
);

router.get(
  "/companies/:id/campaigns",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  getCompanyCampaigns,
);

router.get(
  "/companies/:id/templates",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  getCompanyTemplates,
);

router.get(
  "/companies/:id/contacts-summary",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  getCompanyContactsSummary,
);

router.get(
  "/companies/:id/whatsapp-health",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  getCompanyWhatsAppHealth,
);

router.patch(
  "/companies/:id/status",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  updateCompanyStatus,
);

// Plans (Super Admin CRUD)
router.get(
  "/plans",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  listAllPlans,
);
router.post(
  "/plans",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  createPlan,
);
router.patch(
  "/plans/:id",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  updatePlan,
);
router.patch(
  "/plans/:id/toggle-status",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  togglePlanStatus,
);

// Subscriptions (Super Admin global view)
router.get(
  "/subscriptions",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  listAllSubscriptions,
);

// Company subscription (Super Admin view/override)
router.get(
  "/companies/:id/subscription",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  getCompanySubscription,
);
router.patch(
  "/companies/:id/subscription",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  updateCompanySubscription,
);

// SaaS Analytics
router.get(
  "/analytics/overview",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  getPlatformAnalyticsOverview,
);

// Immutable Audit Logs
router.get(
  "/audit-logs",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  listAllPlatformAuditLogs,
);

// Platform System Settings
router.get(
  "/settings",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  getPlatformSettings,
);
router.put(
  "/settings",
  verifyPlatformToken,
  requirePlatformRole(["SUPER_ADMIN"]),
  updatePlatformSettings,
);

module.exports = router;
