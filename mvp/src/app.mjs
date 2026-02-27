import { cues } from "./cues.mjs";
import { createCueState } from "./cueState.mjs";
import { getTransportCommandForKeyEvent } from "./hotkeys.mjs";
import { parseShowfileText } from "./showfileLoader.mjs";
import { parseShowfileObject } from "./showfileLoader.mjs";
import { createImportedAssetRecord, inferCueTypeForAsset } from "./assetImport.mjs";
import { createRunStatusFeed } from "./runStatus.mjs";
import {
  deleteShowFromApi,
  listAssetsFromApi,
  listShowsFromApi,
  loadShowFromApi,
  pingApiHealth,
  saveShowToApi,
  uploadAssetToApi
} from "./showApiClient.mjs";
import { formatApiError, normalizeApiBase } from "./apiUx.mjs";
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
const saveStatePill = document.getElementById("save-state-pill");
const apiStatusPill = document.getElementById("api-status-pill");
const importButton = document.getElementById("import-showfile");
const showfileInput = document.getElementById("showfile-input");
const editorForm = document.getElementById("cue-editor-form");
const editorType = document.getElementById("editor-type");
const editorNewButton = document.getElementById("editor-new");
const editorDeleteButton = document.getElementById("editor-delete");
const editorImportAssetButton = document.getElementById("editor-import-asset");
const assetFileInput = document.getElementById("asset-file-input");
const assetLibraryRefreshButton = document.getElementById("asset-library-refresh");
const assetLibraryList = document.getElementById("asset-library-list");
const exportButton = document.getElementById("export-showfile");
const saveToDbButton = document.getElementById("save-to-db");
const loadFromDbButton = document.getElementById("load-from-db");
const testApiButton = document.getElementById("test-api");
const apiBaseInput = document.getElementById("api-base-input");
const showIdInput = document.getElementById("show-id-input");
const showTitleInput = document.getElementById("show-title-input");
const showLibraryRefreshButton = document.getElementById("show-library-refresh");
const showLibraryList = document.getElementById("show-library-list");
const globalNotesInput = document.getElementById("global-notes");
const saveGlobalNotesButton = document.getElementById("save-global-notes");
const quickNoteInput = document.getElementById("quick-note-text");
const addQuickNoteButton = document.getElementById("add-quick-note");
const runStatusLog = document.getElementById("run-status-log");

let currentShowTitle = "ACME_2026_Q1.oshow";
let currentOutputCount = 2;
let currentRevision = 1;
let currentOutputs = [
  { id: "out-program-1", name: "Output 1", role: "program", enabled: true },
  { id: "out-confidence-2", name: "Output 2", role: "confidence", enabled: true }
];
let currentCues = cues;
let cueState = createCueState(currentCues, 1);
let globalNotesText = "";
const runStatusFeed = createRunStatusFeed();
const runtimeAssetByCueId = new Map();
let persistedAssets = [];
let persistedShows = [];
const SESSION_LAST_SHOW_ID_KEY = "openshow.lastShowId";
const SESSION_API_BASE_KEY = "openshow.apiBase";
const AUTOSAVE_DELAY_MS = 2500;
const AUTOSAVE_RETRY_MS = 10000;
const browserStorage = (() => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
})();
let hasUnsavedChanges = false;
let autosaveTimerId = null;
let autosaveInFlight = false;
let lastAutosaveErrorAt = 0;
showIdInput.value = "edited-mvp-show";
showTitleInput.value = currentShowTitle;
apiBaseInput.value = normalizeApiBase(browserStorage?.getItem(SESSION_API_BASE_KEY) ?? "");

for (const type of EDITOR_CUE_TYPES) {
  const option = document.createElement("option");
  option.value = type;
  option.textContent = type;
  editorType.appendChild(option);
}

function normalizeOutputRole(role) {
  const normalized = String(role ?? "operator").trim().toLowerCase();
  return ["program", "confidence", "operator"].includes(normalized) ? normalized : "operator";
}

function formatOutputLabel(output) {
  const roleTitle = output.role.charAt(0).toUpperCase() + output.role.slice(1);
  return `${roleTitle} - ${output.name}`;
}

