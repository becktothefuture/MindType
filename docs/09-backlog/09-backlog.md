<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  B A C K L O G   ( N A T U R A L   L A N G U A G E )  ░░  ║
  ║                                                              ║
  ║   Future enhancements described plainly with rationale,      ║
  ║   impact, and acceptance cues.                               ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
    • WHAT ▸ Clear, non-technical descriptions of backlog items
    • WHY  ▸ Aid prioritization and shared understanding
    • HOW  ▸ Map to FT-* tasks in implementation.md
-->

## Web Worker offloading (Pro feature)

- Idea: run the Transformers.js model inside a Web Worker so the UI thread stays smooth. We stream tokens back via postMessage and render on the main thread.
- Offline? Yes. Workers are local browser threads; they don’t require internet. The only requirement is that the model assets are available locally or cached. When offline, the worker still runs the local model.
- Why “Pro feature”? Adds build complexity (bundling worker and assets), more moving parts, and debugging overhead. We can ship “main-thread” first (already works) and offer worker-mode for higher performance machines.
- Acceptance: UI remains responsive during long generations; average keystroke→fix latency improves; no regression in correctness.

## Sentence-aware, confidence-gated context growth

- Problem: sometimes the band is too short to be certain. Solution: grow the LM context window to the sentence (or previous sentence) when uncertainty is high, but still merge only the small span.
- Acceptance: when span-only fixes produce low-confidence results, the system retries with sentence context and improves precision without chatty outputs.

## Conflict resolver and rollback mid-stream

- Problem: user types while a fix is streaming. Solution: detect caret changes and rollback partial merges; re-run when stable.
- Acceptance: no visible glitches; corrections never override fresh user keystrokes.

## Error-type prompt templates

- Tailor prompts for typos, casing, punctuation vs grammar. Shorter, more precise prompts reduce tokens and improve accuracy.
- Acceptance: lower token counts per run; higher precision on common errors.

## Output filters and stop strings

- Add rules to trim unwanted tokens (explanations, quotes). If supported, add stop strings (e.g., newline) to halt early.
- Acceptance: outputs remain within span-sized limits; no chatty add-ons.

## Auto-degrade on slow devices

- If latency is repeatedly high (e.g., >5s), lengthen debounce or temporarily switch to rules-only until idle. Keep UI responsive.
- Acceptance: typing remains smooth; LM resumes automatically when feasible.

## Worker + Metrics panel

- Show p50/p95 latency, token counts, abort/stale-drop rates, backend in a debug panel.
- Acceptance: developers can spot regressions quickly.

## IndexedDB/Cache priming and warm-up

- Preload tokenizer/model shards and run a tiny warm-up generation at load for faster first response.
- Acceptance: first correction latency drops significantly.

## Queue policy (at-most-one pending)

- Keep one pending request while typing; drop older ones. Ensures latest state wins and avoids stalls.
- Acceptance: no piling up of generations; visible responsiveness.

## Smaller model variant option

- Offer a tiny grammar model for very low-latency spans; keep Qwen for deeper semantics with longer debounce.
- Acceptance: user can trade accuracy vs speed; defaults remain sensible.

## Safari/WASM hardening

- Ensure correct MIME and asset mapping; prefer WebGPU when available; reduce token caps on slower engines.
- Acceptance: no runtime errors; acceptable latency on Safari.

## Accessibility and announcements (debug-only)

- Provide optional aria-live updates during testing (polite). Off by default.
- Acceptance: screen reader users can verify changes without extra noise in production.

<!-- Alignment: Backlog tasks should reference "active region" (not band) and Rust-first orchestration. -->
