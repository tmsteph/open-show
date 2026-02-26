import { cues } from "./cues.mjs";
import { createCueState } from "./cueState.mjs";
import { getTransportCommandForKeyEvent } from "./hotkeys.mjs";

const cueList = document.getElementById("cue-list");
const cueCount = document.getElementById("cue-count");
const previewLabel = document.getElementById("preview-label");
const inspectorTitle = document.getElementById("inspector-title");
const inspectorOutputs = document.getElementById("inspector-outputs");
const inspectorTransitions = document.getElementById("inspector-transitions");
const inspectorNotes = document.getElementById("inspector-notes");
const inspectorSafety = document.getElementById("inspector-safety");
const statusLabel = document.getElementById("status-label");

const cueState = createCueState(cues, 1);

function renderCueList(snapshot) {
  cueList.innerHTML = "";
  cues.forEach((cue, index) => {
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
  statusLabel.textContent = snapshot.status;
  renderCueList(snapshot);
}

function goNext() {
  applySnapshot(cueState.goNext());
}

function goBack() {
  applySnapshot(cueState.goBack());
}

function skipCue() {
  applySnapshot(cueState.skipCue());
}

document.getElementById("btn-go").addEventListener("click", goNext);
document.getElementById("btn-back").addEventListener("click", goBack);
document.getElementById("btn-skip").addEventListener("click", skipCue);
document.getElementById("top-go").addEventListener("click", (event) => {
  event.preventDefault();
  goNext();
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

applySnapshot(cueState.getSnapshot());
