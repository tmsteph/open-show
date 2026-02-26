import assert from "node:assert/strict";
import test from "node:test";
import { createCueState } from "../src/engine/cueState.mjs";

const cues = [
  { id: "Q-001", name: "One" },
  { id: "Q-002", name: "Two" },
  { id: "Q-003", name: "Three" }
];

test("initial index is clamped to valid range", () => {
  const state = createCueState(cues, 99);
  const snapshot = state.getSnapshot();
  assert.equal(snapshot.activeIndex, 2);
  assert.equal(snapshot.activeCue.id, "Q-003");
});

test("goNext stops at last cue", () => {
  const state = createCueState(cues, 1);
  state.goNext();
  const snapshot = state.goNext();
  assert.equal(snapshot.activeIndex, 2);
  assert.equal(snapshot.activeCue.id, "Q-003");
});

test("goBack stops at first cue", () => {
  const state = createCueState(cues, 0);
  const snapshot = state.goBack();
  assert.equal(snapshot.activeIndex, 0);
  assert.equal(snapshot.activeCue.id, "Q-001");
});

test("skipCue advances and sets skipped status", () => {
  const state = createCueState(cues, 0);
  const snapshot = state.skipCue();
  assert.equal(snapshot.activeIndex, 1);
  assert.equal(snapshot.activeCue.id, "Q-002");
  assert.equal(snapshot.status, "Skipped");
});
