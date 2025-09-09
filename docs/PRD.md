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
    • WHAT ▸ PRD for Mind::Type (MVP scope)
    • WHY  ▸ Align teams on MUST/WON'T and success
    • HOW  ▸ Backed by questionnaire, linked to C4/ADR/BDD
-->

### Summary

Mind::Type is a quiet, system‑wide typing utility that converts noisy input into clean, well‑formed text in real time. It stays invisible until it helps, respects performance, and preserves your voice. Processing is on‑device by default; remote is optional, encrypted, and explicitly opted‑in. Target uplift: 3× effective WPM at ≥95% semantic accuracy.

### Problem & Audience

- Writers/knowledge workers lose flow correcting typos/grammar.
- Non‑native speakers want clarity without changing voice.

### Goals (MUST) / Non‑Goals (WON'T)

- MUST: on‑device inference by default; p95 keystroke→correction ≤ 15 ms; caret‑safe edits; granular undo via host stack; reduced‑motion compliance; encrypted remote channel support behind explicit opt‑in; tone adjustment optional, off by default.
- WON'T: silent cloud text processing; heavy suggestions UI; collaborative prefs; background data retention.

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
- REQ-STREAMED-DIFFUSION: Corrections MUST stream word‑by‑word behind the caret during typing; on pause (~500 ms), diffusion MUST catch up until the active region reaches the caret.
- REQ-ACTIVE-REGION: Processing MUST be limited to an active region behind the caret (typically 3–8 words) as the only editable span. The UI is not required to render this band.
- REQ-VISUAL-SWAP: The UI MUST use mechanical letter‑swap only for applied corrections, with an optional braille‑like marker ('⠿') at swap sites. No underlines/highlights for applied edits. A subtle active‑region overlay for debugging/demo is permissible, provided it does not alter applied‑edit visuals. Reduced‑motion MUST perform instant swaps. Announce once per batch via the live region when enabled.
- REQ-LOCAL-LM-INTEGRATION: The system MUST support on-device language model integration for semantic and grammatical corrections; MUST fallback gracefully to rule-based corrections when LM unavailable; MUST maintain <150MB typical memory footprint including model. Target initial integration: Transformers.js with Qwen2.5‑0.5B‑Instruct (q4, WebGPU) for text‑centric quality.
- REQ-CONTEXTUAL-CORRECTIONS: Beyond word substitutions, the engine MUST handle transpositions, punctuation spacing, capitalization, and semantic coherence using broader context while maintaining caret safety.

### Scenarios (BDD)

- Caret safety: Given caret sits mid‑word, When sweep runs, Then no edit
  occurs. (maps: docs/qa/acceptance/caret_safety.feature)
- Streamed diffusion: Given active typing, When diffusion runs, Then the active region trails behind the caret word‑by‑word; on pause, the region catches up. (maps: docs/qa/acceptance/streamed_diffusion.feature)
- Visual feedback: Given corrections apply, Then text is replaced via mechanical swap (no highlight), optionally marked with '⠿', and a single screen‑reader announcement "text updated behind cursor" is emitted per batch. (maps: docs/qa/acceptance/two_word_highlight.feature)

### Constraints

- Privacy: On‑device by default; no input content leaves device unless explicitly opted‑in per session. No data retention. Any remote path uses encrypted transport.
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

IDs:

- Requirements: REQ-\*
- Principles: PRIN-\*
- ADRs: ADR-\*
- Scenarios: SCEN-\*

Appendix — Traceability Map (starter)

| REQ-ID                   | Principles                   | ADRs     | QA Scenarios       | Modules/Guides                                                                           |
| ------------------------ | ---------------------------- | -------- | ------------------ | ---------------------------------------------------------------------------------------- |
| REQ-IME-CARETSAFE        | PRIN-SAFETY-04               | ADR-0002 | SCEN-CARETS-001    | utils/diff.ts; band-policy.md                                                            |
| REQ-STREAMED-DIFFUSION   | PRIN-HUMAN-01, PRIN-LOGIC-10 | —        | SCEN-DIFFUSION-001 | core/diffusionController.ts; lm-behavior.md                                              |
| REQ-VISUAL-SWAP          | PRIN-HUMAN-02, PRIN-HUMAN-03 | —        | SCEN-DIFFUSION-001 | ui/swapRenderer.ts; a11y/wcag-checklist.md                                               |
| REQ-A11Y-MOTION          | PRIN-HUMAN-03                | —        | SCEN-HILITE-001    | a11y/wcag-checklist.md; ui/motion.ts                                                     |
| REQ-LOCAL-LM-INTEGRATION | PRIN-SAFETY-05, PRIN-PERF-11 | ADR-0005 | SCEN-LMLOCAL-001   | lm-behavior.md; core/lm/factory.ts; docs/guide/reference/lm-worker.md; crates/core-rs/\* |

