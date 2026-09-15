import { create } from "zustand";
import useAuthStore from "./authStore";

// Separate localStorage keys and a separate store from authStore.js on
// purpose — platform (Super Admin) and company sessions are different
// account types. They DO now clear each other on login (see login()
// below) so a browser can never look logged into both at once — that
// ambiguity was the root cause of company logins landing on the platform
// dashboard. Only the *login* functions cross-clear (not logout — that
// would recurse: authStore.logout() → platformAuthStore.logout() →
// authStore.logout() → ...).
const usePlatformAuthStore = create((set) => ({
  platformToken: localStorage.getItem("platformToken") || null,

  platformUser: JSON.parse(localStorage.getItem("platformUser")) || null,

  login: ({ token, user }) => {
    localStorage.setItem("platformToken", token);
    localStorage.setItem("platformUser", JSON.stringify(user));

    // Clear any active company session properly — through authStore's own
    // logout(), not by touching localStorage directly. This matters: only
    // authStore.logout() also resets the inbox socket and updates the LIVE
    // React state, which a raw localStorage.removeItem() here would miss —
    // leaving a stale in-memory token that useSessionExpiry.js would still
    // be running a timer against, eventually firing a surprise logout on
    // this platform session later for an unrelated reason.
    //
    // Deferred but safe: authStore.js imports this file at the top level,
    // but the cross-call here is inside a function body — Vite resolves both
    // modules fully before login() is ever invoked, so the binding is live.
    useAuthStore.getState().logout();

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
