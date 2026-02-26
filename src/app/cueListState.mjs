const ALLOWED_CUE_TYPES = new Set(["PPT", "IMG", "VID", "BLACK", "FREEZE"]);

function normalizeCue(cue) {
  if (!cue || typeof cue !== "object") {
    throw new Error("Cue must be an object");
  }

  if (typeof cue.id !== "string" || cue.id.trim() === "") {
    throw new Error("Cue requires a non-empty id");
  }

  if (typeof cue.name !== "string" || cue.name.trim() === "") {
    throw new Error("Cue requires a non-empty name");
  }

  if (!ALLOWED_CUE_TYPES.has(cue.type)) {
    throw new Error(`Unsupported cue type: ${cue.type}`);
  }

  return { ...cue, id: cue.id.trim(), name: cue.name.trim() };
}

function parseCueNumber(cueId) {
  const match = /^Q-(\d+)$/.exec(cueId);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

function buildCueId(cues) {
  const maxCueNumber = cues.reduce((max, cue) => {
    const cueNumber = parseCueNumber(cue.id);
    return cueNumber === null ? max : Math.max(max, cueNumber);
  }, 0);

  return `Q-${String(maxCueNumber + 1).padStart(3, "0")}`;
}

export function createCueListState(initialCues = []) {
  if (!Array.isArray(initialCues)) {
    throw new Error("createCueListState requires an array");
  }

  const cues = initialCues.map((cue) => normalizeCue(cue));

  const hasDuplicateIds = new Set(cues.map((cue) => cue.id)).size !== cues.length;
  if (hasDuplicateIds) {
    throw new Error("Cue ids must be unique");
  }

  const state = {
    cues,
    revision: 0
  };

  function bumpRevision() {
    state.revision += 1;
  }

  function getSnapshot() {
    return {
      cues: [...state.cues],
      cueCount: state.cues.length,
      revision: state.revision
    };
  }

  function getCue(cueId) {
    return state.cues.find((cue) => cue.id === cueId) ?? null;
  }

  function insertCue(nextCue, index = state.cues.length) {
    if (getCue(nextCue.id)) {
      throw new Error(`Cue id already exists: ${nextCue.id}`);
    }

    const clampedIndex = Math.max(0, Math.min(index, state.cues.length));
    state.cues.splice(clampedIndex, 0, nextCue);
    bumpRevision();
    return nextCue;
  }

  function createCue(cueDraft, options = {}) {
    const draft = { ...cueDraft };
    if (typeof draft.id !== "string" || draft.id.trim() === "") {
      draft.id = buildCueId(state.cues);
    }

    const nextCue = normalizeCue(draft);
    return insertCue(nextCue, options.index);
  }

  function updateCue(cueId, cuePatch) {
    const index = state.cues.findIndex((cue) => cue.id === cueId);
    if (index === -1) {
      throw new Error(`Cue not found: ${cueId}`);
    }

    const existingCue = state.cues[index];
    const mergedCue = normalizeCue({ ...existingCue, ...cuePatch });

    if (mergedCue.id !== cueId && getCue(mergedCue.id)) {
      throw new Error(`Cue id already exists: ${mergedCue.id}`);
    }

    state.cues[index] = mergedCue;
    bumpRevision();
    return mergedCue;
  }

  function deleteCue(cueId) {
    const index = state.cues.findIndex((cue) => cue.id === cueId);
    if (index === -1) {
      throw new Error(`Cue not found: ${cueId}`);
    }

    const [removedCue] = state.cues.splice(index, 1);
    bumpRevision();
    return removedCue;
  }

  return {
    getSnapshot,
    getCue,
    createCue,
    updateCue,
    deleteCue
  };
}
