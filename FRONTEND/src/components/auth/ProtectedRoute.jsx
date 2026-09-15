import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import useAuthStore from "../../store/authStore";
import { fetchCompanySetupStatus } from "../../services/api";

function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  const setupStatus = useAuthStore((state) => state.setupStatus);
  const setSetupStatus = useAuthStore((state) => state.setSetupStatus);
  const location = useLocation();
  const [verifying, setVerifying] = useState(!setupStatus && !!token);

  useEffect(() => {
    let isMounted = true;
    async function verifyStatus() {
      if (token && !setupStatus) {
        try {
          const data = await fetchCompanySetupStatus();
          if (isMounted && data?.setupStatus) {
            setSetupStatus(data.setupStatus);
          }
        } catch (err) {
          console.error("Failed to verify setup status:", err);
        } finally {
          if (isMounted) setVerifying(false);
        }
      } else {
        setVerifying(false);
      }
    }

    verifyStatus();
    return () => {
      isMounted = false;
    };
  }, [token, setupStatus, setSetupStatus]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
      </div>
    );
  }

  const path = location.pathname;

  // State 1: PLAN_SELECTION_REQUIRED -> Only /billing and /pricing allowed
  if (setupStatus === "PLAN_SELECTION_REQUIRED") {
    const isBillingPath =
      path.startsWith("/billing") || path.startsWith("/pricing");
    if (!isBillingPath) {
      toast("Please select a subscription plan before continuing.", {
        id: "plan-required-toast",
        icon: "💳",
      });
      return <Navigate to="/billing" replace />;
    }
  }

  // State 2: WHATSAPP_ONBOARDING_REQUIRED -> Allowed: /billing, /pricing, /onboarding, /whatsapp-onboarding
  if (setupStatus === "WHATSAPP_ONBOARDING_REQUIRED") {
    const isAllowed =
      path.startsWith("/billing") ||
      path.startsWith("/pricing") ||
      path.startsWith("/onboarding") ||
      path.startsWith("/whatsapp-onboarding");

    if (!isAllowed) {
      toast("Connect your WhatsApp Business account to complete setup.", {
        id: "wa-required-toast",
        icon: "📱",
      });
      return <Navigate to="/onboarding/whatsapp" replace />;
    }
  }

  // State 3: PAYMENT_REQUIRED -> Same allowed paths as WhatsApp onboarding —
  // the payment-method prompt lives on that same page (see
  // WhatsAppOnboardingPage.jsx), since that's the natural place a company
  // that already connected WhatsApp lands to finish the rest of setup.
  if (setupStatus === "PAYMENT_REQUIRED") {
    const isAllowed =
      path.startsWith("/billing") ||
      path.startsWith("/pricing") ||
      path.startsWith("/onboarding") ||
      path.startsWith("/whatsapp-onboarding");

    if (!isAllowed) {
      toast(
        "Add a payment method to your WhatsApp Business Account to continue.",
        { id: "payment-required-toast", icon: "💳" },
      );
      return <Navigate to="/onboarding/whatsapp" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
