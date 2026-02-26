import assert from "node:assert/strict";
import test from "node:test";
import { parseShowfileText } from "../mvp/src/showfileLoader.mjs";

test("parseShowfileText builds a cue view model from showfile JSON", () => {
  const input = JSON.stringify({
    metadata: { title: "Town Hall" },
    outputs: [
      { id: "out-program", role: "program", name: "Projector Left" },
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
  assert.equal(parsed.title, "Town Hall");
  assert.equal(parsed.outputCount, 2);
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