### Stakeholders

- Product: @alex
- Engineering: Core (TS/Rust) — @alex; Demo/Web — @alex
- QA: Owner per `docs/qa/README.md`

### Tech Stack Summary

- Core: TypeScript (orchestration) + Rust (WASM‑ready primitives)
- Web: Vite + React demo; Playwright E2E
- LM: Transformers.js targeting WebGPU → WASM → CPU fallback
- Tooling: pnpm, Vitest, ESLint v9 flat config, Prettier

### Data Model & Persistence

- See `docs/architecture/data_model.md` for entities, constraints, and persistence approach. No user text is persisted by default; settings only.

### Release Criteria (MVP)

- Functionality: Caret‑safe tidy sweeps within window; pause catch‑up; active region visuals; secure fields/IME handling
- Usability: Reduced‑motion compliance; minimal unobtrusive UI
- Reliability: p95 latency targets met on M‑series in demo; unit/integration tests green; coverage guard passes
- Supportability: Local‑only default; clear setup script `pnpm setup:local`; logs gated; docs updated (PRD, implementation, QA mapping)

<!-- SPEC:REQ
id: REQ-STREAMED-DIFFUSION
title: Streamed diffusion of LM corrections
status: active
modules:
  - core/diffusionController.ts
  - core/lm/mergePolicy.ts
acceptance:
  - docs/qa/acceptance/streamed_diffusion.feature#SCEN-DIFFUSION-001
tests:
  - tests/diffusionController.spec.ts
  - tests/diffusionController_lm_branches.spec.ts
-->

<!-- SPEC:REQ
id: REQ-IME-CARETSAFE
title: No edits at or after the caret
status: active
modules:
  - utils/diff.ts
  - core/activeRegionPolicy.ts
acceptance:
  - docs/qa/acceptance/caret_safety.feature#SCEN-CARETS-001
tests:
  - tests/diff.spec.ts
  - tests/policy.spec.ts
-->

<!-- SPEC:REQ
id: REQ-A11Y-MOTION
title: Respect reduced-motion; single announcement; mechanical swap
status: active
modules:
  - ui/motion.ts
  - ui/liveRegion.ts
acceptance:
  - docs/qa/acceptance/two_word_highlight.feature#SCEN-HILITE-001
tests:
  - tests/motion.spec.ts
  - tests/liveRegion.spec.ts
-->

<!-- SPEC:REQ
id: REQ-LOCAL-LM-INTEGRATION
title: On-device LM integration with graceful fallback
status: active
modules:
  - core/lm/factory.ts
  - core/lm/transformersClient.ts
acceptance:
  - docs/qa/acceptance/local_lm_integration.feature#SCEN-LMLOCAL-001
tests:
  - tests/transformersClient.spec.ts
  - tests/transformersClient_factory.spec.ts
-->

### In simple terms

- **What this section is for**: It lists our requirements and where to find their code and tests.
- **How to use**: Add a SPEC block like above when you add/change a requirement. Our tool syncs file headers and the traceability map.

<!-- SPEC:REQ
id: REQ-BAND-SWAP
title: Band-swap noise-cluster animation demo
status: active
modules:
  - web-demo/public/demo/band-swap/index.html
  - web-demo/public/demo/band-swap/main.js
  - web-demo/public/demo/band-swap/styles.css
  - contracts/animTokens.ts
acceptance:
  - docs/qa/acceptance/mechanical_swap.feature#SCEN-BAND-SWAP-001
tests:
  - e2e/tests/demo-band-swap.spec.ts
-->
