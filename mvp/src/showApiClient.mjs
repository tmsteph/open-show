import { buildHealthEndpoint, buildShowsEndpoint, normalizeApiBase } from "./apiUx.mjs";

function defaultApiBase() {
  if (typeof globalThis !== "undefined" && typeof globalThis.OPENSHOW_API_BASE === "string") {
    return globalThis.OPENSHOW_API_BASE;
  }
  return "http://localhost:4173";
}

export async function saveShowToApi(showfile, options = {}) {
  const endpoint = buildShowsEndpoint(options.apiBase ?? defaultApiBase());
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(showfile)
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Failed to save show");
  }
  return body.show;
}

export async function loadShowFromApi(showId, options = {}) {
  const endpointBase = buildShowsEndpoint(options.apiBase ?? defaultApiBase());
  const response = await fetch(`${endpointBase}/${encodeURIComponent(showId)}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Failed to load show");
  }
  return body.show;
}

export async function pingApiHealth(options = {}) {
  const endpoint = buildHealthEndpoint(options.apiBase ?? defaultApiBase());
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`API health check failed (${response.status})`);
  }
  const body = await response.json();
  if (body.status !== "ok") {
    throw new Error("API health check returned unexpected response");
  }
  return {
    status: "ok",
    apiBase: normalizeApiBase(options.apiBase ?? defaultApiBase())
  };
}
