import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteShowFromApi,
  formatFetchFailure,
  listAssetsFromApi,
  listShowsFromApi,
  resolveDefaultApiBase
} from "../mvp/src/showApiClient.mjs";

test("resolveDefaultApiBase prefers browser origin", () => {
  const base = resolveDefaultApiBase({
    location: { origin: "https://preview-example.vercel.app" }
  });
  assert.equal(base, "https://preview-example.vercel.app");
});

test("resolveDefaultApiBase falls back to localhost", () => {
  const base = resolveDefaultApiBase({});
  assert.equal(base, "http://localhost:4173");
});

test("formatFetchFailure expands fetch errors", () => {
  const message = formatFetchFailure("DB save", new TypeError("Failed to fetch"));
  assert.match(message, /cannot reach API/);
});

test("listAssetsFromApi returns server asset summaries", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        assets: [
          {
            assetId: "asset-1",
            fileName: "slide.png",
            contentType: "image/png",
            sizeBytes: 1024,
            uri: "/api/assets/asset-1"
          }
        ]
      };
    }
  });

  try {
    const assets = await listAssetsFromApi({ apiBase: "http://localhost:4173" });
    assert.equal(assets.length, 1);
    assert.equal(assets[0].assetId, "asset-1");
    assert.equal(assets[0].uri, "/api/assets/asset-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listAssetsFromApi throws server error messages", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    async json() {
      return { error: "Asset list unavailable" };
    }
  });

  try {
    await assert.rejects(
      listAssetsFromApi({ apiBase: "http://localhost:4173" }),
      /Asset list unavailable/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listShowsFromApi returns show summaries", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        shows: [{ showId: "town-hall", title: "Town Hall", revision: 2, cueCount: 18 }]
      };
    }
  });

  try {
    const shows = await listShowsFromApi({ apiBase: "http://localhost:4173" });
    assert.equal(shows.length, 1);
    assert.equal(shows[0].showId, "town-hall");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteShowFromApi rejects API errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    async json() {
      return { error: "Show not found" };
    }
  });

  try {
    await assert.rejects(
      deleteShowFromApi("missing-show", { apiBase: "http://localhost:4173" }),
      /Show not found/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
