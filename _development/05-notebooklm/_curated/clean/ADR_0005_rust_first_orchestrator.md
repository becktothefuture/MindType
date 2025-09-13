Status: Accepted (v0.2)

Decision: The orchestrator (scheduling, span selection, merge policy, confidence gating) lives in Rust. Web uses wasm-bindgen bindings; native uses C FFI. TS demo and hosts only capture input, apply diffs, and render visual feedback.

Consequences:

- TS-side LM scheduling removed from demo
- Workerized LM path retained, but controlled by core
- Tests and QA updated to validate rollback and caret-entry guards

See also: `docs/06-guides/06-03-reference/lm-worker.md`, `docs/02-implementation/02-Implementation.md`, `crates/core-rs/src/*`.
