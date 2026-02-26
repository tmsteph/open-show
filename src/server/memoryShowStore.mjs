function nowIso() {
  return new Date().toISOString();
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

export function createMemoryShowStore() {
  const db = { shows: [], assets: [] };

  return {
    async listShows() {
      return db.shows.map((show) => toSummary(show));
    },

    async getShow(showId) {
      return db.shows.find((show) => show.showId === showId) ?? null;
    },

    async upsertShow(showId, payload) {
      const normalized = normalizeIncomingShow(showId, payload);
      const index = db.shows.findIndex((show) => show.showId === normalized.showId);
      if (index === -1) {
        db.shows.push(normalized);
      } else {
        db.shows[index] = normalized;
      }
      return normalized;
    },

    async deleteShow(showId) {
      const initialLength = db.shows.length;
      db.shows = db.shows.filter((show) => show.showId !== showId);
      return db.shows.length !== initialLength;
    },

    async upsertAsset(assetId, payload) {
      const normalized = normalizeIncomingAsset(assetId, payload);
      const index = db.assets.findIndex((asset) => asset.assetId === normalized.assetId);
      if (index === -1) {
        db.assets.push(normalized);
      } else {
        db.assets[index] = normalized;
      }
      return normalized;
    },

    async getAsset(assetId) {
      return db.assets.find((asset) => asset.assetId === assetId) ?? null;
    }
  };
}
