import { Navigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";

export default function HomeRedirect() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
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
