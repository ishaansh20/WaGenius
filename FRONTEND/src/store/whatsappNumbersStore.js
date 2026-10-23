import { create } from "zustand";
import {
  fetchWhatsAppNumbers,
  syncWhatsAppNumbers,
  setDefaultWhatsAppNumber,
} from "../services/api";

// How a number is shown everywhere: the real phone number when Meta has told
// us, otherwise a short tail of its id so two numbers are never ambiguous.
export function numberLabel(number) {
  if (!number) return "";
  if (number.displayNumber) return number.displayNumber;
  const id = String(number.phoneNumberId || "");
  return id ? `Number ending ${id.slice(-4)}` : "";
}

// The company's WhatsApp numbers and which one is the default. Everything
// here is per company (the API only ever returns the signed-in company's own
// numbers). Cleared on logout via reset().
const useWhatsAppNumbersStore = create((set, get) => ({
  numbers: [],
  defaultPhoneNumberId: "",
  limit: null,
  canAddMore: false,
  loaded: false,
  loading: false,

  load: async ({ force = false } = {}) => {
    if (get().loading || (get().loaded && !force)) return;
    try {
      set({ loading: true });
      const data = await fetchWhatsAppNumbers();
      set({
        numbers: data.numbers || [],
        defaultPhoneNumberId: data.defaultPhoneNumberId || "",
        limit: data.limit ?? null,
        canAddMore: Boolean(data.canAddMore),
        loaded: true,
      });
    } catch {
      // Leave whatever is cached; the UI degrades to "no number shown".
    } finally {
      set({ loading: false });
    }
  },

  apply: (data) =>
    set({
      numbers: data.numbers || [],
      defaultPhoneNumberId: data.defaultPhoneNumberId || "",
      limit: data.limit ?? null,
      canAddMore: Boolean(data.canAddMore),
      loaded: true,
    }),

  sync: async () => {
    const data = await syncWhatsAppNumbers();
    get().apply(data);
    return data;
  },

  setDefault: async (phoneNumberId) => {
    const data = await setDefaultWhatsAppNumber(phoneNumberId);
    get().apply(data);
    return data;
  },

  getByPhoneNumberId: (phoneNumberId) =>
    get().numbers.find((n) => n.phoneNumberId === phoneNumberId) || null,

  reset: () =>
    set({ numbers: [], defaultPhoneNumberId: "", limit: null, canAddMore: false, loaded: false, loading: false }),
}));

export default useWhatsAppNumbersStore;
