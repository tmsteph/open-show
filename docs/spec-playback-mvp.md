# OpenShow Playback MVP Spec

Last updated: 2026-02-26

## Goal
Deliver a browser-first playback system that can run a corporate show cue stack reliably on an operator laptop, replacing a typical presentation + media playback stack.

## In Scope
- Cue list with CRUD for `PPT`, `IMG`, `VID`, `BLACK`, and `FREEZE` cues.
- Deterministic cue transport: `GO`, `BACK`, `SKIP`.
- Operator hotkeys for transport actions.
- Run-of-show notes attached to cues and global show notes.
- Output mapping model for:
  - `program`
  - `confidence`
  - `operator`
- Health surface for output and engine telemetry (fps, drops, connected state).
- Offline-first behavior for local execution when network is unavailable.

## Out of Scope (Phase 1)
- Lighting protocol output (DMX/sACN/Art-Net).
- Audio routing and console replacement.
- Distributed control plane failover.
- Cloud account requirements for local show playback.
- Collaborative multi-operator editing.

## User Roles
- Operator (primary): builds and runs cue stacks.
- Stage Manager (secondary): consumes status and notes.

## Primary Workflow
1. Load showfile.
2. Verify output mappings and health.
3. Select starting cue.
4. Run show with `GO`/`BACK`/`SKIP` and hotkeys.
5. Trigger panic action if required (`BLACK` output safe state).
6. Save run metadata and notes on completion.

## Non-Functional Requirements
- Cue transport response under 100ms for local actions.
- No dependency on internet to run a showfile already available locally.
- Crash-safe autosave of operator state at least every 10 seconds.
- Recovery path documented for operator laptop failure.

## MVP Acceptance Criteria
- 30+ cue sample show runs end-to-end without crash.
- Transport behavior is deterministic and test-covered.
- At least one sample showfile validates against schema.
- README includes local run and verification commands.

## Phase 1 Scope Freeze
- Freeze date: 2026-02-26.
- This document defines the locked scope for Phase 1 implementation and acceptance.
- Any scope additions or removals require a roadmap update in `DEVELOPMENT_MAP.md` and explicit note in this spec.
