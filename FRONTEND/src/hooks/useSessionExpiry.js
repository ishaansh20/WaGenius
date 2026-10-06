import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import usePlatformAuthStore from "../store/platformAuthStore";
import { getTokenExpiryMs } from "../utils/jwt";
import { refreshAuthToken } from "../services/api";
import { refreshPlatformAuthToken } from "../services/platformApi";

const LAST_ACTIVITY_KEY = "lastActivityAt";

// AWS Console / banking app standard: stay logged in indefinitely while active,
// but log out immediately after 5 minutes of genuine silence/inactivity.
const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// Attempt silent token refresh this long before actual expiry (defense-in-depth safety net),
// so there is time for network roundtrips before the JWT becomes invalid.
const REFRESH_LEAD_MS = 60 * 1000; // 1 minute

// Public pages a logged-out visitor can be on. When a stale session expires
// while the user is on one of these, it's cleared silently — no toast and no
// redirect to a login screen they never asked for.
const PUBLIC_PATHS = ["/", "/pricing", "/privacy-policy", "/data-deletion", "/login", "/signup", "/platform/login"];

const ACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
];

function useActivityTracking(onActivity) {
  // Seed from localStorage, NOT Date.now() — a fresh Date.now() default
  // would make every page reload/reopen look like "just active" even
  // after days of genuine inactivity, defeating the entire idle check.
  // localStorage survives across tab closes/reopens and page reloads.
  const stored = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
  const lastActivityRef = useRef(
    Number.isFinite(stored) && stored > 0 ? stored : 0,
  );
  const lastWriteRef = useRef(0);
  const onActivityRef = useRef(onActivity);

  useEffect(() => {
    onActivityRef.current = onActivity;
  }, [onActivity]);

  useEffect(() => {
    const markActive = (forceWrite = false) => {
      const now = Date.now();
      lastActivityRef.current = now;

      // Throttle localStorage writes to at most once per second to prevent I/O jank on rapid mousemove
      if (forceWrite === true || now - lastWriteRef.current >= 1000) {
        lastWriteRef.current = now;
        try {
          localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        } catch {
          // ignore storage quota / private browsing errors
        }
        if (onActivityRef.current) {
          onActivityRef.current(now);
        }
      }
    };

    // Don't stamp "active" just because the app mounted — only real
    // activity events should count. If there's truly no prior record
    // (first-ever load), treat that moment as the baseline once.
    if (!lastActivityRef.current) {
      markActive(true);
    }

    // Sync activity across multiple tabs:
    // If the user is active in another tab of this app, update our ref and reset our idle timer.
    const handleStorage = (e) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const val = Number(e.newValue);
        if (Number.isFinite(val) && val > 0) {
          lastActivityRef.current = val;
          if (onActivityRef.current) {
            onActivityRef.current(val);
          }
        }
      }
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, markActive, { passive: true }),
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, markActive),
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return lastActivityRef;
}

/**
 * Sliding session + Precise Idle Logout:
 * 1. Dedicated Idle Timer: Har activity event pe reset hota hai. Agar exactly 5 minute tak
 *    koi activity na ho, turant (immediately) logout kar deta hai — AWS Console / banking app jaisa.
 * 2. Token Silent Refresh: Token expiry se ~1 min pehle defense-in-depth safety-net ke taur pe
 *    silently renew karta hai agar user active raha ho.
 * 3. localStorage Persistence: lastActivityAt persist hoti hai, taaki browser re-open / tab reload
 *    pe purani genuine inactivity detect ho sake aur 2 din baad aane pe session extend na ho.
 */
