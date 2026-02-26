import { createCueState } from "../engine/cueState.mjs";
import { buildShowRuntime } from "../engine/showfileRuntime.mjs";
import { createNullOutputAdapter } from "../adapters/output/nullOutputAdapter.mjs";

export function createPlaybackSession(showfile, options = {}) {
  const runtime = buildShowRuntime(showfile);
  const cueState = createCueState(runtime.cues, 0);
  const outputAdapter = options.outputAdapter ?? createNullOutputAdapter();

  async function activateCurrentCue() {
    const snapshot = cueState.getSnapshot();
    await outputAdapter.activateCue(snapshot.activeCue);
    return snapshot;
  }

  async function goNext() {
    const snapshot = cueState.goNext();
    await outputAdapter.activateCue(snapshot.activeCue);
    return snapshot;
  }

  async function goBack() {
    const snapshot = cueState.goBack();
    await outputAdapter.activateCue(snapshot.activeCue);
    return snapshot;
  }

  async function skipCue() {
    const snapshot = cueState.skipCue();
    await outputAdapter.activateCue(snapshot.activeCue);
    return snapshot;
  }

  async function runTransportCommand(command) {
    switch (command) {
      case "GO":
        return goNext();
      case "BACK":
        return goBack();
      case "SKIP":
        return skipCue();
      default:
        throw new Error(`Unsupported transport command: ${command}`);
    }
  }

  return {
    getRuntime() {
      return runtime;
    },
    getSnapshot() {
      return cueState.getSnapshot();
    },
    activateCurrentCue,
    goNext,
    goBack,
    skipCue,
    runTransportCommand
  };
}
