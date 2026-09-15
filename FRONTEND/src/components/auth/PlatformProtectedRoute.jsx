import { Navigate } from "react-router-dom";
import usePlatformAuthStore from "../../store/platformAuthStore";
import { isTokenExpired } from "../../utils/jwt";

function PlatformProtectedRoute({ children }) {
  const platformToken = usePlatformAuthStore((state) => state.platformToken);
  const platformLogout = usePlatformAuthStore((state) => state.logout);

  // Presence alone isn't enough — a stale/expired token must not grant
  // access just because it's still sitting in localStorage. Typing
  // /platform/dashboard directly into the URL bar with an old token now
  // correctly bounces to /platform/login instead of rendering the page.
  if (!platformToken || isTokenExpired(platformToken)) {
    platformLogout();
    return <Navigate to="/platform/login" replace />;
  }

  return children;
}

export default PlatformProtectedRoute;
