# Rust Core Details (`crates/core-rs`)

This document explains the Rust part of Mind::Type in plain language, with examples. It complements the high‑level spec and the README. Acronyms are expanded when first used.

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
└─ build.rs           # generates C header if `ffi` enabled (for Swift/FFI)
```

## Public API (simplified)

“Public API” means the functions/types other parts of the app can call. We ship two flavors:

- **FFI (Foreign Function Interface)** for native apps (Swift on macOS)
- **WASM (WebAssembly)** for the web demo (TypeScript/React)

```rust
// lib.rs
#[cfg(feature = "ffi")] // C + Swift
#[no_mangle]
pub extern "C" fn mindtype_touch_timer(handle: *mut PauseTimer);

#[cfg(feature = "wasm")] // wasm-bindgen for TS/JS in the browser
#[wasm_bindgen]
impl PauseTimer {
    #[wasm_bindgen(constructor)]
    pub fn new(idle_ms: u32) -> PauseTimer;
    pub fn touch(&mut self);
}
```

All exported functions are designed to be portable.

### FFI header generation (cbindgen)

Run:

```bash
cbindgen --config crates/core-rs/cbindgen.toml --crate core-rs --output crates/core-rs/core_rs.h
```

Memory management for strings:

```c
// Call this after consuming any MTString returned from Rust
void mind_type_core_free_string(struct MTString s);
```

### WASM bindings in this repo (already available)

From `src/lib.rs`:

```rust
#[wasm_bindgen]
pub fn init_logger() { /* ... */ }

#[wasm_bindgen]
pub struct WasmPauseTimer { /* new(), record_activity(), is_paused() */ }

#[wasm_bindgen]
pub struct WasmFragmentExtractor { /* new(), extract_fragment(&str) -> Option<String> */ }

#[wasm_bindgen]
pub struct WasmMerger { /* new(&str), apply_token(&str), get_result() -> String */ }

#[wasm_bindgen]
pub struct WasmStubStream { /* new(&str), async next_token() -> Option<String> */ }
```

You can call these directly from TypeScript after the WASM package is built.

## Fragment Extraction Rules

1. Look back ≤250 code points for Unicode category _Sentence_Terminal_ plus full-width `。`.
2. Respect bidirectional text order using the `unicode-bidi` crate.
3. Provide 100‑char context both sides, clamped to buffer bounds.

Simple example (what it does today):

Input: `"Hello world. This is a test."` → Output: `"This is a test."`

Why this matters: We only correct complete sentences, avoiding awkward mid‑word edits.

## Diff Strategy

Today the `Merger` is intentionally simple (append tokens). In the future:

- Use a streaming diff/patch strategy limited to the fragment to keep latency low.
- Apply changes with caret safety (never edit at/after the caret).

## LLM Abstraction

The core defers transport to consumer:

```rust
pub trait TokenStream: AsyncIterator<Item = String> + Send {}
```

Bindings will provide concrete impls (`OpenAIStream`, `CoreMLStream`). This keeps the core free of networking until explicitly enabled.

Today we ship a stub stream for demos/tests:

```rust
let mut stream = WasmStubStream::new("This is a corrected sentence.");
while let Some(token) = stream.next_token().await { /* feed into Merger */ }
```

## Testing & Benchmarks

Run `cargo test` for correctness. When we add benchmarks we’ll use Criterion (`cargo bench`).

### Tip: WASM time sources

If you see time/clock errors when building for WASM (due to `chrono`), we’ll switch to the browser clock via `js_sys::Date::now()` for WASM builds and keep `chrono` for native.

<!-- Alignment: Rust core uses Tokio for async, wasm-bindgen for web, and cbindgen/UniFFI for C/Swift bindings. -->
