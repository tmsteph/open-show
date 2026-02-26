function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function createCueState(cues, initialIndex = 0) {
  if (!Array.isArray(cues) || cues.length === 0) {
    throw new Error("createCueState requires at least one cue");
  }

  const state = {
    cues,
    activeIndex: clamp(initialIndex, 0, cues.length - 1),
    status: "Ready"
  };

  const getActiveCue = () => state.cues[state.activeIndex];

  const getSnapshot = () => ({
    activeIndex: state.activeIndex,
    activeCue: getActiveCue(),
    status: state.status,
    cueCount: state.cues.length
  });

  const setActive = (index) => {
    state.activeIndex = clamp(index, 0, state.cues.length - 1);
    state.status = "Ready";
    return getSnapshot();
  };

  const goNext = () => setActive(state.activeIndex + 1);
  const goBack = () => setActive(state.activeIndex - 1);

  const skipCue = () => {
    const snapshot = setActive(state.activeIndex + 1);
    state.status = "Skipped";
    return { ...snapshot, status: state.status };
  };

  return {
    getSnapshot,
    setActive,
    goNext,
    goBack,
    skipCue
  };
}
