<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  P D F   G U I D E   R E Q U I R E M E N T S  ░░░░░░░░░░░  ║
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
    • WHAT ▸ Authoritative extraction of Mind⠶Flow Product Experience Guide
    • WHY  ▸ Serve as single source of truth for alignment & verification
    • HOW  ▸ Requirements, scenes, acceptance criteria, and SPEC blocks
-->

# Mind⠶Flow — Product Experience Guide (Authoritative Requirements Extract)

> Source of truth: “MindFlow - Product Experience Guide.pdf” (expanded extract provided by author). This file encodes the PDF’s intentions as verifiable requirements and acceptance criteria. All implementation and refactors MUST align with this document.

## 0. Hook (Intent)
- Flow has a physics: thoughts arrive in bursts, hands add noise, attention oscillates. Mind⠶Flow synchronises correction with natural pauses and applies bounded, caret‑safe edits behind the cursor to preserve intent and continuity.

## 1. Purpose & Reasoning
- Problem: modern UIs interrupt writing via underlines/popups/suggestion strips → context switching → fragmented working memory → lower perceived quality.
- Stance: Mind⠶Flow is a refinement layer, not predictive text. It tidies just behind focus and does nothing when uncertain.
- Core values:
  - Caret safety (never at/after caret)
  - Confidence gating (low certainty → no‑op)
  - Undo integrity (one sweep = one undo)
  - Privacy by architecture (on‑device; secure fields excluded)
  - Accessibility first (reduced‑motion → instant swap; one SR announcement per batch)

## 2. What Mind⠶Flow Is (and Isn’t)
- Is: Local text refinement operating over recent 2–3 sentences behind caret: Noise → Context → optional Tone; preserves author’s voice; corrections during natural pause via visual sweep; no pop‑ups or accept/reject flow.
- Isn’t: Autocomplete or intrusive suggestion UI.

## 3. Where It Lives
- Anywhere a caret appears. On focus, an in‑field “caret organism” (braille‑like symbol) appears to indicate readiness; hides on blur. No extra chrome.

## 4. Lifecycle (Micro‑Scenes)
- 0) Idle: caret absent; no processing.
- 1) Activation: marker co‑locates with caret; ready.
- 2) Listening (burst typing): marker holds; buffer only; analyse once 1–3 words available.
- 3) Pause detection (~≥500–700 ms): transition to cleaning.
- 4) Sweep: marker travels through text toward caret, unveiling committed, caret‑safe corrections; stops at caret.
- 5) Contextual correction in window: grammar/placement/punctuation adjusted; voice preserved.

## 5. Edit Taxonomy
- Deterministic (always safe): typos; punctuation/spacing; casing.
- Contextual (confidence‑gated): agreement; syntax smoothing; micro‑reorder inside active window.
- Tone‑preserving (optional, conservative): lexical smoothing; if low confidence → no‑op.

## 6. Safety Rails (Always On)
- Never modify at/after caret.
- Exclude password/secure inputs and IME composition spans.
- Single Undo reverts an entire sweep.
- Low confidence → no‑op.

## 7. Zones
- Active Area: sliding window (~2–3 sentences) immediately behind caret; only editable region.
- Context Area: wider read‑only span for coherence/tone; informs decisions; not rewritten unless entering Active.

## 8. Caret Organism (State Language)
- States: Ready/Listening (braille loop); Thinking (~1.5×); Cleaning (~2.5× during sweep).
- Controls: disable/enable per‑field (⌥+◀), reset on blur; optional dual‑caret for demos.

## 9. Privacy (Architectural)
- On‑device by default; process only Active Area; secure/IME ignored.
- Optional remote (explicit, encrypted, non‑persistent) else fully offline.

## 10. Technical Framework
- Caret‑safe diffs only; confidence‑gated commits; deterministic‑first; graceful degradation (GPU→WASM→CPU with shrinking window); accessibility (single SR announcement; reduced‑motion instant swap); state hygiene (clear buffers on blur; no cross‑field persistence).

## 11. Pipeline (Textual)
- Keystream → Buffer (Active Area)
  - Noise (deterministic): orthography/spacing/casing/punctuation
  - Context (confidence‑gated): agreement/syntax/micro‑reorder
  - Tone (optional, conservative): preserve voice/smooth register
- → Diff Composer → Caret‑Safe Patch → Sweep Renderer (toward caret) → Catch‑up
- Trigger: pause (~≥500–700 ms). Perception: subtle, co‑located motion reads as continuous.

## 12. Controls & Fallback
- Activate: focus → organism appears.
- Temp disable: ⌥+◀ per field; resets on blur/focus.
- Listening vs Sweep: listening during bursts; sweep only on pause; stops at caret.

## 13. Failure Modes & Guardrails
- Low confidence: deterministic fixes only; otherwise no‑op.
- IME active: no processing; organism hides/standby.
- Secure field: no processing.
- Latency pressure: shorten Active Area; skip context/tone; deterministic noise continues.