function inferRoleFromLabel(label) {
  const normalized = String(label ?? "").trim().toLowerCase();
  if (normalized.startsWith("program -")) {
    return "program";
  }
  if (normalized.startsWith("confidence -")) {
    return "confidence";
  }
  if (normalized.startsWith("operator -")) {
    return "operator";
  }
  return "operator";
}

function normalizeOutputLabelKey(label) {
  return String(label ?? "").trim().toLowerCase();
}

function toSlug(input) {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "output";
}

function buildUniqueOutputId(role, name, usedIds) {
  const base = `out-${toSlug(role)}-${toSlug(name)}`;
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }

  let suffix = 2;
  while (usedIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  const unique = `${base}-${suffix}`;
  usedIds.add(unique);
  return unique;
}

function buildOutputDefinitionState() {
  const defaultOutputs = [{ id: "out-program-1", name: "Output 1", role: "program", enabled: true }];
  const startingOutputs = currentOutputs.length > 0 ? currentOutputs : defaultOutputs;
  const outputs = [];
  const outputIdByLabel = new Map();
  const usedIds = new Set();

  for (const output of startingOutputs) {
    const role = normalizeOutputRole(output.role);
    const name = String(output.name ?? "Output").trim() || "Output";
    const id = String(output.id ?? "").trim() || buildUniqueOutputId(role, name, usedIds);
    usedIds.add(id);
    const normalized = { id, name, role, enabled: output.enabled !== false };
    outputs.push(normalized);
    outputIdByLabel.set(normalizeOutputLabelKey(formatOutputLabel(normalized)), normalized.id);
  }

  for (const cue of currentCues) {
    const labels = Array.isArray(cue.outputs) ? cue.outputs : [];
    for (const rawLabel of labels) {
      const label = String(rawLabel ?? "").trim();
      const labelKey = normalizeOutputLabelKey(label);
      if (!labelKey || outputIdByLabel.has(labelKey)) {
        continue;
      }
      const role = inferRoleFromLabel(label);
      const nameParts = label.split(" - ");
      const name = nameParts.length > 1 ? nameParts.slice(1).join(" - ").trim() || "Output" : label;
      const id = buildUniqueOutputId(role, name, usedIds);
      const normalized = { id, name, role, enabled: true };
      outputs.push(normalized);
      outputIdByLabel.set(labelKey, normalized.id);
    }
  }

  return { outputs, outputIdByLabel };
}

function createShowfileObject() {
  const showId = String(showIdInput.value ?? "").trim() || "edited-mvp-show";
  const title = String(showTitleInput.value ?? "").trim() || "Untitled Show";
  const { outputs, outputIdByLabel } = buildOutputDefinitionState();
  const fallbackOutputId = outputs[0]?.id ?? "out-program-1";

  return {
    schemaVersion: "0.1.0",
    metadata: {
      showId,
      title,
      revision: Math.max(1, Number(currentRevision ?? 1)),
      createdAt: new Date().toISOString()
    },
    outputs,
    runNotes: {
      global: globalNotesText,
      statusEvents: runStatusFeed.list()
    },
    cues: currentCues.map((cue) => {
      const cueOutputLabels = Array.isArray(cue.outputs)
        ? cue.outputs.map((output) => String(output ?? "").trim()).filter(Boolean)
        : [];
      const cueOutputIds = cueOutputLabels
        .map((label) => outputIdByLabel.get(normalizeOutputLabelKey(label)))
        .filter(Boolean);

      if (cueOutputIds.length === 0) {
        cueOutputIds.push(fallbackOutputId);
      }

      const cueRecord = {
        id: cue.id,
        type: cue.type,
        name: cue.name,
        meta: cue.meta,
        preview: cue.preview,
        notes: cue.notes,
        outputs: cueOutputIds,
        transitions: cue.transitions,
        safety: cue.safety
      };

      if (cue.assetUri) {
        cueRecord.asset = { uri: cue.assetUri };
      }
      return cueRecord;
    })
  };
}

