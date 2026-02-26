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
  const store = await getRuntimeShowStore();
  const showId = String(req.query?.showId ?? "").trim();

  if (!showId) {
    res.status(400).json({ error: "showId is required" });
    return;
  }

  try {
    if (req.method === "GET") {
      const show = await store.getShow(showId);
      if (!show) {
        res.status(404).json({ error: "Show not found" });
        return;
      }
      res.status(200).json({ show });
      return;
    }

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const show = await store.upsertShow(showId, body);
      res.status(200).json({ show });
      return;
    }

    if (req.method === "DELETE") {
      const deleted = await store.deleteShow(showId);
      if (!deleted) {
        res.status(404).json({ error: "Show not found" });
        return;
      }
      res.status(200).json({ deleted: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(400).json({ error: error.message || "Request failed" });
  }
};
