import assert from "node:assert/strict";
import test from "node:test";
import { createPlaybackSession } from "../src/app/playbackSession.mjs";

const showfile = {
  schemaVersion: "0.1.0",
  metadata: {
    showId: "sample-show",
    title: "Sample Show",
    revision: 1,
    createdAt: "2026-02-26T13:00:00Z"
  },
  outputs: [
    { id: "out-program-1", name: "Program", role: "program", enabled: true }
  ],
  cues: [
    { id: "Q-001", type: "PPT", name: "Opening", outputs: ["out-program-1"] },
    { id: "Q-002", type: "VID", name: "Walk In", outputs: ["out-program-1"] }
  ]
};

test("createPlaybackSession activates cue transitions through adapter", async () => {
  const activatedCueIds = [];
  const outputAdapter = {
    async activateCue(cue) {
      activatedCueIds.push(cue.id);
    }
  };

  const session = createPlaybackSession(showfile, { outputAdapter });
  await session.activateCurrentCue();
  await session.goNext();
  const snapshot = await session.skipCue();

  assert.deepEqual(activatedCueIds, ["Q-001", "Q-002", "Q-002"]);
  assert.equal(snapshot.activeCue.id, "Q-002");
  assert.equal(snapshot.status, "Skipped");
});

test("runTransportCommand executes GO/BACK/SKIP deterministically", async () => {
  const activatedCueIds = [];
  const outputAdapter = {
    async activateCue(cue) {
      activatedCueIds.push(cue.id);
    }
  };

  const session = createPlaybackSession(showfile, { outputAdapter });

  await session.runTransportCommand("GO");
  await session.runTransportCommand("BACK");
  const snapshot = await session.runTransportCommand("SKIP");

  assert.deepEqual(activatedCueIds, ["Q-002", "Q-001", "Q-002"]);
  assert.equal(snapshot.activeCue.id, "Q-002");
  assert.equal(snapshot.status, "Skipped");
});

test("runTransportCommand rejects unsupported commands", async () => {
  const session = createPlaybackSession(showfile);
  await assert.rejects(() => session.runTransportCommand("PANIC"), /Unsupported transport command/);
});