function createShowfileExport() {
  return JSON.stringify(createShowfileObject(), null, 2);
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

function getApiBase() {
  return normalizeApiBase(apiBaseInput.value);
}

function setApiStatus(isOnline) {
  apiStatusPill.textContent = `API: ${isOnline ? "online" : "offline"}`;
  apiStatusPill.style.color = isOnline ? "var(--mint)" : "var(--red)";
}

function setSaveState(mode) {
  if (mode === "saved") {
    saveStatePill.textContent = "Changes: saved";
    saveStatePill.style.color = "var(--mint)";
    return;
  }

  if (mode === "dirty") {
    saveStatePill.textContent = "Changes: unsaved";
    saveStatePill.style.color = "var(--accent2)";
    return;
  }

  if (mode === "autosaving") {
    saveStatePill.textContent = "Changes: autosaving";
    saveStatePill.style.color = "var(--accent)";
    return;
  }

  if (mode === "blocked") {
    saveStatePill.textContent = "Changes: fix cue form";
    saveStatePill.style.color = "var(--red)";
    return;
  }

  saveStatePill.textContent = "Changes: autosave failed";
  saveStatePill.style.color = "var(--red)";
}

function rememberApiBase() {
  if (!browserStorage) {
    return;
  }
  browserStorage.setItem(SESSION_API_BASE_KEY, String(apiBaseInput.value ?? "").trim());
}

function rememberLastShowId(showId) {
  if (!browserStorage) {
    return;
  }
  const normalized = String(showId ?? "").trim();
  if (!normalized) {
    browserStorage.removeItem(SESSION_LAST_SHOW_ID_KEY);
    return;
  }
  browserStorage.setItem(SESSION_LAST_SHOW_ID_KEY, normalized);
}

function readRememberedLastShowId() {
  if (!browserStorage) {
    return "";
  }
  return String(browserStorage.getItem(SESSION_LAST_SHOW_ID_KEY) ?? "").trim();
}

function syncGlobalNotesDraft() {
  globalNotesText = globalNotesInput.value.trim();
}

function clearAutosaveTimer() {
  if (autosaveTimerId !== null) {
    clearTimeout(autosaveTimerId);
    autosaveTimerId = null;
  }
}

function markSaved() {
  hasUnsavedChanges = false;
  clearAutosaveTimer();
  setSaveState("saved");
}

function scheduleAutosave(delayMs = AUTOSAVE_DELAY_MS) {
  clearAutosaveTimer();
  autosaveTimerId = setTimeout(() => {
    autosaveTimerId = null;
    void runAutosave();
  }, delayMs);
}

function markDirty() {
  hasUnsavedChanges = true;
  if (!autosaveInFlight) {
    setSaveState("dirty");
  }
  scheduleAutosave();
}

function formatSize(sizeBytes) {
  const bytes = Number(sizeBytes ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function applyPersistedAssetToEditor(asset) {
  editorForm.elements.assetUri.value = asset.uri;
  editorForm.elements.type.value = inferCueTypeForAsset(asset.fileName, asset.contentType);
  if (!editorForm.elements.preview.value) {
    editorForm.elements.preview.value = asset.fileName;
  }
  markDirty();
  pushStatus(`Asset URI selected: ${asset.fileName}. Save cue to persist.`);
}

function renderAssetLibrary() {
  assetLibraryList.innerHTML = "";
  if (persistedAssets.length === 0) {
    const empty = document.createElement("div");
    empty.className = "assetMeta";
    empty.textContent = "No persisted assets yet.";
    assetLibraryList.appendChild(empty);
    return;
  }

  for (const asset of persistedAssets) {
    const item = document.createElement("div");
    item.className = "assetRow";

    const top = document.createElement("div");
    top.className = "assetRowTop";
    const name = document.createElement("div");
    name.className = "assetName";
    name.textContent = asset.fileName;
    const useButton = document.createElement("button");
    useButton.className = "ghost";
    useButton.type = "button";
    useButton.textContent = "Use";
    useButton.addEventListener("click", () => applyPersistedAssetToEditor(asset));
    top.append(name, useButton);

    const meta = document.createElement("div");
    meta.className = "assetMeta";
    meta.textContent = `${asset.contentType || "application/octet-stream"} • ${formatSize(asset.sizeBytes)}`;

    const uri = document.createElement("div");
    uri.className = "assetMeta";
    uri.textContent = asset.uri;

    item.append(top, meta, uri);
    assetLibraryList.appendChild(item);
  }
}

async function refreshAssetLibrary(options = {}) {
  const silent = options.silent === true;
  try {
    persistedAssets = await listAssetsFromApi({ apiBase: getApiBase() });
    renderAssetLibrary();
    setApiStatus(true);
    if (!silent) {
      pushStatus(`Loaded ${persistedAssets.length} asset(s) from library`);
    }
  } catch (error) {
    setApiStatus(false);
    if (!silent) {
      pushStatus(formatApiError("Asset library", error, getApiBase()), "error");
    }
  }
}

function formatUpdatedAt(value) {
  if (!value) {
    return "unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }
  return date.toLocaleString();
}

function renderShowLibrary() {
  showLibraryList.innerHTML = "";
  if (persistedShows.length === 0) {
    const empty = document.createElement("div");
    empty.className = "assetMeta";
    empty.textContent = "No saved shows yet.";
    showLibraryList.appendChild(empty);
    return;
  }

  for (const show of persistedShows) {
    const item = document.createElement("div");
    item.className = "assetRow";

    const top = document.createElement("div");
    top.className = "assetRowTop";
    const name = document.createElement("div");
    name.className = "assetName";
    name.textContent = show.title || show.showId;

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";

    const loadButton = document.createElement("button");
    loadButton.className = "ghost";
    loadButton.type = "button";
    loadButton.textContent = "Load";
    loadButton.addEventListener("click", async () => {
      try {
        showIdInput.value = show.showId;
        await loadShowById(show.showId);
      } catch (error) {
        setApiStatus(false);
        pushStatus(formatApiError("DB load", error, getApiBase()), "error");
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "ghost";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      try {
        await deleteShowFromApi(show.showId, { apiBase: getApiBase() });
        if (showIdInput.value.trim() === show.showId) {
          showIdInput.value = "";
          rememberLastShowId("");
        }
        await refreshShowLibrary({ silent: true });
        pushStatus(`Deleted show from DB: ${show.showId}`);
      } catch (error) {
        setApiStatus(false);
        pushStatus(formatApiError("DB delete", error, getApiBase()), "error");
      }
    });

    actions.append(loadButton, deleteButton);
    top.append(name, actions);

    const meta = document.createElement("div");
    meta.className = "assetMeta";
    meta.textContent = `${show.showId} • rev ${show.revision ?? 1} • ${show.cueCount ?? 0} cues`;

    const updated = document.createElement("div");
    updated.className = "assetMeta";
    updated.textContent = `Updated ${formatUpdatedAt(show.updatedAt)}`;

    item.append(top, meta, updated);
    showLibraryList.appendChild(item);
  }
}

async function refreshShowLibrary(options = {}) {
  const silent = options.silent === true;
  try {
    persistedShows = await listShowsFromApi({ apiBase: getApiBase() });
    renderShowLibrary();
    setApiStatus(true);
    if (!silent) {
      pushStatus(`Loaded ${persistedShows.length} show(s) from library`);
    }
  } catch (error) {
    setApiStatus(false);
    if (!silent) {
      pushStatus(formatApiError("Show library", error, getApiBase()), "error");
    }
  }
}

async function loadShowById(showId) {
  const trimmedShowId = String(showId ?? "").trim();
  if (!trimmedShowId) {
    pushStatus("Enter a show id before loading", "error");
    return;
  }

  showIdInput.value = trimmedShowId;
  const storedShow = await loadShowFromApi(trimmedShowId, { apiBase: getApiBase() });
  const viewModel = parseShowfileObject(storedShow.showfile);
  setLoadedShowfile(viewModel);
  markSaved();
  setApiStatus(true);
  rememberLastShowId(trimmedShowId);
  await refreshShowLibrary({ silent: true });
  pushStatus(`Loaded show from DB: ${trimmedShowId}`);
}

async function restoreLastShowFromSession() {
  const rememberedShowId = readRememberedLastShowId();
  if (!rememberedShowId) {
    return;
  }

  showIdInput.value = rememberedShowId;
  try {
    await loadShowById(rememberedShowId);
  } catch (error) {
    rememberLastShowId("");
    showIdInput.value = "";
    const message = String(error?.message ?? "");
    if (/show not found/i.test(message)) {
      pushStatus("No saved session found for last show id. Use Show Library or save a new show.");
      return;
    }
    pushStatus(formatApiError("Session restore", error, getApiBase()), "error");
  }
}

async function persistCurrentShow(options = {}) {
  const mode = options.mode ?? "manual";
  const silentDraftError = mode === "autosave";
  if (!commitEditorDraftToState({ errorPrefix: "DB save cue sync", silent: silentDraftError })) {
    return { ok: false, reason: "draft" };
  }

  syncGlobalNotesDraft();
  const showfile = createShowfileObject();
  const storedShow = await saveShowToApi(showfile, { apiBase: getApiBase() });

  showIdInput.value = storedShow.showId;
  currentShowTitle = storedShow.title;
  showTitleInput.value = currentShowTitle;
  const parsedRevision = Number(storedShow.revision ?? currentRevision);
  currentRevision = Number.isFinite(parsedRevision) && parsedRevision > 0
    ? Math.floor(parsedRevision)
    : currentRevision;
  currentOutputCount = showfile.outputs.length;
  currentOutputs = showfile.outputs;
  syncPills();
  setApiStatus(true);
  rememberLastShowId(storedShow.showId);
  await refreshShowLibrary({ silent: true });

  return { ok: true, storedShow };
}

async function runAutosave() {
  if (!hasUnsavedChanges || autosaveInFlight) {
    return;
  }

  autosaveInFlight = true;
  setSaveState("autosaving");

  try {
    const result = await persistCurrentShow({ mode: "autosave" });
    if (!result.ok) {
      setSaveState("blocked");
      scheduleAutosave(AUTOSAVE_RETRY_MS);
      return;
    }

    markSaved();
  } catch (error) {
    setApiStatus(false);
    setSaveState("error");
    if (Date.now() - lastAutosaveErrorAt > 30000) {
      pushStatus(formatApiError("Autosave", error, getApiBase()), "error");
      lastAutosaveErrorAt = Date.now();
    }
    scheduleAutosave(AUTOSAVE_RETRY_MS);
  } finally {
    autosaveInFlight = false;
  }
}

function renderProgramPreview(cue) {
  const runtimeAsset = runtimeAssetByCueId.get(cue.id);
  const persistentAssetUri = cue.assetUri ?? "";
  previewLabel.innerHTML = "";

  if (!runtimeAsset && !persistentAssetUri) {
    previewLabel.textContent = cue.preview;
    return;
  }

  const mediaType = runtimeAsset?.mimeType?.toLowerCase() ?? "";
  const fileName = runtimeAsset?.fileName?.toLowerCase() ?? persistentAssetUri.toLowerCase();
  const sourceUri = runtimeAsset?.objectUrl ?? persistentAssetUri;
  const isImage = mediaType.startsWith("image/") || cue.type === "IMG";
  const isVideo = mediaType.startsWith("video/") || cue.type === "VID";
  const isAudio = mediaType.startsWith("audio/") || cue.type === "AUDIO" || cue.type === "STINGER";
  const isPdf = mediaType === "application/pdf" || fileName.endsWith(".pdf");

  if (isImage) {
    const image = document.createElement("img");
    image.src = sourceUri;
    image.alt = cue.name;
    image.className = "previewAsset";
    previewLabel.appendChild(image);
    return;
  }

  if (isVideo) {
    const video = document.createElement("video");
    video.src = sourceUri;
    video.className = "previewAsset";
    video.controls = true;
    video.playsInline = true;
    previewLabel.appendChild(video);
    return;
  }

  if (isAudio) {
    const wrap = document.createElement("div");
    wrap.className = "previewAudio";
    wrap.textContent = runtimeAsset?.fileName ?? cue.assetUri ?? cue.name;
    const audio = document.createElement("audio");
    audio.src = sourceUri;
    audio.controls = true;
    wrap.appendChild(audio);
    previewLabel.appendChild(wrap);
    return;
  }

  if (isPdf) {
    const frame = document.createElement("iframe");
    frame.src = sourceUri;
    frame.className = "previewAsset";
    frame.title = cue.name;
    previewLabel.appendChild(frame);
    return;
  }

  previewLabel.textContent = cue.preview;
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

function commitEditorDraftToState(options = {}) {
  const errorPrefix = options.errorPrefix ?? "Cue save";
  const silent = options.silent === true;

  try {
    const previousCueId = cueState.getSnapshot().activeCue.id;
    const cue = normalizeCueDraft(readEditorDraft());
    if (previousCueId !== cue.id && runtimeAssetByCueId.has(previousCueId)) {
      const runtimeAsset = runtimeAssetByCueId.get(previousCueId);
      runtimeAssetByCueId.set(cue.id, runtimeAsset);
      runtimeAssetByCueId.delete(previousCueId);
    }
    const next = upsertCue(currentCues, cue);
    currentCues = next.cues;
    cueState = createCueState(currentCues, next.activeIndex);
    applySnapshot(cueState.getSnapshot());
    return true;
  } catch (error) {
    if (!silent) {
      pushStatus(`${errorPrefix} failed: ${error.message}`, "error");
    }
    return false;
  }
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
  renderProgramPreview(cue);
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
  const validCueIds = new Set(nextCues.map((cue) => cue.id));
  for (const [cueId, runtimeAsset] of runtimeAssetByCueId.entries()) {
    if (validCueIds.has(cueId)) {
      continue;
    }
    URL.revokeObjectURL(runtimeAsset.objectUrl);
    runtimeAssetByCueId.delete(cueId);
  }

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
  const parsedRevision = Number(viewModel.revision ?? 1);
  currentRevision = Number.isFinite(parsedRevision) && parsedRevision > 0 ? Math.floor(parsedRevision) : 1;
  currentOutputs = Array.isArray(viewModel.outputs) ? viewModel.outputs : currentOutputs;
  currentOutputCount = viewModel.outputCount;
  globalNotesText = String(viewModel.runNotesGlobal ?? "");
  globalNotesInput.value = globalNotesText;
  if (viewModel.showId) {
    showIdInput.value = viewModel.showId;
  }
  showTitleInput.value = currentShowTitle;
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

showTitleInput.addEventListener("input", () => {
  currentShowTitle = String(showTitleInput.value ?? "").trim() || "Untitled Show";
  syncPills();
  markDirty();
});

showIdInput.addEventListener("input", () => {
  markDirty();
});

globalNotesInput.addEventListener("input", () => {
  markDirty();
});

apiBaseInput.addEventListener("change", () => {
  rememberApiBase();
});

apiBaseInput.addEventListener("input", () => {
  rememberApiBase();
});

editorForm.addEventListener("input", () => {
  markDirty();
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
    markDirty();
    pushStatus("Showfile imported. Save to DB to persist.");
  } catch (error) {
    pushStatus(`Import failed: ${error.message}`, "error");
  } finally {
    showfileInput.value = "";
  }
});

editorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (commitEditorDraftToState({ errorPrefix: "Cue save" })) {
    markDirty();
    pushStatus("Cue saved");
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
    if (runtimeAssetByCueId.has(cueId)) {
      URL.revokeObjectURL(runtimeAssetByCueId.get(cueId).objectUrl);
      runtimeAssetByCueId.delete(cueId);
    }
    const next = deleteCueById(currentCues, cueId);
    replaceCueState(next.cues, next.activeIndex, "Cue deleted");
    markDirty();
  } catch (error) {
    pushStatus(`Delete failed: ${error.message}`, "error");
  }
});

editorImportAssetButton.addEventListener("click", (event) => {
  event.preventDefault();
  assetFileInput.click();
});

assetLibraryRefreshButton.addEventListener("click", async (event) => {
  event.preventDefault();
  await refreshAssetLibrary();
});

showLibraryRefreshButton.addEventListener("click", async (event) => {
  event.preventDefault();
  await refreshShowLibrary();
});

assetFileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const record = createImportedAssetRecord(file);
    let persistedAssetUri = record.assetUri;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
      }
      const assetUpload = await uploadAssetToApi(
        {
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          dataBase64: btoa(binary)
        },
        { apiBase: getApiBase() }
      );
      persistedAssetUri = assetUpload.uri ?? persistedAssetUri;
      setApiStatus(true);
      await refreshAssetLibrary({ silent: true });
    } catch (uploadError) {
      setApiStatus(false);
      pushStatus(formatApiError("Asset upload", uploadError, getApiBase()), "error");
    }

    const cueId = String(editorForm.elements.id.value).trim();
    if (cueId && runtimeAssetByCueId.has(cueId)) {
      URL.revokeObjectURL(runtimeAssetByCueId.get(cueId).objectUrl);
    }
    if (cueId) {
      runtimeAssetByCueId.set(cueId, {
        objectUrl: URL.createObjectURL(file),
        mimeType: file.type,
        fileName: file.name
      });
    }
    editorForm.elements.assetUri.value = persistedAssetUri;
    editorForm.elements.type.value = record.suggestedType;
    if (!editorForm.elements.preview.value) {
      editorForm.elements.preview.value = file.name;
    }
    renderProgramPreview(cueState.getSnapshot().activeCue);
    markDirty();
    pushStatus(`Asset linked: ${file.name}`);
  } catch (error) {
    pushStatus(formatApiError("Asset import", error, getApiBase()), "error");
  } finally {
    assetFileInput.value = "";
  }
});

