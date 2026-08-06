import { Navigate } from "react-router-dom";
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
import LoginPage from "./pages/Auth/LoginPage";
import SignupPage from "./pages/Auth/SignupPage";
import PlatformLoginPage from "./pages/Platform/PlatformLoginPage";
import PlatformCompaniesPage from "./pages/Platform/PlatformCompaniesPage";
import PlatformProtectedRoute from "./components/auth/PlatformProtectedRoute";
import PrivacyPolicyPage from "./pages/Legal/PrivacyPolicyPage";
import DataDeletionPage from "./pages/Legal/DataDeletionPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleProtectedRoute from "./components/auth/RoleProtectedRoute";
import HomeRedirect from "./components/auth/HomeRedirect";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/data-deletion" element={<DataDeletionPage />} />
        <Route path="/platform/login" element={<PlatformLoginPage />} />
        <Route
          path="/platform/companies"
          element={
            <PlatformProtectedRoute>
              <PlatformCompaniesPage />
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
          <Route path="marketing" element={<ApprovedTemplatesList category="MARKETING" />} />
          <Route path="utility" element={<ApprovedTemplatesList category="UTILITY" />} />
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
                allowedRoles={["ADMIN", "CAMPAIGN_MANAGER", "SUPPORT_AGENT", "TEAM_LEAD"]}
              >
                <ContactsPage />
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
