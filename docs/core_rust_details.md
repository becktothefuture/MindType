# Rust Core Details (`crates/core-rs`)

This document provides low-level information for contributors working inside the Rust crate. It complements the high-level spec (§2).

## Crate Layout

```
core-rs/
├─ src/
│  ├─ lib.rs          # public API, cfg(features)
│  ├─ pause_timer.rs  # idle-detection state machine
│  ├─ fragment.rs     # Unicode-aware extraction
│  ├─ merge.rs        # incremental diff engine (wraps `dmp` crate)
│  ├─ llm.rs          # async LLM client abstraction
│  └─ tests/
├─ benches/           # criterion benchmarks
├─ Cargo.toml         # `wasm` + `ffi` features
└─ build.rs           # generates C header if `ffi` enabled
```

## Public API (simplified)

```rust
// lib.rs
#[cfg(feature = "ffi")] // C + Swift
#[no_mangle]
pub extern "C" fn mindtype_touch_timer(handle: *mut PauseTimer);

#[cfg(feature = "wasm")] // wasm-bindgen for TS
#[wasm_bindgen]
impl PauseTimer {
    #[wasm_bindgen(constructor)]
    pub fn new(idle_ms: u32) -> PauseTimer;
    pub fn touch(&mut self);
}
```

All exported functions are `#![no_std]`-friendly to enable future embedded targets.

## Fragment Extraction Rules

1. Look back ≤250 code points for Unicode category _Sentence_Terminal_ plus full-width `。`.
2. Respect bidirectional text order using the `unicode-bidi` crate.
3. Provide 100-char context both sides, clamped to buffer bounds.

## Diff Strategy

- Uses the `dmp` crate fork with streaming patches.
- Patch window limited to the fragment range for O(Δ) behaviour.

## LLM Abstraction

The core defers transport to consumer:

```rust
pub trait TokenStream: AsyncIterator<Item = String> + Send {}
```

Bindings provide concrete impls (`OpenAIStream`, `CoreMLStream`). This keeps the core free of TLS/HTTP deps unless `cloud` feature is enabled.

## Testing & Benchmarks

Run `cargo test` for correctness, `cargo bench` for performance baselines. Golden vectors in `shared-tests/` are loaded via `serde_json`.
