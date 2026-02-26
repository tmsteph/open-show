async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

module.exports = async function handler(req, res) {
  const { getRuntimeShowStore } = await import("../../src/server/runtimeShowStore.mjs");
  const store = getRuntimeShowStore();

  try {
    if (req.method === "GET") {
      const shows = await store.listShows();
      res.status(200).json({ shows });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const show = await store.upsertShow(body?.metadata?.showId, body);
      res.status(201).json({ show });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(400).json({ error: error.message || "Request failed" });
  }
};
