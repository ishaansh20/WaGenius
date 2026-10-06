import { isTokenExpired } from "./jwt";

// Where a company user should land given their setup status and role.
// Previously this lived in the "/" redirect; "/" is now the public home page.
export function getCompanyHomePath(user, setupStatus) {
  if (setupStatus === "PLAN_SELECTION_REQUIRED") return "/billing";
  if (setupStatus === "WHATSAPP_ONBOARDING_REQUIRED" || setupStatus === "PAYMENT_REQUIRED") {
    return "/onboarding/whatsapp";
  }

  switch (user?.role) {
    case "ADMIN":
    case "CAMPAIGN_MANAGER":
    case "TEAM_LEAD":
      return "/dashboard";
    case "SUPPORT_AGENT":
      return "/inbox";
    default:
      return "/login";
  }
}

// The app entry for whoever is signed in on this browser, or null.
// Only a present, unexpired token counts — a leftover `user` object alone
// must never be treated as a session. Company sessions win over platform.
export function getActiveSessionPath({ token, user, setupStatus, platformToken }) {
  if (token && user && !isTokenExpired(token)) {
    return { path: getCompanyHomePath(user, setupStatus), label: "Open dashboard" };
  }
  if (platformToken && !isTokenExpired(platformToken)) {
    return { path: "/platform/dashboard", label: "Open admin console" };
  }
  return null;
}
