export const EDITOR_CUE_TYPES = ["PPT", "IMG", "VID", "BLACK", "FREEZE", "AUDIO", "STINGER"];

function normalizeLineList(value, fallback) {
  const lines = String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [fallback];
}

export function buildNextCueId(cues) {
  const maxId = cues.reduce((currentMax, cue) => {
    const match = /^Q-(\d+)$/.exec(cue.id ?? "");
    if (!match) {
      return currentMax;
    }
    return Math.max(currentMax, Number.parseInt(match[1], 10));
  }, 0);
  return `Q-${String(maxId + 1).padStart(3, "0")}`;
}

export function createCueDraft(cues = []) {
  return {
    id: buildNextCueId(cues),
    type: "PPT",
    name: "New Cue",
    meta: "",
    preview: "",
    outputsText: "Program - Output 1",
    transitionsText: "Cut",
    notes: "",
    safetyText: "Blackout on panic",
    assetUri: ""
  };
}

export function normalizeCueDraft(draft) {
  const id = String(draft.id ?? "").trim();
  const type = String(draft.type ?? "").trim().toUpperCase();
  const name = String(draft.name ?? "").trim();

  if (!/^Q-\d{3}$/.test(id)) {
    throw new Error("Cue id must match Q-001 format");
  }
  if (!EDITOR_CUE_TYPES.includes(type)) {
    throw new Error(`Unsupported cue type: ${type}`);
  }
  if (!name) {
    throw new Error("Cue name is required");
  }

  return {
    id,
    type,
    name,
    meta: String(draft.meta ?? "").trim() || "No metadata",
    preview: String(draft.preview ?? "").trim() || name,
    outputs: normalizeLineList(draft.outputsText, "Program - Output 1"),
    transitions: normalizeLineList(draft.transitionsText, "Cut"),
    notes: String(draft.notes ?? "").trim() || "No notes.",
    safety: normalizeLineList(draft.safetyText, "No safety notes"),
    assetUri: String(draft.assetUri ?? "").trim()
  };
}

export function upsertCue(cues, cue) {
  const index = cues.findIndex((item) => item.id === cue.id);
  if (index === -1) {
    return { cues: [...cues, cue], activeIndex: cues.length };
  }

  const nextCues = [...cues];
  nextCues[index] = cue;
  return { cues: nextCues, activeIndex: index };
}

export function deleteCueById(cues, cueId) {
  if (cues.length <= 1) {
    throw new Error("At least one cue is required");
  }

  const index = cues.findIndex((cue) => cue.id === cueId);
  if (index === -1) {
    throw new Error(`Cue not found: ${cueId}`);
  }

  const nextCues = cues.filter((cue) => cue.id !== cueId);
  return { cues: nextCues, activeIndex: Math.max(0, index - 1) };
}