saveGlobalNotesButton.addEventListener("click", (event) => {
  event.preventDefault();
  syncGlobalNotesDraft();
  markDirty();
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
  markDirty();
  pushStatus(`Cue note added to ${activeCueId}`);
});

exportButton.addEventListener("click", (event) => {
  event.preventDefault();
  if (!commitEditorDraftToState({ errorPrefix: "Export cue sync" })) {
    return;
  }
  syncGlobalNotesDraft();
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

saveToDbButton.addEventListener("click", async (event) => {
  event.preventDefault();
  clearAutosaveTimer();
  setSaveState("autosaving");
  try {
    const result = await persistCurrentShow({ mode: "manual" });
    if (!result.ok) {
      setSaveState("blocked");
      return;
    }

    markSaved();
    pushStatus(`Saved show to DB: ${result.storedShow.showId}`);
  } catch (error) {
    setApiStatus(false);
    setSaveState("error");
    hasUnsavedChanges = true;
    scheduleAutosave(AUTOSAVE_RETRY_MS);
    pushStatus(formatApiError("DB save", error, getApiBase()), "error");
  }
});

loadFromDbButton.addEventListener("click", async (event) => {
  event.preventDefault();
  try {
    await loadShowById(showIdInput.value.trim());
  } catch (error) {
    setApiStatus(false);
    pushStatus(formatApiError("DB load", error, getApiBase()), "error");
  }
});

testApiButton.addEventListener("click", async (event) => {
  event.preventDefault();
  try {
    const health = await pingApiHealth({ apiBase: getApiBase() });
    setApiStatus(true);
    await refreshAssetLibrary({ silent: true });
    await refreshShowLibrary({ silent: true });
    pushStatus(`API online (${health.storageMode ?? "runtime"} storage)`);
  } catch (error) {
    setApiStatus(false);
    pushStatus(formatApiError("API check", error, getApiBase()), "error");
  }
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
setApiStatus(false);
setSaveState("saved");
renderAssetLibrary();
renderShowLibrary();
void refreshAssetLibrary({ silent: true });
void refreshShowLibrary({ silent: true });
applySnapshot(cueState.getSnapshot());
pushStatus("Session ready");
void restoreLastShowFromSession();
