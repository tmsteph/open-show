function assertArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
}

export function buildShowRuntime(showfile) {
  if (!showfile || typeof showfile !== "object") {
    throw new Error("showfile must be an object");
  }

  assertArray(showfile.outputs, "showfile.outputs");
  assertArray(showfile.cues, "showfile.cues");

  const outputsById = new Map(
    showfile.outputs.map((output) => [output.id, output])
  );

  if (outputsById.size !== showfile.outputs.length) {
    throw new Error("showfile.outputs contains duplicate output ids");
  }

  const cues = showfile.cues.map((cue) => {
    const unresolved = cue.outputs.filter((outputId) => !outputsById.has(outputId));
    if (unresolved.length > 0) {
      throw new Error(
        `cue ${cue.id} references unknown output ids: ${unresolved.join(", ")}`
      );
    }

    return {
      ...cue,
      resolvedOutputs: cue.outputs.map((outputId) => outputsById.get(outputId))
    };
  });

  return {
    schemaVersion: showfile.schemaVersion,
    metadata: showfile.metadata,
    outputs: showfile.outputs,
    cues
  };
}
