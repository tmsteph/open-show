const { randomUUID } = require("node:crypto");

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

  try {
    if (req.method === "GET") {
      const assets = await store.listAssets();
      res.status(200).json({
        assets: assets.map((asset) => ({
          assetId: asset.assetId,
          fileName: asset.fileName,
          contentType: asset.contentType,
          sizeBytes: asset.sizeBytes,
          updatedAt: asset.updatedAt,
          uri: `/api/assets/${encodeURIComponent(asset.assetId)}`
        }))
      });
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = await readJsonBody(req);
    const assetId = body?.assetId ?? randomUUID();
    const asset = await store.upsertAsset(assetId, body);

    res.status(201).json({
      asset: {
        assetId: asset.assetId,
        fileName: asset.fileName,
        contentType: asset.contentType,
        sizeBytes: asset.sizeBytes,
        uri: `/api/assets/${encodeURIComponent(asset.assetId)}`
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Request failed" });
  }
};
