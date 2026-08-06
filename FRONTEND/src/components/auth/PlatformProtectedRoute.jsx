import { Navigate } from "react-router-dom";
import usePlatformAuthStore from "../../store/platformAuthStore";

function PlatformProtectedRoute({ children }) {
  const platformToken = usePlatformAuthStore((state) => state.platformToken);

  if (!platformToken) {
    return <Navigate to="/platform/login" replace />;
  }

  return children;
}

export default PlatformProtectedRoute;
