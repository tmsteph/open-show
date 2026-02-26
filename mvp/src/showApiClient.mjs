export function resolveDefaultApiBase(runtime = globalThis) {
  if (typeof runtime.OPENSHOW_API_BASE === "string" && runtime.OPENSHOW_API_BASE.trim()) {
    return runtime.OPENSHOW_API_BASE.trim().replace(/\/+$/, "");
  }

  if (
    runtime.location &&
    typeof runtime.location.origin === "string" &&
    runtime.location.origin.startsWith("http")
  ) {
    return runtime.location.origin;
  }

  return "http://localhost:4173";
}

function defaultShowsEndpoint() {
  return `${resolveDefaultApiBase()}/api/shows`;
}

export async function pingApiHealth(options = {}) {
  const endpoint = options.endpoint ?? `${resolveDefaultApiBase()}/api/health`;
  const response = await fetch(endpoint);
  const body = await response.json();
  if (!response.ok || body.status !== "ok") {
    throw new Error(body.error ?? "API health check failed");
  }
  return body;
}

export function formatFetchFailure(action, error, endpointBase = defaultShowsEndpoint()) {
  if (error?.name === "TypeError" || error?.message === "Failed to fetch") {
    return `${action} failed: cannot reach API at ${endpointBase}`;
  }
  return `${action} failed: ${error.message ?? error}`;
}

export async function saveShowToApi(showfile, options = {}) {
  const endpoint = options.endpoint ?? defaultShowsEndpoint();
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
  const endpointBase = options.endpointBase ?? defaultShowsEndpoint();
  const response = await fetch(`${endpointBase}/${encodeURIComponent(showId)}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Failed to load show");
  }
  return body.show;
}
