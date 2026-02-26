import assert from "node:assert/strict";
import test from "node:test";
import { createRunStatusFeed } from "../mvp/src/runStatus.mjs";

test("createRunStatusFeed adds entries in newest-first order", () => {
  let tick = 0;
  const feed = createRunStatusFeed({
    now: () => new Date(`2026-02-26T12:00:0${tick++}Z`)
  });

  feed.add("GO Q-001");
  feed.add("BACK Q-001");
  const entries = feed.list();

  assert.equal(entries.length, 2);
  assert.equal(entries[0].message, "BACK Q-001");
  assert.equal(entries[1].message, "GO Q-001");
});

test("createRunStatusFeed enforces max entries", () => {
  const feed = createRunStatusFeed({ maxEntries: 2 });
  feed.add("one");
  feed.add("two");
  feed.add("three");
  const entries = feed.list();

  assert.equal(entries.length, 2);
  assert.equal(entries[0].message, "three");
  assert.equal(entries[1].message, "two");
});
