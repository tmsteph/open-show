import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import { createShowStore } from "../src/server/showStore.mjs";

function buildShow(showId, title = "Test Show") {
  return {
    schemaVersion: "0.1.0",
    metadata: {
      showId,
      title,
      revision: 1,
      createdAt: "2026-02-26T13:00:00Z"
    },
    outputs: [{ id: "out-program-1", name: "Program", role: "program", enabled: true }],
    cues: [{ id: "Q-001", type: "PPT", name: "Opening", outputs: ["out-program-1"] }]
  };
}

test("show store upserts and retrieves shows", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "openshow-store-"));
  const store = createShowStore(path.join(dir, "shows.db.json"));

  await store.upsertShow("demo-show", buildShow("demo-show", "Demo"));
  const show = await store.getShow("demo-show");
  const shows = await store.listShows();

  assert.equal(show.title, "Demo");
  assert.equal(shows.length, 1);
  assert.equal(shows[0].showId, "demo-show");
});

test("show store deletes records", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "openshow-store-"));
  const store = createShowStore(path.join(dir, "shows.db.json"));

  await store.upsertShow("demo-show", buildShow("demo-show"));
  const deleted = await store.deleteShow("demo-show");
  const missing = await store.getShow("demo-show");

  assert.equal(deleted, true);
  assert.equal(missing, null);
});

test("show store upserts and retrieves assets", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "openshow-store-"));
  const store = createShowStore(path.join(dir, "shows.db.json"));

  await store.upsertAsset("asset-1", {
    fileName: "slide.png",
    contentType: "image/png",
    dataBase64: Buffer.from("img-bytes").toString("base64")
  });

  const asset = await store.getAsset("asset-1");
  const assets = await store.listAssets();
  assert.equal(asset.assetId, "asset-1");
  assert.equal(asset.fileName, "slide.png");
  assert.equal(asset.contentType, "image/png");
  assert.equal(assets.length, 1);
  assert.equal(assets[0].assetId, "asset-1");
  assert.equal("dataBase64" in assets[0], false);
});
