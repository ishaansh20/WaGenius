import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import usePlatformAuthStore from "../store/platformAuthStore";
import { getTokenExpiryMs } from "../utils/jwt";

/**
 * Schedules an automatic logout at the exact moment the current session's
 * JWT expires (30 minutes from login, per JWT_EXPIRES_IN) — not just when
 * the next API call happens to fail. Handles both the company session and
 * the platform session independently, since a browser could in principle
 * be sitting on either kind of login page when its token runs out.
 */
export function useSessionExpiry() {
  const navigate = useNavigate();

  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  const platformToken = usePlatformAuthStore((s) => s.platformToken);
  const platformLogout = usePlatformAuthStore((s) => s.logout);

  useEffect(() => {
    if (!token) return undefined;

    const msLeft = getTokenExpiryMs(token) - Date.now();

    if (msLeft <= 0) {
      logout();
      navigate("/login", { replace: true });
      return undefined;
    }

    const timer = setTimeout(() => {
      logout();
      toast.error("Your session has expired. Please log in again.");
      navigate("/login", { replace: true });
    }, msLeft);

    return () => clearTimeout(timer);
  }, [token]);

  useEffect(() => {
    if (!platformToken) return undefined;

    const msLeft = getTokenExpiryMs(platformToken) - Date.now();

    if (msLeft <= 0) {
      platformLogout();
      navigate("/platform/login", { replace: true });
      return undefined;
    }

    const timer = setTimeout(() => {
      platformLogout();
      toast.error("Your session has expired. Please log in again.");
      navigate("/platform/login", { replace: true });
    }, msLeft);

    return () => clearTimeout(timer);
  }, [platformToken]);
}
