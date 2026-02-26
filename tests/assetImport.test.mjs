import assert from "node:assert/strict";
import test from "node:test";
import { createImportedAssetRecord, inferCueTypeForAsset } from "../mvp/src/assetImport.mjs";

test("inferCueTypeForAsset maps common media and presentation formats", () => {
  assert.equal(inferCueTypeForAsset("deck.pptx", ""), "PPT");
  assert.equal(inferCueTypeForAsset("walkin.mp3", "audio/mpeg"), "AUDIO");
  assert.equal(inferCueTypeForAsset("bumper.mp4", "video/mp4"), "VID");
  assert.equal(inferCueTypeForAsset("slide.png", "image/png"), "IMG");
  assert.equal(inferCueTypeForAsset("speaker-stinger.wav", "audio/wav"), "STINGER");
});

test("createImportedAssetRecord builds asset uri and suggested type", () => {
  const result = createImportedAssetRecord({ name: "walkin.mp3", type: "audio/mpeg" });
  assert.equal(result.assetUri, "assets/imports/walkin.mp3");
  assert.equal(result.suggestedType, "AUDIO");
});

test("createImportedAssetRecord rejects invalid filenames", () => {
  assert.throws(() => createImportedAssetRecord({ name: "" }), /valid filename/);
});
