import assert from "node:assert/strict";
import test from "node:test";
import { parseShowfileText } from "../mvp/src/showfileLoader.mjs";

test("parseShowfileText builds a cue view model from showfile JSON", () => {
  const input = JSON.stringify({
    metadata: { showId: "town-hall", title: "Town Hall", revision: 3 },
    runNotes: { global: "Keep podium mic live." },
    outputs: [
      { id: "out-program", role: "program", name: "Projector Left", enabled: true },
      { id: "out-confidence", role: "confidence", name: "Confidence Display" }
    ],
    cues: [
      {
        id: "Q-001",
        type: "PPT",
        name: "Opening",
        outputs: ["out-program", "out-confidence"],
        transitions: ["Cut"],
        safety: ["Blackout on panic"]
      }
    ]
  });

  const parsed = parseShowfileText(input);
  assert.equal(parsed.showId, "town-hall");
  assert.equal(parsed.title, "Town Hall");
  assert.equal(parsed.revision, 3);
  assert.equal(parsed.runNotesGlobal, "Keep podium mic live.");
  assert.equal(parsed.outputCount, 2);
  assert.equal(parsed.outputs.length, 2);
  assert.equal(parsed.outputs[0].id, "out-program");
  assert.equal(parsed.outputs[0].enabled, true);
  assert.equal(parsed.cues.length, 1);
  assert.deepEqual(parsed.cues[0].outputs, [
    "Program - Projector Left",
    "Confidence - Confidence Display"
  ]);
});

test("parseShowfileText rejects non-JSON text", () => {
  assert.throws(() => parseShowfileText("not json"), /not valid JSON/);
});

test("parseShowfileText rejects missing outputs or cues", () => {
  assert.throws(() => parseShowfileText(JSON.stringify({ cues: [] })), /at least one output/);
  assert.throws(() => parseShowfileText(JSON.stringify({ outputs: [] })), /at least one output/);
  assert.throws(
    () => parseShowfileText(JSON.stringify({ outputs: [{ id: "x", role: "program", name: "Main" }], cues: [] })),
    /at least one cue/
  );
});
