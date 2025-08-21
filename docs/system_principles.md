<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  S Y S T E M   P R I N C I P L E S  ░░░░░░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Principles that elevate human nature and input
    • WHY  ▸ Align UX + code with MindTyper’s purpose at all times
    • HOW  ▸ Subcategories → principles → behaviours → examples
-->

## Purpose

Elevate human nature and human–machine input. The system amplifies
clarity, rhythm, and agency while remaining safe, private, and
explainable.

## Subcategories and Principles

### A) Human Flow & Dignity

1. Human-first agency

- Behaviour: The human remains the author. Corrections auto-apply within
  the safety band to preserve flow; no accept gesture needed. No hidden
  expansion beyond the band or caret.
- Examples:
  - Auto-apply grammar/punctuation micro-fixes silently; never add tokens
    at/after the caret and never expand outside the band.
  - If the caret enters the band mid-process, cancel pending merges and
    drop stale results immediately.

2. Frictionless flow & rhythm

- Behaviour: Maintain typing flow. Prefer micro-suggestions over blocks;
  defer heavy work during active bursts; resume in quiet gaps.
- Examples:
  - Skip LM calls if pause < SHORT_PAUSE_MS (300ms); rely on rules-only tidy sweep
    until a longer pause is detected.
  - Batch multiple small diffs into a single grouped undo step to keep
    rhythm and reduce cognitive churn.

2a. Preview style (visual feedback)

- Behaviour: Use underline/text highlight as the baseline visual language
  for applied corrections. Avoid pill UI; keep feedback subtle.
- Examples:
  - Underline the corrected range for a short duration.
  - Highlight color respects reduced-motion and high-contrast settings.

3. Minimal cognitive load

- Behaviour: Reduce on-screen complexity. No suggestion lists. Subtle
  underline/highlight for applied fixes. Debug info is opt-in.
- Examples:
  - Do not display alternatives; corrections apply immediately with a
    brief underline/highlight.
  - Keep debug panels collapsed by default in the web demo; do not mix
    debug artefacts into the typing surface.

4. Accessibility by default

- Behaviour: Respect reduced motion, readable contrast, screen reader
  cues, and keyboard-only operation. No essential info relies on color
  or animation alone.
- Examples:
  - When `prefers-reduced-motion` is true, switch particle effects off
    and replace animated previews with static highlights.
  - Use OS-standard phrasing in screen reader announcements via
    `liveRegion`; ensure all actions are reachable by keyboard.

### B) Safety, Trust & Integrity

5. Caret-safe, non-undoing edits

- Behaviour: Never edit at/after caret; operate strictly within the
  validation band. System corrections do not enter the host undo stack.
- Examples:
  - The merge engine clamps LM output to `BandPolicy.range`, trimming
    tokens that cross caret or leave the band.
  - No grouped undo entries are created for auto-applied corrections.

6. Local-first privacy

- Behaviour: Prefer local execution. Remote model access is disabled
  unless explicitly enabled by the host/session. If `localOnly=true`
  and assets are missing, degrade to rules-only with clear local-setup
  guidance.
- Examples:
  - Preflight WebGPU/WASM assets; if absent, run rules-only mode and
    log a discrete hint to run `pnpm setup:local`.
  - Do not attempt heuristic PII stripping. Instead, never send user
    text to remote services unless the user/host has explicitly opted
    in for this session; never persist user text to disk.

7. Explainability over mystery

- Behaviour: Make decisions legible. Log what was proposed, why it was
  accepted/rejected, and the current device tier. Capture uncertainties
  in `docs/questionnaire/questions.md` and proceed on safe defaults.
- Examples:
  - In DebugPanel, show: model tier, tokens requested, band size, and
    reason codes (e.g., "caret-entered", "stale-result"); avoid showing raw user text.
  - Provide a toggleable inline explainer: "Suggestion truncated to band
    width to preserve caret safety."

8. Fail-soft defaults

- Behaviour: Any LM failure downgrades to rules-only without blocking
  typing; stale results are dropped via single-flight + abort.
- Examples:
  - If a request times out, cancel with `AbortController`, keep flow,
    and schedule a retry on next quiescent period.
  - If WebGPU is unavailable, switch to WASM SIMD/threads and reduce
    max tokens per call.

### C) Adaptive Intelligence & Execution

9. Context-grounded minimality

- Behaviour: Use the smallest effective context window; keep
  instructions precise. Control‑plane metadata (e.g., JSON) is allowed
  when it improves determinism. Outputs must be plain text and
  sanitized.
- Examples:
  - Prompt contains only task-relevant window + band, not entire doc.
  - Control-plane JSON may be included to guide the model, but outputs
    are sanitized to plain text (strip labels/guillemets; clamp length).

10. Single-flight orchestration

- Behaviour: Only one in-flight generation per band. New input aborts
  the old request; stale responses are ignored.
- Examples:
  - When typing resumes, immediately `abort()` the active fetch and
    mark the response as stale.
  - On band shift, discard pending results tagged with old band id.

11. Progressive enhancement by device tier

- Behaviour: Detect capabilities → tune cadence, tokens, and effects.
  Never exceed the tier’s latency budget.
- Examples:
  - Tier=WebGPU → higher token cap (48) and shorter debounce; Tier=WASM → 24; Tier=CPU → 16 and longer debounce.
  - Warm-up once per session; cache pipelines to keep p95 latency in
    bounds.

12. Testable, observable behaviour

- Behaviour: Every rule is backed by unit/integration tests and debug
  signals. Ship only when gates are green.
- Examples:
  - Add tests for band clamping, caret safety, single-flight, and tier
    fallback in `tests/**`.
  - Expose structured logs (level-gated) for merges, aborts, and tier
    detection to support e2e verification.

## Implementation Notes

- Core logic enforces safety and orchestration (`core/**`).
- The web demo renders controls, state, and explainers; it never owns
  LM scheduling or merge policy.
- All behaviour changes update this file, `docs/guide/reference/lm-behavior.md`, and the
  QA matrix.
