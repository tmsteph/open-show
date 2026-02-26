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
