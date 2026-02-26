import assert from "node:assert/strict";
import test from "node:test";
import { formatFetchFailure, resolveDefaultApiBase } from "../mvp/src/showApiClient.mjs";

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
