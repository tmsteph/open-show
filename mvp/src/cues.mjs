export const cues = [
  {
    id: "Q-001",
    type: "PPT",
    name: "Welcome Loop",
    meta: "Lobby video - 00:34 - Auto-continue",
    preview: "WELCOME_LOOP",
    outputs: ["Program - Output 1", "Confidence - Output 2"],
    transitions: ["Fade in 0.8s", "Fade out 0.4s"],
    notes: "Lobby loop while doors open.",
    safety: ["Blackout on panic", "Replay safe"]
  },
  {
    id: "Q-002",
    type: "PPT",
    name: "Keynote Deck",
    meta: "Slide 12/54 - Confidence + Program",
    preview: "KEYNOTE_DECK_SLIDE_12",
    outputs: ["Program - Output 1", "Confidence - Output 2"],
    transitions: ["Cut", "Cut"],
    notes: "Hold on intro slide until presenter nods.",
    safety: ["Blackout on panic", "Replay safe"]
  },
  {
    id: "Q-003",
    type: "VID",
    name: "Brand Sizzle",
    meta: "1080p - 01:10 - Fade 1.0s",
    preview: "BRAND_SIZZLE_1080P",
    outputs: ["Program - Output 1", "Confidence - Output 2"],
    transitions: ["Fade in 1.0s", "Fade out 1.0s"],
    notes: "Trigger on walk-on.",
    safety: ["Blackout on panic", "Replay safe"]
  },
  {
    id: "Q-004",
    type: "IMG",
    name: "Break Slide",
    meta: "Static - Auto blackout on advance",
    preview: "BREAK_SLIDE",
    outputs: ["Program - Output 1"],
    transitions: ["Cut", "Fade out 0.5s"],
    notes: "Auto blackout on advance.",
    safety: ["Blackout on panic", "Replay safe"]
  },
  {
    id: "Q-005",
    type: "PPT",
    name: "Panel Deck",
    meta: "Slides 1-26 - Speaker view",
    preview: "PANEL_DECK_SLIDE_1",
    outputs: ["Program - Output 1", "Confidence - Output 2"],
    transitions: ["Cut", "Cut"],
    notes: "Load speaker view for panel.",
    safety: ["Blackout on panic", "Replay safe"]
  }
];
