import { mkdir } from "node:fs/promises";
import path from "node:path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

function nowIso() {
  return new Date().toISOString();
}

function toSummary(row) {
  const showfile = JSON.parse(row.showfile_json);
  return {
    showId: row.show_id,
    title: row.title,
    revision: row.revision,
    updatedAt: row.updated_at,
    cueCount: Array.isArray(showfile?.cues) ? showfile.cues.length : 0
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

function toAssetSummary(row) {
  return {
    assetId: row.asset_id,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    updatedAt: row.updated_at
  };
}

async function initDb(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS shows (
      show_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      revision INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      showfile_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_shows_updated_at ON shows(updated_at DESC);

    CREATE TABLE IF NOT EXISTS assets (
      asset_id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      data_base64 TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_assets_updated_at ON assets(updated_at DESC);
  `);
}

export async function createSqliteShowStore(dbFilePath) {
  if (!dbFilePath) {
    throw new Error("dbFilePath is required");
  }

  await mkdir(path.dirname(dbFilePath), { recursive: true });
  const db = await open({
    filename: dbFilePath,
    driver: sqlite3.Database
  });
  await initDb(db);

  return {
    async listShows() {
      const rows = await db.all(
        "SELECT show_id, title, revision, updated_at, showfile_json FROM shows ORDER BY updated_at DESC"
      );
      return rows.map((row) => toSummary(row));
    },

    async getShow(showId) {
      const row = await db.get(
        "SELECT show_id, title, revision, updated_at, showfile_json FROM shows WHERE show_id = ?",
        showId
      );
      if (!row) {
        return null;
      }

      return {
        showId: row.show_id,
        title: row.title,
        revision: row.revision,
        updatedAt: row.updated_at,
        showfile: JSON.parse(row.showfile_json)
      };
    },

    async upsertShow(showId, payload) {
      const normalized = normalizeIncomingShow(showId, payload);
      await db.run(
        `INSERT INTO shows (show_id, title, revision, updated_at, showfile_json)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(show_id) DO UPDATE SET
           title = excluded.title,
           revision = excluded.revision,
           updated_at = excluded.updated_at,
           showfile_json = excluded.showfile_json`,
        normalized.showId,
        normalized.title,
        normalized.revision,
        normalized.updatedAt,
        JSON.stringify(normalized.showfile)
      );
      return normalized;
    },

    async deleteShow(showId) {
      const result = await db.run("DELETE FROM shows WHERE show_id = ?", showId);
      return result.changes > 0;
    },

    async listAssets() {
      const rows = await db.all(
        `SELECT asset_id, file_name, content_type, size_bytes, updated_at
         FROM assets ORDER BY updated_at DESC`
      );
      return rows.map((row) => toAssetSummary(row));
    },

    async upsertAsset(assetId, payload) {
      const normalized = normalizeIncomingAsset(assetId, payload);
      await db.run(
        `INSERT INTO assets (asset_id, file_name, content_type, data_base64, size_bytes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(asset_id) DO UPDATE SET
           file_name = excluded.file_name,
           content_type = excluded.content_type,
           data_base64 = excluded.data_base64,
           size_bytes = excluded.size_bytes,
           updated_at = excluded.updated_at`,
        normalized.assetId,
        normalized.fileName,
        normalized.contentType,
        normalized.dataBase64,
        normalized.sizeBytes,
        normalized.updatedAt
      );
      return normalized;
    },

    async getAsset(assetId) {
      const row = await db.get(
        `SELECT asset_id, file_name, content_type, data_base64, size_bytes, updated_at
         FROM assets WHERE asset_id = ?`,
        assetId
      );
      if (!row) {
        return null;
      }

      return {
        assetId: row.asset_id,
        fileName: row.file_name,
        contentType: row.content_type,
        dataBase64: row.data_base64,
        sizeBytes: row.size_bytes,
        updatedAt: row.updated_at
      };
    },

    async close() {
      await db.close();
    }
  };
}
