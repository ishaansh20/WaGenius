import { create } from "zustand";
import { resetInboxSocket } from "../services/socket";

const useAuthStore = create((set) => ({
  token: localStorage.getItem("token") || null,

  user: JSON.parse(localStorage.getItem("user")) || null,

  login: ({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    set({
      token,
      user,
    });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    resetInboxSocket();

    set({
      token: null,
      user: null,
    });
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("token");
  },
}));

export default useAuthStore;
