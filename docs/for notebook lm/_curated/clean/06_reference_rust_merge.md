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
