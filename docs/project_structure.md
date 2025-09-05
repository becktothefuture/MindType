# Project Structure (beginner-friendly)

| Folder               | Purpose                                               |
| -------------------- | ----------------------------------------------------- |
| `config/`            | Global thresholds/tunables                            |
| `core/`              | Orchestration (typing monitor, scheduler)             |
| `engines/`           | Noise, Context, Tone transformers (rules + LM)        |
| `utils/`             | Pure helpers (diff/caret safety)                      |
| `ui/`                | Swap renderer (mechanical), SR cues, undo grouping    |
| `tests/`             | Unit tests for TS core/engines/utils                  |
| `tests/performance/` | Performance benchmarks and device tier tests          |
| `crates/core-rs/`    | Rust core (compiled to WASM for the web)              |
| `bindings/swift/`    | Swift FFI bridge for macOS integration                |
| `bindings/c/`        | C header files for cross-platform FFI                 |
| `web-demo/`          | React/Vite demo; Real LM integration + controls       |
| `e2e/`               | Playwright end-to-end tests with comprehensive README |
| `docs/`              | Specs, guides, plans                                  |
| Root configs         | Lint/test/tsconfig, `Justfile`, scripts               |

Notes:

- The previous path `platform/web_demo/` is deprecated; the demo lives in `web-demo/` now.
