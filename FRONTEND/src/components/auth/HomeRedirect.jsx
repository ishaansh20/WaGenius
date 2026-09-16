import { Navigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import usePlatformAuthStore from "../../store/platformAuthStore";
import { isTokenExpired } from "../../utils/jwt";

export default function HomeRedirect() {
  const user = useAuthStore((state) => state.user);
  const setupStatus = useAuthStore((state) => state.setupStatus);
  const platformToken = usePlatformAuthStore((state) => state.platformToken);
  const platformLogout = usePlatformAuthStore((state) => state.logout);

  // A logged-in company user always wins over a leftover platform token —
  // this is what a normal company login should land on, and it stops a
  // stale (but not-yet-expired) platformToken from an earlier
  // /platform/login on this same browser from hijacking every subsequent
  // normal login.
  if (user) {
    if (setupStatus === "PLAN_SELECTION_REQUIRED") {
      return <Navigate to="/billing" replace />;
    }

    if (
      setupStatus === "WHATSAPP_ONBOARDING_REQUIRED" ||
      setupStatus === "PAYMENT_REQUIRED"
    ) {
      return <Navigate to="/onboarding/whatsapp" replace />;
    }

    switch (user.role) {
      case "ADMIN":
      case "CAMPAIGN_MANAGER":
      case "TEAM_LEAD":
        return <Navigate to="/dashboard" replace />;
      case "SUPPORT_AGENT":
        return <Navigate to="/inbox" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  if (platformToken) {
    if (isTokenExpired(platformToken)) {
      // Stale token past its expiry — clear it instead of trusting it.
      platformLogout();
      return <Navigate to="/platform/login" replace />;
    }
    return <Navigate to="/platform/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}
