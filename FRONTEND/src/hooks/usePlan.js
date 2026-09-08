import useSubscriptionStore from "../store/subscriptionStore";

/**
 * Convenient Plan & Subscription hook for any React component.
 *
 * @example
 *   const { canUse, getLimit, getUsage, hasReachedLimit, plan } = usePlan();
 *
 *   // Disable or hide feature if locked
 *   {canUse("contactImport") ? <ImportButton /> : <UpgradePrompt feature="Import" />}
 */
export default function usePlan() {
  const plan            = useSubscriptionStore((s) => s.plan);
  const subscription    = useSubscriptionStore((s) => s.subscription);
  const limits          = useSubscriptionStore((s) => s.limits);
  const features        = useSubscriptionStore((s) => s.features);
  const usage           = useSubscriptionStore((s) => s.usage);
  const canUse          = useSubscriptionStore((s) => s.canUse);
  const getLimit        = useSubscriptionStore((s) => s.getLimit);
  const getUsage        = useSubscriptionStore((s) => s.getUsage);
  const hasReachedLimit = useSubscriptionStore((s) => s.hasReachedLimit);
  const isEnterprise    = useSubscriptionStore((s) => s.isEnterprise);
  const loadSubscription = useSubscriptionStore((s) => s.loadSubscription);

  return {
    plan,
    subscription,
    limits,
    features,
    usage,
    canUse,
    getLimit,
    getUsage,
    hasReachedLimit,
    isEnterprise,
    loadSubscription,
  };
}
