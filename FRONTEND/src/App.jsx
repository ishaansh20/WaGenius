import { useEffect } from "react";
import { InboxPage } from "./pages/Inbox/InboxPage";
import CampaignUpload from "./pages/Campaigns/CampaignUpload";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TemplatesPage from "./pages/Templates/TemplatesPage";
import CreateTemplatePage from "./pages/Templates/CreateTemplatePage";
import ApprovedTemplatesLayout from "./pages/Templates/ApprovedTemplatesLayout";
import ApprovedTemplatesList from "./pages/Templates/ApprovedTemplatesList";
import ApprovalsQueue from "./pages/Templates/ApprovalsQueue";
import CreateApprovedTemplatePage from "./pages/Templates/CreateApprovedTemplatePage";
import CampaignHistoryPage from "./pages/Campaigns/CampaignHistoryPage";
import CampaignAnalyticsPage from "./pages/Campaigns/CampaignAnalyticsPage";
import SettingsPage from "./pages/Settings/SettingsPage";
import ContactsPage from "./pages/Contacts/ContactsPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import PlatformDashboardPage from "./pages/Platform/PlatformDashboardPage";
import LoginPage from "./pages/Auth/LoginPage";
import SignupPage from "./pages/Auth/SignupPage";
import PlatformLoginPage from "./pages/Platform/PlatformLoginPage";
import PlatformCompaniesPage from "./pages/Platform/PlatformCompaniesPage";
import PlatformCompanyDetailPage from "./pages/Platform/PlatformCompanyDetailPage";
import PlatformPlansPage from "./pages/Platform/PlatformPlansPage";
import PlatformSubscriptionsPage from "./pages/Platform/PlatformSubscriptionsPage";
import PlatformUsersPage from "./pages/Platform/PlatformUsersPage";
import PlatformCampaignsPage from "./pages/Platform/PlatformCampaignsPage";
import PlatformTemplatesPage from "./pages/Platform/PlatformTemplatesPage";
import PlatformWhatsAppPage from "./pages/Platform/PlatformWhatsAppPage";
import PlatformAnalyticsPage from "./pages/Platform/PlatformAnalyticsPage";
import PlatformAuditLogsPage from "./pages/Platform/PlatformAuditLogsPage";
import PlatformSettingsPage from "./pages/Platform/PlatformSettingsPage";
import PlatformProtectedRoute from "./components/auth/PlatformProtectedRoute";
import PrivacyPolicyPage from "./pages/Legal/PrivacyPolicyPage";
import DataDeletionPage from "./pages/Legal/DataDeletionPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleProtectedRoute from "./components/auth/RoleProtectedRoute";
import HomeRedirect from "./components/auth/HomeRedirect";
import WhatsAppOnboardingPage from "./pages/Onboarding/WhatsAppOnboardingPage";
import BillingPage from "./pages/Billing/BillingPage";
import NotFoundPage from "./pages/NotFound/NotFoundPage";
import useAuthStore from "./store/authStore";
import useSubscriptionStore from "./store/subscriptionStore";

