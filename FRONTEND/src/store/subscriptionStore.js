import { create } from "zustand";
import { fetchPlanAccess, fetchMySubscription } from "../services/api";
import useAuthStore from "./authStore";

/**
 * Central Subscription & Plan Store:
 * Single source of truth for the company's active plan,
 * setupStatus, feature flags, limits, and live resource usage.
 */
const useSubscriptionStore = create((set, get) => ({
  subscription: null,
  plan: null,
  setupStatus: null,
  limits: {
    users: 1,
    contacts: 500,
    campaigns: -1, // Unlimited broadcast campaign sending
    templates: 5,
    whatsappNumbers: 1,
  },
  features: {
    whatsapp: true,
    contactImport: false,
    contactExport: false,
    advancedSegmentation: false,
    campaignSchedule: false,
    campaignPauseResume: false,
    ai: false,
    advancedAnalytics: false,
    analyticsExport: false,
    teamManagement: false,
    api: false,
    customWebhooks: false,
  },
  usage: {
    contacts: 0,
    campaigns: 0,
    templates: 0,
    users: 0,
    whatsappNumbers: 0,
  },
  loading: false,

  loadSubscription: async () => {
    try {
      set({ loading: true });
      const res = await fetchPlanAccess();
      const data = res.data || {};
      const status = data.setupStatus || null;
      if (status) {
        useAuthStore.getState().setSetupStatus(status);
      }
      set({
        subscription: data.subscription || null,
        plan: data.plan || null,
        setupStatus: status,
        limits: data.limits || get().limits,
        features: data.features || get().features,
        usage: data.usage || get().usage,
      });
    } catch {
      try {
        // Fallback to basic subscription endpoint if needed
        const subRes = await fetchMySubscription();
        const sub = subRes.data || null;
        set({
          subscription: sub,
          plan: sub?.planId || null,
          limits: sub?.planId?.limits || get().limits,
          features: sub?.planId?.features || get().features,
        });
      } catch {
        set({ subscription: null, plan: null });
      }
    } finally {
      set({ loading: false });
    }
  },

  clearSubscription: () =>
    set({
      subscription: null,
      plan: null,
      setupStatus: null,
      limits: {
        users: 1,
        contacts: 500,
        campaigns: -1,
        templates: 5,
        whatsappNumbers: 1,
      },
      features: {
        whatsapp: true,
        contactImport: false,
        contactExport: false,
        advancedSegmentation: false,
        campaignSchedule: false,
        campaignPauseResume: false,
        ai: false,
        advancedAnalytics: false,
        analyticsExport: false,
        teamManagement: false,
        api: false,
        customWebhooks: false,
      },
      usage: {
        contacts: 0,
        campaigns: 0,
        templates: 0,
        users: 0,
        whatsappNumbers: 0,
      },
    }),

  /**
   * Returns true if the company's active plan has the given feature enabled.
   */
  canUse: (featureKey) => {
    const features = get().features;
    return features?.[featureKey] === true;
  },

  /**
   * Returns the numeric limit for the given resource.
   */
  getLimit: (limitKey) => {
    const limits = get().limits;
    return limits?.[limitKey] ?? 0;
  },

  /**
   * Returns the current live count for the given resource.
   */
  getUsage: (resourceKey) => {
    const usage = get().usage;
    return usage?.[resourceKey] ?? 0;
  },

  /**
   * Returns true if current usage is at or exceeds the resource quota.
   */
  hasReachedLimit: (resourceKey) => {
    if (resourceKey === "campaigns") return false; // Always unlimited campaign sending
    const limit = get().getLimit(resourceKey);
    const count = get().getUsage(resourceKey);
    if (limit === -1) return false; // unlimited
    return count >= limit;
  },

  isEnterprise: () => {
    return !!get().plan?.isEnterprise;
  },
}));

export default useSubscriptionStore;
