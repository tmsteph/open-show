# OpenShow Development Map

Updated: 2026-02-26

## Purpose
Build a production-ready, browser-first show control platform, starting with a corporate playback MVP that can replace a typical QLab + presentation stack.

## Current Baseline
- [x] Vision/architecture/roadmap landing page exists in [`index.html`](/home/tmsteph/open-show/index.html).
- [x] Interactive MVP UI mock exists in [`mvp/index.html`](/home/tmsteph/open-show/mvp/index.html).
- [ ] No backend engine, showfile persistence, or output control yet.
- [x] Minimal automated tests now cover cue progression logic.

## Phase Plan
## Phase 0: Spec + Repo Foundation
Goal: lock scope and create implementation skeleton.

Deliverables
- [x] Product spec for Playback MVP (`docs/spec-playback-mvp.md`).
- [x] Showfile schema v0 (`docs/showfile.schema.json`).
- [ ] Repo structure for app, engine, and adapters.
- [x] Local dev workflow (`README` commands + scripts).
- [x] CI basics (lint + test on pull requests).

Exit Criteria
- [ ] MVP scope is frozen for Phase 1.
- [x] At least one sample showfile validates against schema.

## Phase 1: Corporate Playback MVP
Goal: run real rehearsals/shows for slide/video playback with cueing and operator notes.

Deliverables
- [ ] Cue list CRUD (PPT/image/video/black/freeze cues).
- [ ] Transport controls (GO/BACK/SKIP, hotkeys, panic actions).
- [ ] Run-of-show notes and status panel.
- [ ] Multi-output mapping model (program/confidence/operator).
- [ ] Health page (fps, drops, connected outputs).
- [ ] Offline-first behavior for local show execution.

Exit Criteria
- [ ] Can execute a 30+ cue sample show end-to-end without crashes.
- [ ] Recovery procedure documented for operator laptop failure.

## Phase 2: Lighting Adapter Layer
Goal: add entry-level lighting control integrated with cue execution.

Deliverables
- [ ] USB DMX adapter abstraction.
- [ ] sACN/Art-Net output support.
- [ ] Scene/looks library with cue triggers.
- [ ] Basic live override controls.

Exit Criteria
- [ ] Lighting cues trigger reliably in rehearsal with telemetry.

## Phase 3: Audio Control + Monitoring
Goal: add control and observability for audio paths (not console replacement).

Deliverables
- [ ] USB audio route management.
- [ ] OSC/MIDI control bridges.
- [ ] Device and route health telemetry.
- [ ] Cue-linked audio actions.

Exit Criteria
- [ ] Audio control and monitoring stable during full run-through.

## Phase 4: Edge Nodes + Redundancy
Goal: make distributed operation resilient and recoverable.

Deliverables
- [ ] Node agent for near-output deployment.
- [ ] Discovery and heartbeat system.
- [ ] Leader election/failover for control plane.
- [ ] Safe fallback states on disconnect.
- [ ] Diagnostic support bundle export.

Exit Criteria
- [ ] System tolerates FOH client dropouts without cue corruption.

## Phase 5: Network-Native Endpoints
Goal: replace adapter-heavy stacks with open, network-first devices.

Deliverables
- [ ] Endpoint protocol contracts.
- [ ] Firmware update + rollback strategy.
- [ ] Open telemetry model for diagnostics.
- [ ] Reference designs for at least one endpoint class.

Exit Criteria
- [ ] First network-native endpoint controlled by OpenShow in test environment.

## Phase 6: Open Ecosystem
Goal: grow integrations and community-driven extensions.

Deliverables
- [ ] Public SDK and protocol docs.
- [ ] Driver/plugin contribution workflow.
- [ ] Compatibility matrix and conformance tests.
- [ ] Example integrations and starter templates.

Exit Criteria
- [ ] External contributors ship maintained integrations.

## Execution Cadence
Use 2-week iterations with this rhythm:
1. Plan: choose 3-5 map items for the sprint.
2. Build: ship vertical slices, not isolated components.
3. Verify: rehearsal-style testing with a sample showfile.
4. Review: demo, capture failures, update this map.

## Immediate Next Sprint (Recommended)
1. [x] Create `docs/spec-playback-mvp.md` with explicit in/out scope.
2. [x] Define `docs/showfile.schema.json` and add sample showfile fixtures.
3. [x] Split current MVP demo into app shell + state model modules.
4. [x] Add a minimal test harness for cue progression logic.
5. [x] Document run commands and architecture notes in README.
