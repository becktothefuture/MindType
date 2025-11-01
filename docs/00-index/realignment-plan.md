<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  R E A L I G N M E N T   P L A N  ░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
    • WHAT ▸ Prioritised actions to align codebase with PDF guide
    • WHY  ▸ Deliver clean structure, deterministic-first pipeline, and UX
    • HOW  ▸ Phased tasks with owners, artifacts, and acceptance checks
-->

# Realignment Plan (v0.6)

## Phase A — Critical Corrections

1) Deterministic Noise Fallback (Streaming)
- Action: Implement rule-based noise in `core/diffusionController.tickOnce()` path (typos/spacing/casing) behind caret, caret-safe only.
- Owner: Core
- Artifacts: `engines/noiseDeterministic.ts`; unit tests; config toggles
- Acceptance: AC-DETERMINISTIC-FIRST, AC-CARET-SAFE

2) Atomic Undo per Sweep
- Action: Ensure a single grouped rollback across stages using `ui/rollbackHandler.ts` and diffusion controller hooks
- Owner: UI/Core
- Artifacts: tests in `tests/rollback.spec.ts`
- Acceptance: AC-UNDO-ATOMIC

3) Latency Fallback Policy
- Action: Formalise device-tier policy (shrink Active Area; skip Context/Tone) with thresholds in `config/defaultThresholds.ts`
- Owner: Core
- Artifacts: policy doc; tests; logging
- Acceptance: AC-FALLBACKS

## Phase B — UX & Accessibility

4) Caret Organism State Machine (Web Lab)
- Action: Implement Listening/Thinking/Cleaning patterns with exact timing; stop-at-caret
- Owner: Web Lab
- Artifacts: `web-lab-v0.6/src/organism.ts`
- Acceptance: Lifecycle scenes A–F reproducible

5) Accessibility Guarantees
- Action: Reduced-motion instant swap; batch SR announcements only
- Owner: UI
- Artifacts: e2e tests
- Acceptance: AC-ACCESSIBILITY

## Phase C — Active Region Semantics

6) Sentence-Bounded Active Area
- Action: Add sentence-bound computation option (2–3 sentences) mapped from `Intl.Segmenter` sentence mode; keep word fallback
- Owner: Core
- Artifacts: policy option in `activeRegionPolicy`
- Acceptance: AC-ACTIVE-AREA

## Phase D — Observability

7) End-to-end Event Logging
- Action: Configure `core/logger` sink in lab to capture TypingMonitor, SweepScheduler, Diffusion, LM-wire, Confidence decisions
- Owner: Web Lab
- Artifacts: `PipelineLogger.ts`, JSON export
- Acceptance: Full digestive-path trace from input to output

## Phase E — Structure & Cleanup

8) Clean Folder Structure (PDF-aligned)
- Action: Review and adjust folders to reflect pipeline and responsibilities
- Owner: Core
- Artifacts: structure summary; moved/removed files list
- Acceptance: Docs/tree alignment verified

---

## Dependencies & Order
- A(1) → A(2) → A(3) → B(4) → B(5) → C(6) → D(7) → E(8)

## Risks
- Deterministic noise overlap with LM results → resolve via precedence (Noise > Context > Tone) and caret safety.

## Progress Tracking
- Each task closes with: tests, doc update, and log proof in `web-lab-v0.6`.


