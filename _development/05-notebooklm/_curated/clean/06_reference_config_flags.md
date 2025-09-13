- SWEEP_WINDOW_MAX: 80 chars behind CARET (tidy sweep).
- HIGHLIGHT_FADE_MS: ≤ 250 ms; respects reduced motion.
- DEBOUNCE_MS: 8–12 ms for keystrokes.

Runtime thresholds and defaults (source: `config/defaultThresholds.ts`):

- SHORT_PAUSE_MS: 300 ms (minimum pause before LM catch‑up runs)
- LONG_PAUSE_MS: 2000 ms
- MAX_SWEEP_WINDOW: 80 chars (behind caret)
- TYPING_TICK_MS: default 75 ms (range 60–90 ms typical)
- VALIDATION_BAND_WORDS: min=5, max=5 (fixed band size)

LM execution & privacy defaults:

- LOCAL_ONLY_DEFAULT: true (remote models require explicit per‑session opt‑in)
- DEVICE_TIER_MAX_TOKENS: webgpu=48, wasm=24, cpu=16 (defaults; can be overridden)
- SUGGESTION_LISTS: false (no alternatives UI)
- PREVIEW_STYLE: underline/highlight baseline
- NO_UNDO: true (system corrections do not enter host undo stack)

<!-- Alignment: Flags impacting visuals → active region size, shimmer duration; LM flags → localOnly, device tier, token caps. -->
