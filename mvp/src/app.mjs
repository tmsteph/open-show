import { cues } from "./cues.mjs";
import { createCueState } from "./cueState.mjs";
import { getTransportCommandForKeyEvent } from "./hotkeys.mjs";
import { parseShowfileText } from "./showfileLoader.mjs";
import { createImportedAssetRecord } from "./assetImport.mjs";
import { createRunStatusFeed } from "./runStatus.mjs";
import {
  EDITOR_CUE_TYPES,
  createCueDraft,
  deleteCueById,
  normalizeCueDraft,
  upsertCue
} from "./showfileEditor.mjs";

const cueList = document.getElementById("cue-list");
const cueCount = document.getElementById("cue-count");
const previewLabel = document.getElementById("preview-label");
const inspectorTitle = document.getElementById("inspector-title");
const inspectorOutputs = document.getElementById("inspector-outputs");
const inspectorTransitions = document.getElementById("inspector-transitions");
const inspectorNotes = document.getElementById("inspector-notes");
const inspectorSafety = document.getElementById("inspector-safety");
const statusLabel = document.getElementById("status-label");
const showfilePill = document.getElementById("showfile-pill");
const outputsPill = document.getElementById("outputs-pill");
const importButton = document.getElementById("import-showfile");
const showfileInput = document.getElementById("showfile-input");
const editorForm = document.getElementById("cue-editor-form");
const editorType = document.getElementById("editor-type");
const editorNewButton = document.getElementById("editor-new");
const editorDeleteButton = document.getElementById("editor-delete");
const editorImportAssetButton = document.getElementById("editor-import-asset");
const assetFileInput = document.getElementById("asset-file-input");
const exportButton = document.getElementById("export-showfile");
const globalNotesInput = document.getElementById("global-notes");
const saveGlobalNotesButton = document.getElementById("save-global-notes");
const quickNoteInput = document.getElementById("quick-note-text");
const addQuickNoteButton = document.getElementById("add-quick-note");
const runStatusLog = document.getElementById("run-status-log");

let currentShowTitle = "ACME_2026_Q1.oshow";
let currentOutputCount = 2;
let currentCues = cues;
let cueState = createCueState(currentCues, 1);
let globalNotesText = "";
const runStatusFeed = createRunStatusFeed();

for (const type of EDITOR_CUE_TYPES) {
  const option = document.createElement("option");
  option.value = type;
  option.textContent = type;
  editorType.appendChild(option);
}

function createShowfileExport() {
  return JSON.stringify(
    {
      schemaVersion: "0.1.0",
      metadata: {
        showId: "edited-mvp-show",
        title: currentShowTitle,
        revision: 1,
        createdAt: new Date().toISOString()
      },
      outputs: [
        { id: "out-program-1", name: "Program", role: "program", enabled: true },
        { id: "out-confidence-1", name: "Confidence", role: "confidence", enabled: true }
      ],
      runNotes: {
        global: globalNotesText,
        statusEvents: runStatusFeed.list()
      },
      cues: currentCues.map((cue) => {
        const cueRecord = {
          id: cue.id,
          type: cue.type,
          name: cue.name,
          meta: cue.meta,
          preview: cue.preview,
          notes: cue.notes,
          outputs: ["out-program-1"],
          transitions: cue.transitions,
          safety: cue.safety
        };

        if (cue.assetUri) {
          cueRecord.asset = { uri: cue.assetUri };
        }
        return cueRecord;
      })
    },
    null,
    2
  );
}

function formatLogTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function renderRunStatusLog() {
  const entries = runStatusFeed.list();
  runStatusLog.innerHTML = "";
  for (const entry of entries) {
    const item = document.createElement("div");
    item.className = "cueMeta";
    item.textContent = `[${formatLogTime(entry.timestamp)}] ${entry.message}`;
    runStatusLog.appendChild(item);
  }
}

function pushStatus(message, level = "info") {
  statusLabel.textContent = message;
  runStatusFeed.add(message, level);
  renderRunStatusLog();
}