## 14. Undo Grouping
- One undo per sweep (atomic user mental model).

## 15. Perceptual Timing
- ~500–700 ms post‑keystroke commits read as continuous if motion amplitude is low and co‑located with caret.

## 16. Demo Micro‑Scenes (A–F)
- A: trivial typos → corrected on pause.
- B: punctuation/spacing fixes.
- C: agreement/article fixes.
- D: micro‑reorder for readability.
- E: conservative tone smoothing.
- F: catch‑up halts at caret (no overrun).

---

## Acceptance Criteria (Verifiable)
- AC‑CARET‑SAFE: Edits never touch or cross caret; attempts are rejected and logged.
- AC‑ACTIVE‑AREA: All edits confined to Active Area (window size policy‑bound; expands during bursts only within limits).
- AC‑CONFIDENCE‑GATE: Context/Tone commits require τ thresholds; otherwise hold or skip.
- AC‑DETERMINISTIC‑FIRST: Noise runs even under load; higher‑latency stages degrade first.
- AC‑UNDO‑ATOMIC: Single undo reverts entire sweep group.
- AC‑PRIVACY‑ON‑DEVICE: Default processing local; secure/IME ignored.
- AC‑ACCESSIBILITY: Reduced‑motion → instant swap; one SR announcement per batch.
- AC‑PAUSE‑TRIGGER: Sweep begins only on pause ≥ configured debounce; stops at caret.
- AC‑FALLBACKS: Latency pressure shrinks window or disables context/tone while maintaining deterministic noise.

## SPEC Blocks

<!-- SPEC:REQ
id: REQ-CARET-SAFETY
title: Never modify at or after the caret
status: required
modules:
  - utils/grapheme.ts
  - core/activeRegionPolicy.ts
  - core/diffusionController.ts
  - engines/*
acceptance:
  - docs/12-qa/qa/acceptance/caret_safety.feature
  - AC-CARET-SAFE
-->

<!-- SPEC:REQ
id: REQ-CONFIDENCE-GATING
title: Confidence gating for context/tone stages
status: required
modules:
  - core/confidenceGate.ts
  - engines/contextTransformer_v06.ts
  - engines/toneTransformer_v06.ts
acceptance:
  - docs/12-qa/qa/acceptance/streamed_diffusion.feature
  - AC-CONFIDENCE-GATE
-->

<!-- SPEC:REQ
id: REQ-UNDO-GROUPING
title: Single undo per sweep (atomic)
status: required
modules:
  - core/diffusionController.ts
  - ui/rollbackHandler.ts
acceptance:
  - docs/12-qa/qa/acceptance/mechanical_swap.feature
  - AC-UNDO-ATOMIC
-->

<!-- SPEC:REQ
id: REQ-PRIVACY-LOCAL
title: On-device by default; secure/IME exclusion
status: required
modules:
  - core/security.ts
  - core/caretMonitor.ts
acceptance:
  - docs/12-qa/qa/acceptance/secure_field.feature
  - AC-PRIVACY-ON-DEVICE
-->

<!-- SPEC:REQ
id: REQ-ACCESSIBILITY
title: Reduced-motion instant swap; one SR announcement per batch
status: required
modules:
  - ui/motion.ts
  - ui/liveRegion.ts
acceptance:
  - docs/12-qa/qa/acceptance/accessibility.feature
  - AC-ACCESSIBILITY
-->

<!-- SPEC:REQ
id: REQ-PAUSE-SWEEP
title: Pause-triggered sweep; stops at caret
status: required
modules:
  - core/sweepScheduler.ts
  - core/diffusionController.ts
acceptance:
  - docs/12-qa/qa/acceptance/streamed_diffusion.feature
  - AC-PAUSE-TRIGGER
-->

<!-- SPEC:REQ
id: REQ-DETERMINISTIC-FIRST
title: Deterministic noise stage continues under load; graceful degradation
status: required
modules:
  - engines/noiseTransformer.ts
  - core/sweepScheduler.ts
acceptance:
  - docs/12-qa/qa/acceptance/streamed_diffusion.feature
  - AC-DETERMINISTIC-FIRST
-->

<!-- SPEC:REQ
id: REQ-ZONES
title: Active Area editable; Context Area read-only
status: required
modules:
  - core/activeRegionPolicy.ts
  - engines/*
acceptance:
  - docs/12-qa/qa/acceptance/streamed_diffusion.feature
  - AC-ACTIVE-AREA
-->

---

## Traceability
- Source: MindFlow PDF (expanded extract provided by author)
- Cross‑refs:
  - PRD: `docs/01-prd/01-PRD.md`
  - Implementation: `docs/02-implementation/02-Implementation.md`
  - Architecture: `docs/04-architecture/architecture.mmd`
  - ADRs: `docs/05-adr/*.md`
  - QA: `docs/12-qa/qa/acceptance/*.feature`


