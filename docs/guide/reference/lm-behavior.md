<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   B E H A V I O R   A N D   P O L I C Y  ░░░░░░░░░░  ║
  ║                                                              ║
  ║   Caret‑safe, band‑bounded LM diffusion: selection,          ║
  ║   prompting, and merging rules (single source of truth).     ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
    • WHAT ▸ How we pick spans, prompt the LM, and merge safely
    • WHY  ▸ Real‑time corrections without touching text at/after caret
    • HOW  ▸ Trailing debounce, single‑flight, context‑aware prompt
-->

## Overview

- We stream incremental corrections behind the caret (validation band).
- We select a small span near the caret, include a limited context window, and send a precise instruction: “Correct ONLY the Span; return just the corrected Span.”
- We merge only that span back, preserving caret safety.

### New direction: core-driven LM, demo kept thin

- The LM scheduling, single-flight, and merge policy live in core (`DiffusionController` + `core/lm/*`).
- The web demo no longer owns LM orchestration; it only renders the validation band and debug info.
- This ensures consistent behaviour across hosts (web, macOS) and simplifies QA.

## Selection Rules (Span and Context)

- Span must be at least 3 chars and end on a word boundary.
- Span length capped (default 80 chars).
- Context window: ~60 chars before and after the span.
- Debounce and cooldown so we generate after a pause and not too frequently.
  - SHORT_PAUSE_MS = 300 ms (catch‑up trigger)
- Single-flight: abort any in-flight generation before starting a new one; drop stale results.

On slow devices (WASM/CPU):

- Auto-degrade token caps and increase debounce/cooldown to avoid thrash.

## Prompt Template (with control‑plane metadata)

```
Correct ONLY the Span. Do not add explanations or extra words. Return just the corrected Span.
CONTROL (JSON): «{controlJson}»
Context before: «{ctxBefore}»
Span: «{span}»
Context after: «{ctxAfter}»
```

Implementation notes:

- We pass a single-string prompt to the runner to avoid chat-template surprises.
- Control-plane JSON is included for determinism but must stay ≤10% of the prompt window.
- Post-processing removes any lingering labels or guillemets.

## Token Budget & Device Tiers

- max_new_tokens ~ 1.1 × span length + 6, capped by tier defaults when unspecified:
  - webgpu: 48, wasm: 24, cpu: 16
- Enforces short outputs aligned to the original span size.

## Output Post‑Processing

- Take the first line; strip quotes; trim whitespace.
- Clamp length to ~2 × original span length (min 24).
- Replace only the band span with the fixed text.
  - If caret has entered the band since request start, cancel and drop stale; no rollback to undo stack.

## Runtime Guards

- Skip if span < 3 chars, or ends mid‑word, or too long.
- Cooldown (≈400ms) after a merge to avoid rapid back-to-back requests.
- Abort prior request when user continues typing; drop stale results.
  - Enforce at-most-one pending request; drop older unless idle.

## Future Enhancements

- Sentence‑aware band policy: grow to sentence/previous sentences when confidence is low; still only merge intended span.
- Error‑type templates (typo/grammar/casing/punct) to guide shorter, more precise fixes.
- Confidence gating and rollback on user edits during streaming.
  - Consider worker mode for heavy models; keep offline capability.

## Typing Scenarios (30) and Expected Behavior

1. Empty field, start typing: small spans corrected behind caret on pauses; no edits at/after caret.
2. Mid-word pause: no LM run (word-boundary enforced); band renders only.
3. Pause at whitespace: LM runs; short span replaced.
4. Pasting a short sentence: schedule after paste; correct span near caret.
5. Pasting a long paragraph: debounce, then correct small span near caret; future: sentence-aware.
6. Moving caret mid-text via click: band recomputed at new caret; LM triggers only after pause.
7. Moving caret with arrow keys: same as click; no mid-word runs.
8. Selecting a range: LM disabled while selection exists; no changes until collapsed.
9. Typing fast bursts: abort stale, single-flight ensures latest run only.
10. Frequent tiny pauses (<300ms): cooldown prevents spam; band shows but no LM merge.
11. Typing at document start: band within bounds; prompt uses available left context.
12. Typing at line start after newline: newline-safety clamp avoids band jumping across lines.
13. Undo/redo: band updates; LM waits for pause; merges only span; system corrections do not enter undo stack.
14. Deleting characters: band updates; LM only after boundary and pause.
15. Replacing a word (backspace + type): treated as new span; LM after pause.
16. Holding key (repeat): no LM until release+pause.
17. IME composing: LM disabled during composition; resumes after compositionend.
18. Secure field: LM disabled; no runs.
19. Rapid caret jumps (mouse/touchpad): only last position considered; abort stale.
20. Window blur/focus loss: abort; no background runs.
21. Switching tabs/apps and returning: LM resumes on next pause.
22. Low-power device: debounce/cooldown keep frequency low; small max tokens.
23. High-latency first run (warm-up): later runs faster; UI shows band regardless.
24. Rule-only mode: LM off; rules apply; can toggle LM on and load.
25. Local-only assets missing: LM remains off; show guidance to run setup; remote allowed only on explicit opt‑in.
26. Slow network: small prompts/outputs minimize bandwidth; still span-only merges.
27. Very long word: span cap blocks LM; rules may still apply.
28. Mixed case/punctuation errors: prompt + post-process keep output short and span-sized.
29. Multiline input: newline clamp ensures band stays in current line when needed.
30. Multi-sentence typing: current span uses small context; future: sentence-aware growth with confidence gating.

## Single Source of Truth

- The policy is implemented in `core/lm/policy.ts` and consumed by hosts.
- Tune thresholds in one place; hosts (e.g., web demo) should avoid duplicating logic.
