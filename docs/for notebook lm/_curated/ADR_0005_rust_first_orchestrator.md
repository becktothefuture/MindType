<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  ADR-0005: RUST‑FIRST ORCHESTRATOR (V0.2)  ░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Move scheduling/merge policy into Rust core; TS becomes host
    • WHY  ▸ Performance, safety, single source of truth across platforms
    • HOW  ▸ `crates/core-rs` adds engine, confidence, tapestry, FFI/WASM
-->

Status: Accepted (v0.2)

Decision: The orchestrator (scheduling, span selection, merge policy, confidence gating) lives in Rust. Web uses wasm-bindgen bindings; native uses C FFI. TS demo and hosts only capture input, apply diffs, and render visual feedback.

Consequences:

- TS-side LM scheduling removed from demo
- Workerized LM path retained, but controlled by core
- Tests and QA updated to validate rollback and caret-entry guards

See also: `docs/guide/reference/lm-worker.md`, `docs/implementation.md`, `crates/core-rs/src/*`.
