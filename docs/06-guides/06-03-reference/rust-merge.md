<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  R U S T   C A R E T ‑ S A F E   M E R G E  ░░░░░  ║
  ║                                                      ║
  ║   Native merge applying small spans with caret and    ║
  ║   Unicode guards. Exported to WASM and Swift.         ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ `apply_span(text, start, end, replacement, caret)`
    • WHY  ▸ Faster, unified safety vs TS implementation
    • HOW  ▸ Boundary checks + surrogate pair detection
-->

## Requirements

- Reject ranges out‑of‑bounds or `end < start`.
- Reject any edit that reaches beyond `caret`.
- Reject when `start/end/caret` split surrogate pairs (UTF‑16 aware when bridged).

## Bindings

- WASM: `WasmApplySpan` exported via `wasm-bindgen`.
- Swift: C header via `cbindgen` + `libmindtype.a`.

## Tests

- Surrogate pair boundaries, zero‑width joiners
- Large strings performance vs TS `replaceRange`

See also: `utils/diff.ts`, ADR‑0002.

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
