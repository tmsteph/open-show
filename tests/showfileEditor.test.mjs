import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNextCueId,
  createCueDraft,
  deleteCueById,
  normalizeCueDraft,
  upsertCue
} from "../mvp/src/showfileEditor.mjs";

const cues = [
  {
    id: "Q-001",
    type: "PPT",
    name: "Opening",
    meta: "slide",
    preview: "OPEN",
    outputs: ["Program - Output 1"],
    transitions: ["Cut"],
    notes: "note",
    safety: ["safe"],
    assetUri: "assets/decks/main.pptx"
  }
];

test("buildNextCueId increments cue id", () => {
  assert.equal(buildNextCueId(cues), "Q-002");
});

test("createCueDraft returns default draft fields", () => {
  const draft = createCueDraft(cues);
  assert.equal(draft.id, "Q-002");
  assert.equal(draft.type, "PPT");
});

test("normalizeCueDraft validates and normalizes cue data", () => {
  const cue = normalizeCueDraft({
    id: "Q-010",
    type: "audio",
    name: "Walk-in Stinger",
    outputsText: "Program - Output 1",
    transitionsText: "Cut",
    safetyText: "Replay safe"
  });
  assert.equal(cue.type, "AUDIO");
  assert.deepEqual(cue.outputs, ["Program - Output 1"]);
});

test("upsertCue updates existing cues and inserts new cues", () => {
  const updateResult = upsertCue(cues, { ...cues[0], name: "Updated" });
  assert.equal(updateResult.cues[0].name, "Updated");
  assert.equal(updateResult.activeIndex, 0);

  const insertResult = upsertCue(cues, { ...cues[0], id: "Q-002", name: "New Cue" });
  assert.equal(insertResult.cues.length, 2);
  assert.equal(insertResult.activeIndex, 1);
});

test("deleteCueById removes cue and prevents deleting final cue", () => {
  const list = [...cues, { ...cues[0], id: "Q-002" }];
  const removed = deleteCueById(list, "Q-002");
  assert.equal(removed.cues.length, 1);
  assert.equal(removed.activeIndex, 0);
  assert.throws(() => deleteCueById(cues, "Q-001"), /At least one cue is required/);
});
