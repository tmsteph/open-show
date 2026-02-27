function formatOutputLabel(output) {
  const role = typeof output.role === "string" ? output.role : "output";
  const roleTitle = role.charAt(0).toUpperCase() + role.slice(1);
  return `${roleTitle} - ${output.name}`;
}

function normalizeOutput(output, index) {
  const fallbackName = `Output ${index + 1}`;
  const role = String(output?.role ?? "operator").trim().toLowerCase();
  const normalizedRole = ["program", "confidence", "operator"].includes(role) ? role : "operator";
  const name = String(output?.name ?? fallbackName).trim() || fallbackName;

  return {
    id: String(output?.id ?? `out-${index + 1}`).trim() || `out-${index + 1}`,
    name,
    role: normalizedRole,
    enabled: output?.enabled !== false
  };
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

  const normalizedOutputs = parsed.outputs.map((output, index) => normalizeOutput(output, index));
  const outputLabelById = new Map(
    normalizedOutputs.map((output) => [output.id, formatOutputLabel(output)])
  );

  const parsedRevision = Number(parsed.metadata?.revision ?? 1);
  const revision = Number.isFinite(parsedRevision) && parsedRevision > 0 ? Math.floor(parsedRevision) : 1;

  return {
    showId: parsed.metadata?.showId ?? "",
    title: parsed.metadata?.title ?? "Imported Showfile",
    revision,
    outputCount: normalizedOutputs.length,
    outputs: normalizedOutputs,
    runNotesGlobal: String(parsed.runNotes?.global ?? ""),
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
