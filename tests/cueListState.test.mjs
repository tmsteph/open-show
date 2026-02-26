import assert from "node:assert/strict";
import test from "node:test";
import { createCueListState } from "../src/app/cueListState.mjs";

const initialCues = [
  { id: "Q-001", type: "PPT", name: "Opening" },
  { id: "Q-002", type: "VID", name: "Walk In" }
];

test("createCue adds a cue and auto-generates an id when omitted", () => {
  const cueList = createCueListState(initialCues);
  const cue = cueList.createCue({ type: "IMG", name: "Logo Hold" });
  const snapshot = cueList.getSnapshot();

  assert.equal(cue.id, "Q-003");
  assert.equal(snapshot.cueCount, 3);
  assert.equal(snapshot.revision, 1);
});

test("createCue validates allowed cue types", () => {
  const cueList = createCueListState(initialCues);
  assert.throws(
    () => cueList.createCue({ id: "Q-099", type: "AUDIO", name: "Stinger" }),
    /Unsupported cue type/
  );
});

test("updateCue applies patch and can rename cue id", () => {
  const cueList = createCueListState(initialCues);
  const cue = cueList.updateCue("Q-001", { id: "Q-010", name: "Opening Revised" });

  assert.equal(cue.id, "Q-010");
  assert.equal(cueList.getCue("Q-001"), null);
  assert.equal(cueList.getCue("Q-010").name, "Opening Revised");
});

test("deleteCue removes cue by id", () => {
  const cueList = createCueListState(initialCues);
  const removedCue = cueList.deleteCue("Q-002");
  const snapshot = cueList.getSnapshot();

  assert.equal(removedCue.id, "Q-002");
  assert.equal(snapshot.cueCount, 1);
  assert.equal(snapshot.cues[0].id, "Q-001");
});
