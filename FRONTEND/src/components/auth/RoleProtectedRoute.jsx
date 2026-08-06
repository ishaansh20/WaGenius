import { Navigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";

function getHomeRoute(role) {
  switch (role) {
    case "SUPPORT_AGENT":
      return "/inbox";
    case "ADMIN":
    case "CAMPAIGN_MANAGER":
    case "TEAM_LEAD":
      return "/dashboard";
    default:
      return "/login";
  }
}

function RoleProtectedRoute({ allowedRoles, children }) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  return children;
}

export default RoleProtectedRoute;
