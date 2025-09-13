## Responsibilities

- Provide two ranges per update:
  - Render range: what to show as the active region (UI‑safe).
  - Context range: what to give to the LM (line/sentence aware).
- Ensure neither range crosses the caret or breaks Unicode boundaries.

## Rules

- Word segmentation via `Intl.Segmenter('word')` (TS) or ICU (Rust).
- Newline clamp: prefer not to cross line breaks for the render range.
- Size: defaults 3–8 words; configurable via `config/defaultThresholds.ts`.
- Context can be larger than render; render is always within context.

## Interfaces

- TS: `ActiveRegionPolicy` with `computeRenderRange(state)` and `computeContextRange(state)`; see `core/activeRegionPolicy.ts` (used by `core/diffusionController.ts`).
- Rust: expose equivalent helpers in `crates/core-rs` as needed.

## Tests

- Multi‑line inputs with trailing newline
- Zero‑width characters and surrogate pairs near boundaries
- Fast typing (frontier chases caret without crossing)

See also: `docs/06-guides/06-03-reference/lm-behavior.md` and `core/lm/policy.ts`.