function syncPills() {
  showfilePill.textContent = `Showfile: ${currentShowTitle}`;
  outputsPill.textContent = `Outputs: ${currentOutputCount} online`;
}

function readEditorDraft() {
  const formData = new FormData(editorForm);
  return {
    id: formData.get("id"),
    type: formData.get("type"),
    name: formData.get("name"),
    meta: formData.get("meta"),
    preview: formData.get("preview"),
    outputsText: formData.get("outputs"),
    transitionsText: formData.get("transitions"),
    notes: formData.get("notes"),
    safetyText: formData.get("safety"),
    assetUri: formData.get("assetUri")
  };
}

function setEditorFromCue(cue) {
  editorForm.elements.id.value = cue.id;
  editorForm.elements.type.value = cue.type;
  editorForm.elements.name.value = cue.name;
  editorForm.elements.meta.value = cue.meta;
  editorForm.elements.preview.value = cue.preview;
  editorForm.elements.outputs.value = cue.outputs.join("\n");
  editorForm.elements.transitions.value = cue.transitions.join("\n");
  editorForm.elements.notes.value = cue.notes;
  editorForm.elements.safety.value = cue.safety.join("\n");
  editorForm.elements.assetUri.value = cue.assetUri ?? "";
}

function setEditorFromDraft(draft) {
  editorForm.elements.id.value = draft.id;
  editorForm.elements.type.value = draft.type;
  editorForm.elements.name.value = draft.name;
  editorForm.elements.meta.value = draft.meta;
  editorForm.elements.preview.value = draft.preview;
  editorForm.elements.outputs.value = draft.outputsText;
  editorForm.elements.transitions.value = draft.transitionsText;
  editorForm.elements.notes.value = draft.notes;
  editorForm.elements.safety.value = draft.safetyText;
  editorForm.elements.assetUri.value = draft.assetUri;
}

function renderCueList(snapshot) {
  cueList.innerHTML = "";
  currentCues.forEach((cue, index) => {
    const item = document.createElement("div");
    item.className = "cue" + (index === snapshot.activeIndex ? " active" : "");
    item.setAttribute("data-index", String(index));
    item.innerHTML = `
      <div class="cueRow">
        <span class="cueId">${cue.id}</span>
        <span class="meta">${cue.type}</span>
      </div>
      <div class="cueName">${cue.name}</div>
      <div class="cueMeta">${cue.meta}</div>
    `;
    item.addEventListener("click", () => applySnapshot(cueState.setActive(index)));
    cueList.appendChild(item);
  });
  cueCount.textContent = `${snapshot.cueCount} cues`;
}

function applySnapshot(snapshot) {
  const cue = snapshot.activeCue;
  previewLabel.textContent = cue.preview;
  inspectorTitle.textContent = `Cue ${cue.id}`;
  inspectorOutputs.innerHTML = cue.outputs.join("<br />");
  inspectorTransitions.innerHTML = cue.transitions.join("<br />");
  inspectorNotes.textContent = cue.notes;
  inspectorSafety.innerHTML = cue.safety.join("<br />");
  setEditorFromCue(cue);
  renderCueList(snapshot);
}

function appendCueNote(cueId, noteText) {
  const timestamp = new Date().toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  currentCues = currentCues.map((cue) => {
    if (cue.id !== cueId) {
      return cue;
    }
    return {
      ...cue,
      notes: `${cue.notes}\n[${timestamp}] ${noteText}`
    };
  });
}

function replaceCueState(nextCues, activeIndex = 0, status = "Ready") {
  currentCues = nextCues;
  cueState = createCueState(currentCues, activeIndex);
  const snapshot = cueState.getSnapshot();
  applySnapshot(snapshot);
  pushStatus(status);
}

function goNext() {
  const snapshot = cueState.goNext();
  applySnapshot(snapshot);
  pushStatus(`GO ${snapshot.activeCue.id}`);
}

