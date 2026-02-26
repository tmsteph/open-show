import assert from "node:assert/strict";
import test from "node:test";
import { getTransportCommandForKeyEvent } from "../mvp/src/hotkeys.mjs";

test("maps key events to transport commands", () => {
  assert.equal(getTransportCommandForKeyEvent({ code: "Space", shiftKey: false }), "GO");
  assert.equal(getTransportCommandForKeyEvent({ code: "ArrowRight", shiftKey: false }), "GO");
  assert.equal(getTransportCommandForKeyEvent({ code: "Space", shiftKey: true }), "BACK");
  assert.equal(getTransportCommandForKeyEvent({ code: "ArrowLeft", shiftKey: false }), "BACK");
  assert.equal(getTransportCommandForKeyEvent({ code: "KeyS", shiftKey: false }), "SKIP");
});

test("ignores key events from editable targets", () => {
  assert.equal(
    getTransportCommandForKeyEvent({
      code: "Space",
      shiftKey: false,
      target: { tagName: "input", isContentEditable: false }
    }),
    null
  );
});

test("returns null for unsupported or prevented events", () => {
  assert.equal(getTransportCommandForKeyEvent({ code: "KeyX", shiftKey: false }), null);
  assert.equal(getTransportCommandForKeyEvent({ code: "Space", shiftKey: false, defaultPrevented: true }), null);
});
