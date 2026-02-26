function defaultEndpointBase() {
  if (typeof globalThis !== "undefined" && typeof globalThis.OPENSHOW_API_BASE === "string") {
    return globalThis.OPENSHOW_API_BASE;
  }
  return "http://localhost:4173/api/shows";
}

export async function saveShowToApi(showfile, options = {}) {
  const endpoint = options.endpoint ?? defaultEndpointBase();
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
  const endpointBase = options.endpointBase ?? defaultEndpointBase();
  const response = await fetch(`${endpointBase}/${encodeURIComponent(showId)}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Failed to load show");
  }
  return body.show;
}
