<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  P R O D U C T   R E Q U I R E M E N T S  ░░░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ PRD for MindTyper (MVP scope)
    • WHY  ▸ Align teams on MUST/WON'T and success
    • HOW  ▸ Backed by questionnaire, linked to C4/ADR/BDD
-->

### Summary

MindTyper converts noisy keyboard input into clean text in real time,
on‑device, system‑wide, with zero input sent to cloud. Target uplift:
3× effective WPM at ≥95% semantic accuracy.

### Problem & Audience

- Writers/knowledge workers lose flow correcting typos/grammar.
- Non‑native speakers want clarity without changing voice.

### Goals (MUST) / Non‑Goals (WON'T)

- MUST: on‑device inference; p95 keystroke→correction ≤ 15 ms; caret‑safe
  edits; granular undo via host stack; reduced‑motion compliance.
- WON'T: cloud text processing; heavy suggestions UI; collaborative prefs.

### Success Metrics

- Latency: p95 ≤ 15 ms (M‑series), ≤ 30 ms (Intel). Memory: typical ≤
  150 MB, cap ≤ 200 MB.
- Undo rate (false‑positive proxy) ≤ 0.5% of edits.
- Activation ≥ 70% in week 1; NPS ≥ 50 (writers segment).

### Functional Requirements

- REQ-IME-CARETSAFE: The engine MUST NEVER apply edits at/after the caret.
- REQ-TIDY-SWEEP: The engine MUST propose minimal diffs within ≤ 80 chars
  behind the caret; return null when unsure.
- REQ-A11Y-MOTION: Visual feedback MUST honor `prefers-reduced-motion`.
- REQ-SECURE-FIELDS: The system MUST disable in secure fields and during
  active IME composition.

### Scenarios (BDD)

- Caret safety: Given caret sits mid‑word, When sweep runs, Then no edit
  occurs. (maps: docs/qa/acceptance/caret_safety.feature)
- Two‑word highlight: Given short pause, Then last two words behind caret
  are gently highlighted. (maps: docs/qa/acceptance/two_word_highlight.feature)

### Constraints

- Privacy: 100% on‑device; no input content leaves device.
- Accessibility: WCAG 2.2 AA; screen reader announcements for changes.
- IME: Wait until composition ends; secure fields disabled.

### Risks

- Latency budget on Intel Macs; mitigation: slim model, heuristics fallback.
- Perceived over‑correction; mitigation: confidence gating, undo grouping.

### References

- C4: docs/architecture/C1-context.md, C2-containers.md, C3-components.md
- ADRs: docs/adr
- BDD: docs/qa/acceptance
- Guides (Diátaxis): docs/guide

### Traceability

- See REQ → tests/modules mapping in the PRD “Traceability” appendix
  after test scaffolding lands.