function App() {
  const user = useAuthStore((s) => s.user);
  const loadSubscription = useSubscriptionStore((s) => s.loadSubscription);
  const clearSubscription = useSubscriptionStore((s) => s.clearSubscription);

  // Load the subscription whenever the logged-in user changes.
  // On logout user becomes null and we clear the cached plan.
  useEffect(() => {
    if (user) {
      loadSubscription();
    } else {
      clearSubscription();
    }
  }, [user]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pricing" element={<BillingPage />} />
        <Route
          path="/onboarding/whatsapp"
          element={
            <ProtectedRoute>
              <WhatsAppOnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/whatsapp-onboarding"
          element={
            <ProtectedRoute>
              <WhatsAppOnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/data-deletion" element={<DataDeletionPage />} />
        <Route path="/platform/login" element={<PlatformLoginPage />} />
        <Route
          path="/platform/dashboard"
          element={
            <PlatformProtectedRoute>
              <PlatformDashboardPage />
            </PlatformProtectedRoute>
          }
        />
        <Route
          path="/platform/companies"
          element={
            <PlatformProtectedRoute>
              <PlatformCompaniesPage />
            </PlatformProtectedRoute>
          }
        />
        <Route
          path="/platform/companies/:companyId"
          element={
            <PlatformProtectedRoute>
              <PlatformCompanyDetailPage />
            </PlatformProtectedRoute>
          }
        />
        <Route
          path="/platform/users"
          element={
            <PlatformProtectedRoute>
              <PlatformUsersPage />
            </PlatformProtectedRoute>
          }
        />
        <Route
          path="/platform/campaigns"
          element={
            <PlatformProtectedRoute>
              <PlatformCampaignsPage />
            </PlatformProtectedRoute>
          }
        />
        <Route
          path="/platform/templates"
          element={
            <PlatformProtectedRoute>
              <PlatformTemplatesPage />
            </PlatformProtectedRoute>
          }
        />
        <Route
          path="/platform/whatsapp"
          element={
            <PlatformProtectedRoute>
              <PlatformWhatsAppPage />
            </PlatformProtectedRoute>
          }
        />
        <Route
          path="/platform/analytics"
          element={
            <PlatformProtectedRoute>
              <PlatformAnalyticsPage />
            </PlatformProtectedRoute>
          }
        />
        <Route
          path="/platform/audit-logs"
          element={
            <PlatformProtectedRoute>
              <PlatformAuditLogsPage />
            </PlatformProtectedRoute>
          }
        />
        <Route
          path="/platform/subscriptions"
          element={
            <PlatformProtectedRoute>
              <PlatformSubscriptionsPage />
            </PlatformProtectedRoute>
          }
        />
        <Route
          path="/platform/plans"
          element={
            <PlatformProtectedRoute>
              <PlatformPlansPage />
            </PlatformProtectedRoute>
          }
        />
        <Route
          path="/platform/settings"
          element={
            <PlatformProtectedRoute>
              <PlatformSettingsPage />
            </PlatformProtectedRoute>
          }
        />
        <Route path="/" element={<HomeRedirect />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute
                allowedRoles={["ADMIN", "CAMPAIGN_MANAGER", "TEAM_LEAD"]}
              >
                <DashboardPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inbox"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute
                allowedRoles={["ADMIN", "SUPPORT_AGENT", "TEAM_LEAD"]}
              >
                <InboxPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/upload"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={["ADMIN", "CAMPAIGN_MANAGER"]}>
                <CampaignUpload />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={["ADMIN", "CAMPAIGN_MANAGER"]}>
                <TemplatesPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates/create"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={["ADMIN", "CAMPAIGN_MANAGER"]}>
                <CreateTemplatePage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates/edit/:id"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={["ADMIN", "CAMPAIGN_MANAGER"]}>
                <CreateTemplatePage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates/approved"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={["ADMIN", "CAMPAIGN_MANAGER"]}>
                <ApprovedTemplatesLayout />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<ApprovedTemplatesList category={null} />} />
          <Route
            path="marketing"
            element={<ApprovedTemplatesList category="MARKETING" />}
          />
          <Route
            path="utility"
            element={<ApprovedTemplatesList category="UTILITY" />}
          />
          <Route
            path="authentication"
            element={<ApprovedTemplatesList category="AUTHENTICATION" />}
          />
          <Route path="approvals" element={<ApprovalsQueue />} />
        </Route>
        <Route
          path="/templates/approved/create"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={["ADMIN", "CAMPAIGN_MANAGER"]}>
                <CreateApprovedTemplatePage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/history"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={["ADMIN", "CAMPAIGN_MANAGER"]}>
                <CampaignHistoryPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns/:id/analytics"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute
                allowedRoles={["ADMIN", "CAMPAIGN_MANAGER", "TEAM_LEAD"]}
              >
                <CampaignAnalyticsPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute
                allowedRoles={[
                  "ADMIN",
                  "CAMPAIGN_MANAGER",
                  "SUPPORT_AGENT",
                  "TEAM_LEAD",
                ]}
              >
                <ContactsPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={["ADMIN"]}>
                <BillingPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={["ADMIN"]}>
                <SettingsPage />
              </RoleProtectedRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
