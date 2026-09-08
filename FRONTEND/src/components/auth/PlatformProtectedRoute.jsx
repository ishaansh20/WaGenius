import { Navigate } from "react-router-dom";
import usePlatformAuthStore from "../../store/platformAuthStore";

function PlatformProtectedRoute({ children }) {
  const platformToken = usePlatformAuthStore((state) => state.platformToken);

  console.log("PLATFORM PROTECTED ROUTE:", platformToken);

  // Also verify the actual browser storage.
  const storedToken = localStorage.getItem("platformToken");

  console.log("PLATFORM LOCAL STORAGE TOKEN:", storedToken);

  if (!platformToken && !storedToken) {
    return <Navigate to="/platform/login" replace />;
  }

  return children;
}

export default PlatformProtectedRoute;
