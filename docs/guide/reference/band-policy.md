<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  B A N D   P O L I C Y   ( R E F E R E N C E )  ░░  ║
  ║                                                      ║
  ║   Render vs Context ranges, newline clamps, and      ║
  ║   validation frontier semantics.                     ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ How we compute band ranges consistently
    • WHY  ▸ One source of truth for visuals and LM spans
    • HOW  ▸ Deterministic word segmentation + clamps
-->

## Responsibilities

- Provide two ranges per update:
  - Render range: what to show as the validation band (UI‑safe).
  - Context range: what to give to the LM (line/sentence aware).
- Ensure neither range crosses the caret or breaks Unicode boundaries.

## Rules

- Word segmentation via `Intl.Segmenter('word')` (TS) or ICU (Rust).
- Newline clamp: prefer not to cross line breaks for the render range.
- Size: defaults 3–8 words; configurable via `config/defaultThresholds.ts`.
- Context can be larger than render; render is always within context.

## Interfaces

- TS: `BandPolicy` with `computeRenderRange(state)` and `computeContextRange(state)`; see `core/diffusionController.ts`.
- Rust: expose equivalent helpers in `crates/core-rs` as needed.

## Tests

- Multi‑line inputs with trailing newline
- Zero‑width characters and surrogate pairs near boundaries
- Fast typing (frontier chases caret without crossing)

See also: `docs/guide/reference/lm-behavior.md` and `core/lm/policy.ts`.
