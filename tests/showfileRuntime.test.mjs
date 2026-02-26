import assert from "node:assert/strict";
import test from "node:test";
import { buildShowRuntime } from "../src/engine/showfileRuntime.mjs";

const sampleShowfile = {
  schemaVersion: "0.1.0",
  metadata: {
    showId: "acme-q1-2026",
    title: "ACME Q1 Town Hall",
    revision: 1,
    createdAt: "2026-02-26T13:00:00Z"
  },
  outputs: [
    { id: "out-program-1", name: "Program", role: "program", enabled: true },
    { id: "out-confidence-1", name: "Confidence", role: "confidence", enabled: true }
  ],
  cues: [
    {
      id: "Q-001",
      type: "PPT",
      name: "Welcome",
      outputs: ["out-program-1", "out-confidence-1"]
    }
  ]
};

test("buildShowRuntime resolves output references for cues", () => {
  const runtime = buildShowRuntime(sampleShowfile);
  assert.equal(runtime.cues.length, 1);
  assert.equal(runtime.cues[0].resolvedOutputs.length, 2);
  assert.equal(runtime.cues[0].resolvedOutputs[0].id, "out-program-1");
});

test("buildShowRuntime throws when cue references missing output", () => {
  const brokenShowfile = {
    ...sampleShowfile,
    cues: [
      {
        id: "Q-001",
        type: "PPT",
        name: "Welcome",
        outputs: ["out-missing"]
      }
    ]
  };

  assert.throws(
    () => buildShowRuntime(brokenShowfile),
    /unknown output ids/
  );
});
