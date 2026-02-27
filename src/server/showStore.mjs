import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function nowIso() {
  return new Date().toISOString();
}

function defaultDb() {
  return { shows: [], assets: [] };
}

function parseDb(input) {
  if (!input || typeof input !== "object") {
    return defaultDb();
  }

  const shows = Array.isArray(input.shows) ? input.shows : [];
  const assets = Array.isArray(input.assets) ? input.assets : [];
  return { shows, assets };
}

function toSummary(show) {
  return {
    showId: show.showId,
    title: show.title,
    revision: show.revision,
    updatedAt: show.updatedAt,
    cueCount: Array.isArray(show.showfile?.cues) ? show.showfile.cues.length : 0
  };
}

function toAssetSummary(asset) {
  return {
    assetId: asset.assetId,
    fileName: asset.fileName,
    contentType: asset.contentType,
    sizeBytes: asset.sizeBytes,
    updatedAt: asset.updatedAt
  };
}

function normalizeIncomingShow(showId, payload) {
  const resolvedShowId = String(showId ?? payload?.metadata?.showId ?? "").trim();
  const title = String(payload?.metadata?.title ?? "Untitled Show").trim();
  if (!resolvedShowId) {
    throw new Error("showId is required");
  }
  if (!title) {
    throw new Error("metadata.title is required");
  }

  return {
    showId: resolvedShowId,
    title,
    revision: Number(payload?.metadata?.revision ?? 1),
    updatedAt: nowIso(),
    showfile: payload
  };
}

function normalizeIncomingAsset(assetId, payload) {
  const resolvedAssetId = String(assetId ?? "").trim();
  const fileName = String(payload?.fileName ?? "").trim();
  const contentType = String(payload?.contentType ?? "application/octet-stream").trim();
  const dataBase64 = String(payload?.dataBase64 ?? "").trim();

  if (!resolvedAssetId) {
    throw new Error("assetId is required");
  }
  if (!fileName) {
    throw new Error("fileName is required");
  }
  if (!dataBase64) {
    throw new Error("dataBase64 is required");
  }

  return {
    assetId: resolvedAssetId,
    fileName,
    contentType,
    dataBase64,
    sizeBytes: Buffer.from(dataBase64, "base64").length,
    updatedAt: nowIso()
  };
}

export function createShowStore(dbFilePath) {
  if (!dbFilePath) {
    throw new Error("dbFilePath is required");
  }

  async function readDb() {
    try {
      const raw = await readFile(dbFilePath, "utf8");
      return parseDb(JSON.parse(raw));
    } catch (error) {
      if (error.code === "ENOENT") {
        return defaultDb();
      }
      throw error;
    }
  }

  async function writeDb(db) {
    await mkdir(path.dirname(dbFilePath), { recursive: true });
    await writeFile(dbFilePath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  }

  return {
    async listShows() {
      const db = await readDb();
      return db.shows.map((show) => toSummary(show));
    },

    async getShow(showId) {
      const db = await readDb();
      return db.shows.find((show) => show.showId === showId) ?? null;
    },

    async upsertShow(showId, payload) {
      const db = await readDb();
      const normalized = normalizeIncomingShow(showId, payload);
      const index = db.shows.findIndex((show) => show.showId === normalized.showId);
      if (index === -1) {
        db.shows.push(normalized);
      } else {
        db.shows[index] = normalized;
      }
      await writeDb(db);
      return normalized;
    },

    async deleteShow(showId) {
      const db = await readDb();
      const initialLength = db.shows.length;
      db.shows = db.shows.filter((show) => show.showId !== showId);
      const deleted = db.shows.length !== initialLength;
      if (deleted) {
        await writeDb(db);
      }
      return deleted;
    },

    async listAssets() {
      const db = await readDb();
      return db.assets
        .map((asset) => toAssetSummary(asset))
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    },

    async upsertAsset(assetId, payload) {
      const db = await readDb();
      const normalized = normalizeIncomingAsset(assetId, payload);
      const index = db.assets.findIndex((asset) => asset.assetId === normalized.assetId);
      if (index === -1) {
        db.assets.push(normalized);
      } else {
        db.assets[index] = normalized;
      }
      await writeDb(db);
      return normalized;
    },

    async getAsset(assetId) {
      const db = await readDb();
      return db.assets.find((asset) => asset.assetId === assetId) ?? null;
    }
  };
}
