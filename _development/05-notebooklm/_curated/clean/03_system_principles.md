## Purpose

Elevate human nature and human–machine input. The system amplifies
clarity, rhythm, and agency while remaining safe, private, and
explainable.

## Behavioural Principles (high-level)

These are the agent’s ground rules for how to behave in any task. Each
principle links to deeper docs that hold the technical details.

### Human

1. Preserve authorship and momentum

- Guidance: Keep the person in flow. Apply small, safe fixes without
  asking; never change what they’re actively typing.
- Examples:
  - While the person types, hold back; when they pause, tidy what was
    written without moving the caret.
  - If they resume typing, drop any pending idea silently.
- See also: [PRD](../PRD.md), [Caret-safe diff (ADR)](../adr/0002-caret-safe-diff.md), [Active region policy](guide/reference/band-policy.md), [Acceptance: caret safety](qa/acceptance/caret_safety.feature)

- 2. Keep the surface calm

- Guidance: No suggestion lists. Use mechanical swap only with an optional
  braille-like marker ('⠿') at swap sites; no underlines/highlights. Keep UI
  quiet; announce via screen reader once per batch when enabled.
- Examples:
  - Fix a comma and briefly underline it; no popups.
  - Show debug only when explicitly opened.
- See also: [PRD](../PRD.md), [Voice & tone](../brand/specs/voice-tone.md), [Config flags](guide/reference/config-flags.md), [Web demo details](guide/how-to/web-demo-details.md)

3. Accessible by default

- Guidance: Respect reduced motion and assistive tech; never rely on
  color or animation alone.
- Examples:
  - Replace animations with static highlights if the system asks for
    less motion.
  - Announce state changes using OS-standard phrasing.
- See also: [A11y checklist](a11y/wcag-checklist.md), [PRD](../PRD.md)

### Safety & Trust

4. Caret-safe, never risky

- Guidance: Only touch a small neighborhood behind the caret; never
  write at/after the caret.
- Examples:
  - Correct a misspelling a few words back; do not extend text forward.
  - If a change would cross the caret, skip it.
- See also: [Caret-safe diff (ADR)](../adr/0002-caret-safe-diff.md), [Band policy](guide/reference/band-policy.md), [Acceptance: caret safety](qa/acceptance/caret_safety.feature)

5. Private by default

- Guidance: Prefer local. Remote is opt‑in per session. Do not persist
  user text.
- Examples:
  - If local assets are missing, operate in safe rules‑only mode and
    nudge setup, not cloud fallback.
  - Clear the opt‑in when the session ends.
- See also: [PRD](../PRD.md), [LM behavior](guide/reference/lm-behavior.md), [Config flags](guide/reference/config-flags.md), [Acceptance: local LM](qa/acceptance/local_lm_integration.feature)

6. Explain choices simply

- Guidance: When asked, say what changed and why, without exposing user
  content.
- Examples:
  - “Shortened to fit the safe band.”
  - “Dropped result because you kept typing.”
- See also: [Web demo details](guide/how-to/web-demo-details.md), [Implementation](../implementation.md)

7. Fail soft, never block

- Guidance: On any error, step down to a safe mode and keep the person
  typing.
- Examples:
  - Timeouts cancel work and defer until the next pause.
  - No GPU? Use a simpler path, just slower—not broken.
- See also: [Architecture constraints (ADR)](../adr/0003-architecture-constraints.md), [Acceptance: streamed diffusion](qa/acceptance/streamed_diffusion.feature)

### Logic & Clarity

8. Smallest context; plain outputs

- Guidance: Use only what’s needed; return clear text, no boilerplate.
- Examples:
  - Consider nearby text rather than the whole document.
  - Strip any labels or wrappers from model output.
- See also: [LM behavior](guide/reference/lm-behavior.md), [Injector](guide/reference/injector.md)

9. One thing at a time

- Guidance: Don’t juggle. If new input arrives, stop what you were
  doing.
