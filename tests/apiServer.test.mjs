import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createApiServer } from "../src/server/apiServer.mjs";
import { createSqliteShowStore } from "../src/server/sqliteShowStore.mjs";

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

test("api server stores and returns shows", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "openshow-api-"));
  const store = await createSqliteShowStore(path.join(dir, "shows.sqlite"));
  const server = createApiServer({ store });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const createResponse = await fetch(`${base}/api/shows`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildShow("sample-show", "Sample"))
  });

  assert.equal(createResponse.status, 201);

  const listResponse = await fetch(`${base}/api/shows`);
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  assert.equal(listBody.shows.length, 1);
  assert.equal(listBody.shows[0].showId, "sample-show");

  const getResponse = await fetch(`${base}/api/shows/sample-show`);
  assert.equal(getResponse.status, 200);
  const getBody = await getResponse.json();
  assert.equal(getBody.show.showId, "sample-show");

  await new Promise((resolve) => server.close(resolve));
  await store.close();
});

test("api server deletes shows", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "openshow-api-"));
  const store = await createSqliteShowStore(path.join(dir, "shows.sqlite"));
  const server = createApiServer({ store });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  await fetch(`${base}/api/shows`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildShow("sample-show", "Sample"))
  });

  const deleteResponse = await fetch(`${base}/api/shows/sample-show`, { method: "DELETE" });
  assert.equal(deleteResponse.status, 200);

  const missingResponse = await fetch(`${base}/api/shows/sample-show`);
  assert.equal(missingResponse.status, 404);

  await new Promise((resolve) => server.close(resolve));
  await store.close();
});

test("api server stores and serves assets", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "openshow-api-"));
  const store = createShowStore(path.join(dir, "shows.db.json"));
  const server = createApiServer({ store });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const uploadResponse = await fetch(`${base}/api/assets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: "stinger.wav",
      contentType: "audio/wav",
      dataBase64: Buffer.from("asset-bytes").toString("base64")
    })
  });
  assert.equal(uploadResponse.status, 201);
  const uploadBody = await uploadResponse.json();

  const assetResponse = await fetch(`${base}${uploadBody.asset.uri}`);
  assert.equal(assetResponse.status, 200);
  assert.equal(assetResponse.headers.get("content-type"), "audio/wav");
  const assetBytes = Buffer.from(await assetResponse.arrayBuffer()).toString("utf8");
  assert.equal(assetBytes, "asset-bytes");

  await new Promise((resolve) => server.close(resolve));
});