export function useSessionExpiry() {
  const navigate = useNavigate();

  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const setToken = useAuthStore((s) => s.setToken);

  const platformToken = usePlatformAuthStore((s) => s.platformToken);
  const platformLogout = usePlatformAuthStore((s) => s.logout);
  const setPlatformToken = usePlatformAuthStore((s) => s.setPlatformToken);

  const idleTimerRef = useRef(null);
  const isLoggingOutRef = useRef(false);
  const scheduleIdleCheckRef = useRef(null);

  // Activity callback that safely delegates to scheduleIdleCheckRef
  const handleActivity = useCallback(() => {
    scheduleIdleCheckRef.current?.();
  }, []);

  // Declare lastActivityRef before any callbacks or effects use it
  const lastActivityRef = useActivityTracking(handleActivity);

  const triggerLogout = useCallback(
    (isIdle = true) => {
      if (isLoggingOutRef.current) return;

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      const currentToken = useAuthStore.getState().token;
      const currentPlatformToken = usePlatformAuthStore.getState().platformToken;

      if (!currentToken && !currentPlatformToken) return;

      isLoggingOutRef.current = true;
      try {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      } catch {
        // ignore
      }

      if (PUBLIC_PATHS.includes(window.location.pathname)) {
        if (currentPlatformToken) platformLogout();
        if (currentToken) logout();
      } else if (currentPlatformToken) {
        platformLogout();
        toast.error(
          isIdle
            ? "You were logged out due to inactivity."
            : "Your session has expired. Please log in again.",
        );
        navigate("/platform/login", { replace: true });
      } else if (currentToken) {
        logout();
        toast.error(
          isIdle
            ? "You were logged out due to inactivity."
            : "Your session has expired. Please log in again.",
        );
        navigate("/login", { replace: true });
      }

      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 1000);
    },
    [navigate, logout, platformLogout],
  );

  const scheduleIdleCheck = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    const currentToken = useAuthStore.getState().token;
    const currentPlatformToken = usePlatformAuthStore.getState().platformToken;
    if (!currentToken && !currentPlatformToken) return;

    const lastActivity =
      Number(localStorage.getItem(LAST_ACTIVITY_KEY)) ||
      lastActivityRef.current ||
      Date.now();
    const idleFor = Date.now() - lastActivity;
    const remainingMs = IDLE_THRESHOLD_MS - idleFor;

    if (remainingMs <= 0) {
      triggerLogout(true);
      return;
    }

    idleTimerRef.current = setTimeout(() => {
      const liveLastActivity =
        Number(localStorage.getItem(LAST_ACTIVITY_KEY)) ||
        lastActivityRef.current ||
        0;
      const currentIdleFor = Date.now() - liveLastActivity;
      if (currentIdleFor >= IDLE_THRESHOLD_MS) {
        triggerLogout(true);
      } else {
        scheduleIdleCheckRef.current?.();
      }
    }, remainingMs);
  }, [triggerLogout, lastActivityRef]);

  useEffect(() => {
    scheduleIdleCheckRef.current = scheduleIdleCheck;
  }, [scheduleIdleCheck]);

  // 1. Dedicated Idle Timer & Focus/Visibility watcher
  useEffect(() => {
    if (!token && !platformToken) return undefined;

    scheduleIdleCheck();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        scheduleIdleCheck();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [token, platformToken, scheduleIdleCheck]);

  // 2. Company token silent refresh (safety net / sliding renewal)
  useEffect(() => {
    if (!token) return undefined;

    const expiryMs = getTokenExpiryMs(token);
    const msUntilCheck = expiryMs - Date.now() - REFRESH_LEAD_MS;

    const attemptRefreshOrExpire = async () => {
      const lastActivity =
        Number(localStorage.getItem(LAST_ACTIVITY_KEY)) ||
        lastActivityRef.current ||
        0;
      const idleFor = Date.now() - lastActivity;

      if (idleFor < IDLE_THRESHOLD_MS) {
        try {
          const newToken = await refreshAuthToken();
          setToken(newToken);
          return;
        } catch {
          // Refresh failed (network error, revoked refresh, etc.)
        }
      }

      triggerLogout(idleFor >= IDLE_THRESHOLD_MS);
    };

    if (msUntilCheck <= 0) {
      attemptRefreshOrExpire();
      return undefined;
    }

    const timer = setTimeout(attemptRefreshOrExpire, msUntilCheck);
    return () => clearTimeout(timer);
  }, [token, setToken, triggerLogout, lastActivityRef]);

  // 3. Platform token silent refresh (safety net / sliding renewal)
  useEffect(() => {
    if (!platformToken) return undefined;

    const expiryMs = getTokenExpiryMs(platformToken);
    const msUntilCheck = expiryMs - Date.now() - REFRESH_LEAD_MS;

    const attemptRefreshOrExpire = async () => {
      const lastActivity =
        Number(localStorage.getItem(LAST_ACTIVITY_KEY)) ||
        lastActivityRef.current ||
        0;
      const idleFor = Date.now() - lastActivity;

      if (idleFor < IDLE_THRESHOLD_MS) {
        try {
          const newToken = await refreshPlatformAuthToken();
          setPlatformToken(newToken);
          return;
        } catch {
          // Refresh failed
        }
      }

      triggerLogout(idleFor >= IDLE_THRESHOLD_MS);
    };

    if (msUntilCheck <= 0) {
      attemptRefreshOrExpire();
      return undefined;
    }

    const timer = setTimeout(attemptRefreshOrExpire, msUntilCheck);
    return () => clearTimeout(timer);
  }, [platformToken, setPlatformToken, triggerLogout, lastActivityRef]);
}