- Examples:
  - Abort a running idea as soon as a new key is pressed.
  - Ignore late results from an older state.
- See also: [Architecture: containers](architecture/C2-containers.md), [Implementation](../implementation.md)

10. Check a small neighborhood (active region)

- Guidance: Validate and correct a short span around the cursor—not the
  world.
- Examples:
  - Fix “teh quick” to “the quick,” but don’t rewrite the sentence.
  - Leave longer rephrasing to deliberate user actions.
- See also: [Active region policy](guide/reference/band-policy.md), [Caret-safe diff (ADR)](../adr/0002-caret-safe-diff.md)

### Performance & Reliability

11. Meet the device where it is

- Guidance: Use effort that suits the hardware; prioritize responsiveness.
- Examples:
  - On fast devices, respond more quickly; on slower ones, take lighter
    steps.
  - Warm up once; avoid stutter during typing.
- See also: [Config flags](guide/reference/config-flags.md), [Web demo details](guide/how-to/web-demo-details.md)

12. Ship only what we can test

- Guidance: Behaviour must be observable and verifiable.
- Examples:
  - Add or update tests when rules change.
  - Keep acceptance criteria green before merging.
- See also: [QA index](qa/README.md), [Acceptance suite](qa/acceptance), [Implementation](../implementation.md)

## Appendix: Technical mapping

### A) Human Flow & Dignity (detailed)

1. Human-first agency

- Behaviour: The human remains the author. Corrections auto-apply within
  the active region to preserve flow; no accept gesture needed. No hidden
  expansion beyond the region or caret.
- Examples:
  - Auto-apply grammar/punctuation micro-fixes silently; never add tokens
    at/after the caret and never expand outside the band.
  - If the caret enters the active region mid-process, cancel pending merges and
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

- Behaviour: Use mechanical letter‑swap as the only visual. Optional
  braille-style marker ('⠿') may appear at swap sites. No underlines or
  highlights.
- Examples:
  - Swapped characters appear in place with a brief, unobtrusive motion; when
    reduced motion is on, the swap is instant.
  - Announce once per batch via the live region: "text updated behind cursor".

3. Minimal cognitive load

- Behaviour: Reduce on-screen complexity. No suggestion lists. Subtle
  underline/highlight for applied fixes. Debug info is opt-in.
- Examples:
  - Do not display alternatives; corrections apply immediately with a
    brief underline/highlight.
  - Keep debug panels collapsed by default in the web demo; do not mix
    debug artefacts into the typing surface.

4. Accessibility by default

- Behaviour: Respect reduced motion, readable contrast, screen reader cues,
  and keyboard-only operation. No essential info relies on color or animation;
  when reduced motion is on, perform instant swaps with no animation.
- Examples:
  - When `prefers-reduced-motion` is true, switch any effects off and perform
    instant swaps (no animation); markers remain optional and high-contrast.
  - Use OS-standard phrasing in screen reader announcements via
    `liveRegion`; ensure all actions are reachable by keyboard.

### B) Safety, Trust & Integrity (detailed)

5. Caret-safe, non-undoing edits

- Behaviour: Never edit at/after caret; operate strictly within the
  active region. System corrections do not enter the host undo stack.
- Examples:
  - The merge engine clamps LM output to `ActiveRegionPolicy.range`, trimming
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
  - In DebugPanel, show: model tier, tokens requested, active region size, and
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

### C) Adaptive Intelligence & Execution (detailed)

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
  - On active region shift, discard pending results tagged with old region id.

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
  - Add tests for active region clamping, caret safety, single-flight, and tier
    fallback in `tests/**`.
  - Expose structured logs (level-gated) for merges, aborts, and tier
    detection to support e2e verification.

## Implementation Notes

- Core logic enforces safety and orchestration (`core/**`).
- The web demo renders controls, state, and explainers; it never owns
  LM scheduling or merge policy.
- All behaviour changes update this file, `docs/06-guides/06-03-reference/lm-behavior.md`, and the
  QA matrix.
