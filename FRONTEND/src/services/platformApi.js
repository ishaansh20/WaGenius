import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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
    if (error.response?.status === 401) {
      localStorage.removeItem("platformToken");
      localStorage.removeItem("platformUser");

      window.location.href = "/platform/login";
    }

    return Promise.reject(error);
  },
);

export async function platformLogin(payload) {
  const { data } = await platformApi.post("/api/platform/auth/login", payload);
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

export async function updateCompanyStatus(id, status) {
  const { data } = await platformApi.patch(`/api/platform/companies/${id}/status`, { status });
  return data;
}

export default platformApi;
