import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHealthEndpoint,
  buildShowsEndpoint,
  formatApiError,
  normalizeApiBase
} from "../mvp/src/apiUx.mjs";

test("api endpoint helpers normalize base urls", () => {
  assert.equal(normalizeApiBase("http://localhost:4173/"), "http://localhost:4173");
  assert.equal(buildShowsEndpoint("http://localhost:4173"), "http://localhost:4173/api/shows");
  assert.equal(
    buildHealthEndpoint("http://localhost:4173/api/shows"),
    "http://localhost:4173/api/health"
  );
});

test("formatApiError gives actionable network guidance", () => {
  const message = formatApiError("DB save", new TypeError("Failed to fetch"), "http://localhost:4173");
  assert.match(message, /API unreachable/);
  assert.match(message, /start:api/);
});
