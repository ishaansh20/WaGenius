function decodeTokenPayload(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

/**
 * Returns true if a JWT is missing, malformed, or past its exp claim.
 * Used to stop the app from trusting a stale token that's merely still
 * present in localStorage but no longer actually valid.
 */
export function isTokenExpired(token) {
  if (!token) return true;
  const payload = decodeTokenPayload(token);
  if (!payload) return true;
  if (!payload.exp) return false; // no exp claim — treat as non-expiring
  return Date.now() >= payload.exp * 1000;
}

/**
 * Returns the absolute timestamp (ms since epoch) at which this token
 * expires. Returns Infinity if the token has no exp claim or can't be
 * decoded, so callers don't accidentally schedule an immediate logout
 * for a malformed token — isTokenExpired() is the source of truth for
 * "is this token currently valid", this is only for scheduling the
 * auto-logout timer.
 */
export function getTokenExpiryMs(token) {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return Infinity;
  return payload.exp * 1000;
}
