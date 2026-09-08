import { create } from "zustand";
import { resetInboxSocket } from "../services/socket";

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
