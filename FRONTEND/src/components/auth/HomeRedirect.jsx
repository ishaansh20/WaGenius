import { Navigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import usePlatformAuthStore from "../../store/platformAuthStore";

export default function HomeRedirect() {
  const user = useAuthStore((state) => state.user);
  const setupStatus = useAuthStore((state) => state.setupStatus);
  const platformToken = usePlatformAuthStore((state) => state.platformToken);

  if (platformToken) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (setupStatus === "PLAN_SELECTION_REQUIRED") {
    return <Navigate to="/billing" replace />;
  }

  if (setupStatus === "WHATSAPP_ONBOARDING_REQUIRED") {
    return <Navigate to="/onboarding/whatsapp" replace />;
  }

  switch (user.role) {
    case "ADMIN":
      return <Navigate to="/dashboard" replace />;

    case "CAMPAIGN_MANAGER":
      return <Navigate to="/dashboard" replace />;

    case "TEAM_LEAD":
      return <Navigate to="/dashboard" replace />;

    case "SUPPORT_AGENT":
      return <Navigate to="/inbox" replace />;

    default:
      return <Navigate to="/login" replace />;
  }
}
