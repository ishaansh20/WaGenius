import { create } from "zustand";

const STORAGE_KEY = "ui.sidebarCollapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// Purely presentational preferences (no auth/business state here).
const useUiStore = create((set, get) => ({
  sidebarCollapsed: readCollapsed(),

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Preference just won't persist.
    }
    set({ sidebarCollapsed: next });
  },
}));

export const SIDEBAR_WIDTH = { expanded: 256, collapsed: 76 };

// Tailwind class that offsets page content by the desktop sidebar width.
export function useSidebarOffset() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  return collapsed ? "lg:pl-[76px]" : "lg:pl-[256px]";
}

export default useUiStore;
