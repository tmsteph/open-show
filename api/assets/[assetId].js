module.exports = async function handler(req, res) {
  const { getRuntimeShowStore } = await import("../../src/server/runtimeShowStore.mjs");
  const store = await getRuntimeShowStore();
  const assetId = String(req.query?.assetId ?? "").trim();

  if (!assetId) {
    res.status(400).json({ error: "assetId is required" });
    return;
  }

  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const asset = await store.getAsset(assetId);
    if (!asset) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }

    const binary = Buffer.from(asset.dataBase64, "base64");
    res.setHeader("content-type", asset.contentType || "application/octet-stream");
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
    res.status(200).send(binary);
  } catch (error) {
    res.status(400).json({ error: error.message || "Request failed" });
  }
};
