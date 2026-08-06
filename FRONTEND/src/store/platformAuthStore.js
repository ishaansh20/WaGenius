import { create } from "zustand";

// Deliberately separate localStorage keys and a separate store from
// authStore.js — a platform (Super Admin) session must never share
// storage with a company session, per the strict-separation design. Logging
// into one never touches or clears the other, even in the same browser.
const usePlatformAuthStore = create((set) => ({
  platformToken: localStorage.getItem("platformToken") || null,

  platformUser: JSON.parse(localStorage.getItem("platformUser")) || null,

  login: ({ token, user }) => {
    localStorage.setItem("platformToken", token);
    localStorage.setItem("platformUser", JSON.stringify(user));

    set({
      platformToken: token,
      platformUser: user,
    });
  },

  logout: () => {
    localStorage.removeItem("platformToken");
    localStorage.removeItem("platformUser");

    set({
      platformToken: null,
      platformUser: null,
    });
  },
}));

export default usePlatformAuthStore;
