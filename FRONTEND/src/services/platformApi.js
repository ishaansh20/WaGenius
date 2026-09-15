import axios from "axios";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
// Separate axios instance from services/api.js — reads platformToken, never
// the company token, and 401s redirect back to /platform/login, never
// /login. Keeps the two sessions from ever bleeding into each other.
const platformApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

platformApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("platformToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

platformApi.interceptors.response.use(
  (response) => response,

  (error) => {
    const isLoginRequest = error.config?.url?.includes(
      "/api/platform/auth/login",
    );

    // A 401 from the LOGIN endpoint itself just means "wrong credentials" —
    // that's an ordinary failed-login response the form's own catch block
    // already handles with a toast (see PlatformLoginPage.jsx). It is NOT
    // a session expiring, so it must never trigger the hard reload below —
    // doing so was forcing a full page reload on every failed login
    // attempt, which is also what was triggering Chrome's "password found
    // in a data breach" dialog to reappear on every retry.
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem("platformToken");
      localStorage.removeItem("platformUser");

      if (!window.location.pathname.startsWith("/platform/login")) {
        toast.error("Your session has expired. Please log in again.");
      }

      window.location.href = "/platform/login";
      return Promise.reject(error);
    }

    console.error("PLATFORM API ERROR:", {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });

    return Promise.reject(error);
  },
);
export async function platformLogin(payload) {
  const { data } = await platformApi.post("/api/platform/auth/login", payload);

  console.log("PLATFORM LOGIN API RESPONSE:", data);

  return data;
}
export async function fetchPlatformDashboard() {
  const { data } = await platformApi.get("/api/platform/dashboard");
  return data;
}

export async function fetchCompanies() {
  const { data } = await platformApi.get("/api/platform/companies");
  return data;
}

export async function fetchCompanyDetail(id) {
  const { data } = await platformApi.get(`/api/platform/companies/${id}`);
  return data;
}

export async function fetchCompanyUsers(id) {
  const { data } = await platformApi.get(`/api/platform/companies/${id}/users`);
  return data;
}

export async function updateCompanyStatus(id, status) {
  const { data } = await platformApi.patch(
    `/api/platform/companies/${id}/status`,
    { status },
  );
  return data;
}

export async function fetchAllPlans() {
  const { data } = await platformApi.get("/api/platform/plans");
  return data;
}

export async function createPlan(payload) {
  const { data } = await platformApi.post("/api/platform/plans", payload);
  return data;
}

export async function updatePlan(id, payload) {
  const { data } = await platformApi.patch(`/api/platform/plans/${id}`, payload);
  return data;
}

export async function togglePlanStatus(id) {
  const { data } = await platformApi.patch(`/api/platform/plans/${id}/toggle-status`);
  return data;
}

export async function fetchAllSubscriptions() {
  const { data } = await platformApi.get("/api/platform/subscriptions");
  return data;
}

export async function fetchCompanySubscription(id) {
  const { data } = await platformApi.get(`/api/platform/companies/${id}/subscription`);
  return data;
}

export async function updateCompanySubscription(id, payload) {
  const { data } = await platformApi.patch(
    `/api/platform/companies/${id}/subscription`,
    payload,
  );
  return data;
}

export async function fetchCompanyCampaigns(id, page = 1, limit = 20) {
  const { data } = await platformApi.get(`/api/platform/companies/${id}/campaigns`, {
    params: { page, limit },
  });
  return data;
}

export async function fetchCompanyTemplates(id) {
  const { data } = await platformApi.get(`/api/platform/companies/${id}/templates`);
  return data;
}

export async function fetchCompanyContactsSummary(id) {
  const { data } = await platformApi.get(`/api/platform/companies/${id}/contacts-summary`);
  return data;
}

export async function fetchCompanyWhatsAppHealth(id) {
  const { data } = await platformApi.get(`/api/platform/companies/${id}/whatsapp-health`);
  return data;
}

export async function fetchAllPlatformUsers(params = {}) {
  const { data } = await platformApi.get("/api/platform/users", { params });
  return data;
}

export async function toggleUserStatusPlatform(userId, isActive) {
  const { data } = await platformApi.patch(`/api/platform/users/${userId}/status`, {
    isActive,
  });
  return data;
}

export async function updateUserRolePlatform(userId, role) {
  const { data } = await platformApi.patch(`/api/platform/users/${userId}/role`, {
    role,
  });
  return data;
}

export async function resetUserPasswordPlatform(userId, password) {
  const { data } = await platformApi.post(`/api/platform/users/${userId}/reset-password`, {
    password,
  });
  return data;
}

export async function fetchAllPlatformCampaigns(params = {}) {
  const { data } = await platformApi.get("/api/platform/campaigns", { params });
  return data;
}

export async function fetchAllPlatformTemplates(params = {}) {
  const { data } = await platformApi.get("/api/platform/templates", { params });
  return data;
}

export async function fetchAllPlatformWhatsAppAccounts(params = {}) {
  const { data } = await platformApi.get("/api/platform/whatsapp", { params });
  return data;
}

export async function fetchPlatformAnalytics(timeRange = "30d") {
  const { data } = await platformApi.get("/api/platform/analytics/overview", {
    params: { timeRange },
  });
  return data;
}

export async function fetchPlatformAuditLogs(params = {}) {
  const { data } = await platformApi.get("/api/platform/audit-logs", { params });
  return data;
}

export async function fetchPlatformSettings() {
  const { data } = await platformApi.get("/api/platform/settings");
  return data;
}

export async function updatePlatformSettings(payload) {
  const { data } = await platformApi.put("/api/platform/settings", payload);
  return data;
}

export default platformApi;
