import { create } from "zustand";
import { resetInboxSocket } from "../services/socket";
import usePlatformAuthStore from "./platformAuthStore";

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem("token") || null,

  user: JSON.parse(localStorage.getItem("user")) || null,

  setupStatus: localStorage.getItem("setupStatus") || null,

  login: ({ token, user, setupStatus }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    if (setupStatus) {
      localStorage.setItem("setupStatus", setupStatus);
    }

    // A browser must never look logged in as both a company user and a
    // platform admin at once — this is what actually fixes the bug, not
    // just the redirect-order patch above. Without this, the very next
    // platform login on this machine would silently re-trigger the issue.
    usePlatformAuthStore.getState().logout();

    set({
      token,
      user,
      setupStatus: setupStatus || get().setupStatus,
    });
  },

  setSetupStatus: (status) => {
    if (status) {
      localStorage.setItem("setupStatus", status);
    } else {
      localStorage.removeItem("setupStatus");
    }
    set({ setupStatus: status });
  },

  // Silently swaps in a fresh token without touching user/setupStatus or
  // triggering any cross-store clearing — used only by the sliding-session
  // refresh flow, which is a background token renewal, not a new login.
  setToken: (token) => {
    localStorage.setItem("token", token);
    set({ token });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("setupStatus");
    resetInboxSocket();

    set({
      token: null,
      user: null,
      setupStatus: null,
    });
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("token");
  },
}));

export default useAuthStore;
