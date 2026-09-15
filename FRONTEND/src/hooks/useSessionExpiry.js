import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import usePlatformAuthStore from "../store/platformAuthStore";
import { getTokenExpiryMs } from "../utils/jwt";
import { refreshAuthToken } from "../services/api";
import { refreshPlatformAuthToken } from "../services/platformApi";

// If there was any user activity within this window at the moment we're
// about to expire, treat the user as "active" and silently refresh
// instead of logging out. This IS the idle timeout — not a separate
// setting — matching how AWS Console, banking apps, etc. behave: stay
// logged in indefinitely while active, log out after this much silence.
const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// Attempt the refresh this long before actual expiry, so there's time for
// the request to complete (and a little slack for tab-throttling delays)
// before the token would actually become invalid.
const REFRESH_LEAD_MS = 60 * 1000; // 1 minute

const ACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
];

function useActivityTracking() {
  const lastActivityRef = useRef(null);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, markActive, { passive: true }),
    );
    return () =>
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, markActive),
      );
  }, []);

  return lastActivityRef;
}

/**
 * Sliding session: while the user is active, the session silently renews
 * itself shortly before each expiry, so an active user is never logged
 * out. A user idle for IDLE_THRESHOLD_MS gets logged out normally, same
 * as before. Handles both the company session and the platform session
 * independently.
 */
export function useSessionExpiry() {
  const navigate = useNavigate();
  const lastActivityRef = useActivityTracking();

  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const setToken = useAuthStore((s) => s.setToken);

  const platformToken = usePlatformAuthStore((s) => s.platformToken);
  const platformLogout = usePlatformAuthStore((s) => s.logout);
  const setPlatformToken = usePlatformAuthStore((s) => s.setPlatformToken);

  useEffect(() => {
    if (!token) return undefined;

    const expiryMs = getTokenExpiryMs(token);
    const msUntilCheck = expiryMs - Date.now() - REFRESH_LEAD_MS;

    const attemptRefreshOrExpire = async () => {
      const idleFor = Date.now() - lastActivityRef.current;

      if (idleFor < IDLE_THRESHOLD_MS) {
        try {
          const newToken = await refreshAuthToken();
          setToken(newToken);
          // effect re-runs automatically since `token` changed, which
          // reschedules the next check against the new expiry
          return;
        } catch {
          // Refresh genuinely failed (grace period exceeded, network
          // issue, etc.) — fall through to logout below.
        }
      }

      logout();
      toast.error(
        idleFor >= IDLE_THRESHOLD_MS
          ? "You were logged out due to inactivity."
          : "Your session has expired. Please log in again.",
      );
      navigate("/login", { replace: true });
    };

    if (msUntilCheck <= 0) {
      attemptRefreshOrExpire();
      return undefined;
    }

    const timer = setTimeout(attemptRefreshOrExpire, msUntilCheck);
    return () => clearTimeout(timer);
  }, [token]);

  useEffect(() => {
    if (!platformToken) return undefined;

    const expiryMs = getTokenExpiryMs(platformToken);
    const msUntilCheck = expiryMs - Date.now() - REFRESH_LEAD_MS;

    const attemptRefreshOrExpire = async () => {
      const idleFor = Date.now() - lastActivityRef.current;

      if (idleFor < IDLE_THRESHOLD_MS) {
        try {
          const newToken = await refreshPlatformAuthToken();
          setPlatformToken(newToken);
          return;
        } catch {
          // fall through to logout
        }
      }

      platformLogout();
      toast.error(
        idleFor >= IDLE_THRESHOLD_MS
          ? "You were logged out due to inactivity."
          : "Your session has expired. Please log in again.",
      );
      navigate("/platform/login", { replace: true });
    };

    if (msUntilCheck <= 0) {
      attemptRefreshOrExpire();
      return undefined;
    }

    const timer = setTimeout(attemptRefreshOrExpire, msUntilCheck);
    return () => clearTimeout(timer);
  }, [platformToken]);
}
