const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 429 (rate limit) and 5xx are worth retrying; a plain 4xx (invalid
// template, bad phone number, bad auth) means the request itself was
// wrong and retrying won't change the outcome. No `error.response` at all
// means the request never got a response (timeout, DNS failure, dropped
// connection) — also worth retrying.
const isRetryableError = (error) => {
  const status = error.response?.status;
  if (!status) return true;
  if (status === 429) return true;
  return status >= 500 && status < 600;
};

// Meta's 429s can carry a Retry-After header (seconds) telling you exactly
// how long to back off; fall back to exponential backoff (1s, 2s, 4s, ...)
// for everything else retryable.
const resolveDelayMs = (error, attempt, baseDelayMs) => {
  const retryAfter = error.response?.headers?.["retry-after"];
  if (retryAfter && !Number.isNaN(Number(retryAfter))) {
    return Number(retryAfter) * 1000;
  }
  return baseDelayMs * 2 ** (attempt - 1);
};

// Wraps a single async network call with retry-on-transient-failure. Used
// around the individual WhatsApp send calls so one rate-limit response or
// network blip doesn't permanently fail a campaign contact that would have
// gone through fine a second later.
async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 1000, label = "request" } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = resolveDelayMs(error, attempt, baseDelayMs);
      console.warn(
        `[withRetry] ${label} failed (attempt ${attempt}/${maxAttempts}, status ${
          error.response?.status || "network error"
        }) — retrying in ${delayMs}ms`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

module.exports = { withRetry };
