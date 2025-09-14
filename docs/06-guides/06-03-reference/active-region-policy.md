<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  A C T I V E   R E G I O N   P O L I C Y  ░░░░░░░  ║
  ║                                                      ║
  ║   Render vs Context ranges, newline clamps, and      ║
  ║   validation frontier semantics.                     ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ How we compute active‑region ranges consistently
    • WHY  ▸ One source of truth for visuals and LM spans
    • HOW  ▸ Deterministic word segmentation + clamps
-->

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

- Rust: `ActiveRegionPolicy` with `computeRenderRange(state)` and `computeContextRange(state)`; see `crates/core-rs/src/active_region.rs`.
- Platform UI: consume policy via FFI/WASM bridge as needed.

## Tests

- Multi‑line inputs with trailing newline
- Zero‑width characters and surrogate pairs near boundaries
- Fast typing (frontier chases caret without crossing)

See also: `docs/06-guides/06-03-reference/lm-behavior.md` and `crates/core-rs/src/lm/policy.rs`.

## Grapheme-safe boundaries (Unicode)

- Ranges MUST align to grapheme clusters (UAX #29). Do not split emoji, ZWJ sequences, or combining marks.
- UI positions (UTF-16) are mapped to Rust byte indices (UTF-8) via validated helpers; invalid boundaries are rejected.
- Tests SHOULD include ZWJ emoji, skin-tone modifiers, and combining accents near range edges.
