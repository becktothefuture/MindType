<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  L M   W O R K E R   ( R U N T I M E )  ░░░░░░░░  ║
  ║                                                      ║
  ║   Offload Transformers.js to a Worker with            ║
  ║   memory guard and graceful degradation.             ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ Worker protocol for prompts and stream chunks
    • WHY  ▸ Keep UI thread smooth; enforce memory budgets
    • HOW  ▸ Message API + abort + auto‑degrade to rules
-->

## Protocol

- `init({ localOnly, localModelPath, wasmPaths })`
- `generate({ prompt, maxNewTokens, requestId })` → emits `chunk` messages
- `abort({ requestId })`
- `status` → backend + memory snapshot

## Memory Guard

- Poll memory usage (best‑effort); if >150 MB typical, unload model and notify host to fall back to rules.

## Host Responsibilities

- Single‑flight generation; abort stale requests; respect cooldowns.
- Use `createDefaultLMAdapter(options?, runner?)` to obtain an `LMAdapter` backed by a `TokenStreamer`. For browser hosts, the default runner is the Transformers.js Qwen streamer; tests may inject a mock runner.

See: `docs/guide/reference/lm-behavior.md`, `core/lm/factory.ts`, `core/lm/index.ts`, and `crates/core-rs/src/*` (v0.2 orchestrator).

<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M  W O R K E R  &  B I N D I N G S   ( V 0 . 2 )   ░░  ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
    • WHAT ▸ Plan for wasm-bindgen exports and TS worker protocol
    • WHY  ▸ Centralize LM scheduling/merge in core; keep UI responsive
    • HOW  ▸ Rust runner + policies, TS worker bridge, adapters
-->

### Bindings

- wasm-bindgen exports:
  - `WasmPauseTimer`, `WasmFragmentExtractor`, `WasmMerger` (existing)
  - v0.2 adds: engine entry points and confidence utilities (thin)
- FFI C API (ffi.rs) for native hosts; WASM path mirrors the same primitives.

### Worker protocol (TS)

- Messages:
  - `loadModel { localOnly, paths, device }`
  - `generate { textSpan, policy }` → streams `token` events
  - `abort { requestId }`
- Guarantees:
  - Single-flight per worker; latest cancels prior
  - Memory guard under 150 MB; degrade to rules-only

### Integration

- Core orchestrates merges; UI listens for band/highlight; injector applies diffs.
- Demo: remove LM scheduling from React; rely on core + worker.

<!-- Alignment: LM merges stream strictly within the active region; abort on input; rollback on caret-entry. -->
