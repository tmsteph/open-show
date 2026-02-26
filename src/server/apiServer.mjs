import http from "node:http";
import { URL } from "node:url";

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  response.end(`${JSON.stringify(body)}\n`);
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Request body must be valid JSON");
  }
}

function getShowIdFromPath(pathname) {
  const match = /^\/api\/shows\/([^/]+)$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

export function createApiServer({ store }) {
  if (!store) {
    throw new Error("store is required");
  }

  const server = http.createServer(async (request, response) => {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://localhost");

    try {
      if (method === "OPTIONS") {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (method === "GET" && url.pathname === "/api/health") {
        sendJson(response, 200, { status: "ok" });
        return;
      }

      if (method === "GET" && url.pathname === "/api/shows") {
        const shows = await store.listShows();
        sendJson(response, 200, { shows });
        return;
      }

      if (method === "POST" && url.pathname === "/api/shows") {
        const body = await readJsonBody(request);
        const showId = body?.metadata?.showId;
        const show = await store.upsertShow(showId, body);
        sendJson(response, 201, { show });
        return;
      }

      const showId = getShowIdFromPath(url.pathname);
      if (!showId) {
        sendJson(response, 404, { error: "Not found" });
        return;
      }

      if (method === "GET") {
        const show = await store.getShow(showId);
        if (!show) {
          sendJson(response, 404, { error: "Show not found" });
          return;
        }
        sendJson(response, 200, { show });
        return;
      }

      if (method === "PUT") {
        const body = await readJsonBody(request);
        const show = await store.upsertShow(showId, body);
        sendJson(response, 200, { show });
        return;
      }

      if (method === "DELETE") {
        const deleted = await store.deleteShow(showId);
        if (!deleted) {
          sendJson(response, 404, { error: "Show not found" });
          return;
        }
        sendJson(response, 200, { deleted: true });
        return;
      }

      sendJson(response, 405, { error: "Method not allowed" });
    } catch (error) {
      sendJson(response, 400, { error: error.message || "Request failed" });
    }
  });

  return server;
}
