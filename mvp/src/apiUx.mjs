const DEFAULT_API_BASE = "http://localhost:4173";

function browserOriginBase() {
  if (typeof globalThis !== "undefined" && globalThis.location && typeof globalThis.location.origin === "string") {
    if (globalThis.location.origin.startsWith("http")) {
      return globalThis.location.origin;
    }
  }
  return "";
}

export function normalizeApiBase(input) {
  const trimmed = String(input ?? "").trim().replace(/\/+$/, "");
  return trimmed || browserOriginBase() || DEFAULT_API_BASE;
}

export function buildShowsEndpoint(apiBaseInput) {
  const base = normalizeApiBase(apiBaseInput);
  if (base.endsWith("/api/shows")) {
    return base;
  }
  return `${base}/api/shows`;
}

export function buildHealthEndpoint(apiBaseInput) {
  const base = normalizeApiBase(apiBaseInput);
  if (base.endsWith("/api/shows")) {
    return `${base.slice(0, -"/api/shows".length)}/api/health`;
  }
  return `${base}/api/health`;
}

export function formatApiError(action, error, apiBaseInput) {
  const apiBase = normalizeApiBase(apiBaseInput);
  const message = String(error?.message ?? error ?? "Unknown error");
  if (message === "Failed to fetch" || error?.name === "TypeError") {
    return `${action} failed: API unreachable at ${apiBase}. Start \`npm run start:api\`.`;
  }
  return `${action} failed: ${message}`;
}