function goBack() {
  const snapshot = cueState.goBack();
  applySnapshot(snapshot);
  pushStatus(`BACK ${snapshot.activeCue.id}`);
}

function skipCue() {
  const snapshot = cueState.skipCue();
  applySnapshot(snapshot);
  pushStatus(`SKIP ${snapshot.activeCue.id}`);
}

function setLoadedShowfile(viewModel) {
  currentShowTitle = viewModel.title;
  currentOutputCount = viewModel.outputCount;
  syncPills();
  replaceCueState(viewModel.cues, 0, "Showfile loaded");
}

document.getElementById("btn-go").addEventListener("click", goNext);
document.getElementById("btn-back").addEventListener("click", goBack);
document.getElementById("btn-skip").addEventListener("click", skipCue);
document.getElementById("top-go").addEventListener("click", (event) => {
  event.preventDefault();
  goNext();
});

importButton.addEventListener("click", (event) => {
  event.preventDefault();
  showfileInput.click();
});

showfileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const viewModel = parseShowfileText(text);
    setLoadedShowfile(viewModel);
  } catch (error) {
    pushStatus(`Import failed: ${error.message}`, "error");
  } finally {
    showfileInput.value = "";
  }
});

editorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const cue = normalizeCueDraft(readEditorDraft());
    const next = upsertCue(currentCues, cue);
    replaceCueState(next.cues, next.activeIndex, "Cue saved");
  } catch (error) {
    pushStatus(`Save failed: ${error.message}`, "error");
  }
});

editorNewButton.addEventListener("click", (event) => {
  event.preventDefault();
  const draft = createCueDraft(currentCues);
  setEditorFromDraft(draft);
  pushStatus("New cue draft ready");
});

editorDeleteButton.addEventListener("click", (event) => {
  event.preventDefault();
  try {
    const cueId = editorForm.elements.id.value;
    const next = deleteCueById(currentCues, cueId);
    replaceCueState(next.cues, next.activeIndex, "Cue deleted");
  } catch (error) {
    pushStatus(`Delete failed: ${error.message}`, "error");
  }
});

editorImportAssetButton.addEventListener("click", (event) => {
  event.preventDefault();
  assetFileInput.click();
});

assetFileInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const record = createImportedAssetRecord(file);
    editorForm.elements.assetUri.value = record.assetUri;
    editorForm.elements.type.value = record.suggestedType;
    if (!editorForm.elements.preview.value) {
      editorForm.elements.preview.value = file.name;
    }
    pushStatus(`Asset linked: ${file.name}`);
  } catch (error) {
    pushStatus(`Asset import failed: ${error.message}`, "error");
  } finally {
    assetFileInput.value = "";
  }
});

saveGlobalNotesButton.addEventListener("click", (event) => {
  event.preventDefault();
  globalNotesText = globalNotesInput.value.trim();
  pushStatus("Global run notes saved");
});

addQuickNoteButton.addEventListener("click", (event) => {
  event.preventDefault();
  const noteText = quickNoteInput.value.trim();
  if (!noteText) {
    return;
  }

  const activeCueId = cueState.getSnapshot().activeCue.id;
  appendCueNote(activeCueId, noteText);
  applySnapshot(cueState.getSnapshot());
  quickNoteInput.value = "";
  pushStatus(`Cue note added to ${activeCueId}`);
});

exportButton.addEventListener("click", (event) => {
  event.preventDefault();
  const blob = new Blob([createShowfileExport()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "edited-showfile.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  pushStatus("Exported edited-showfile.json");
});

window.addEventListener("keydown", (event) => {
  const command = getTransportCommandForKeyEvent(event);
  if (!command) {
    return;
  }

  event.preventDefault();
  if (command === "GO") {
    goNext();
  } else if (command === "BACK") {
    goBack();
  } else if (command === "SKIP") {
    skipCue();
  }
});

syncPills();
applySnapshot(cueState.getSnapshot());
pushStatus("Session ready");
