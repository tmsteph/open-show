module.exports = async function handler(_req, res) {
  try {
    await import("../src/server/runtimeShowStore.mjs");
    res.status(200).json({
      status: "ok",
      storageMode: process.env.OPENSHOW_STORE_MODE ?? (process.env.VERCEL ? "memory" : "file")
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Health check failed" });
  }
};
