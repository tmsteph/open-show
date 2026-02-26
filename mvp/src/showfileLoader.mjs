function formatOutputLabel(output) {
  const role = typeof output.role === "string" ? output.role : "output";
  const roleTitle = role.charAt(0).toUpperCase() + role.slice(1);
  return `${roleTitle} - ${output.name}`;
}

function normalizeCue(cue, outputLabelById) {
  const outputLabels = Array.isArray(cue.outputs)
    ? cue.outputs.map((outputId) => outputLabelById.get(outputId) ?? outputId)
    : [];

  return {
    id: cue.id,
    type: String(cue.type ?? "PPT").toUpperCase(),
    name: cue.name,
    meta: cue.meta ?? "No metadata",
    preview: cue.preview ?? cue.name,
    outputs: outputLabels.length > 0 ? outputLabels : ["Unassigned output"],
    transitions: Array.isArray(cue.transitions) && cue.transitions.length > 0 ? cue.transitions : ["Cut"],
    notes: cue.notes ?? "No notes.",
    safety: Array.isArray(cue.safety) && cue.safety.length > 0 ? cue.safety : ["No safety notes"],
    assetUri: cue.asset?.uri ?? ""
  };
}

export function parseShowfileObject(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Showfile must be an object");
  }

  if (!Array.isArray(parsed.outputs) || parsed.outputs.length === 0) {
    throw new Error("Showfile requires at least one output");
  }

  if (!Array.isArray(parsed.cues) || parsed.cues.length === 0) {
    throw new Error("Showfile requires at least one cue");
  }

  const outputLabelById = new Map(
    parsed.outputs.map((output) => [output.id, formatOutputLabel(output)])
  );

  return {
    showId: parsed.metadata?.showId ?? "",
    title: parsed.metadata?.title ?? "Imported Showfile",
    outputCount: parsed.outputs.length,
    cues: parsed.cues.map((cue) => normalizeCue(cue, outputLabelById))
  };
}

export function parseShowfileText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Showfile is not valid JSON");
  }

  return parseShowfileObject(parsed);
}
