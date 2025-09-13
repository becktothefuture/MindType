# Project Structure (beginner-friendly)

[Back to Master](./00-index/00-README.md) · [Tasks](./02-implementation/02-Implementation.md) · [Architecture](./04-architecture/README.md)

| Folder               | Purpose                                               |
| -------------------- | ----------------------------------------------------- |
| `config/`            | Global thresholds/tunables                            |
| `core/`              | Orchestration (typing monitor, scheduler)             |
| `engines/`           | Noise, Context (implemented), Tone (partial)          |
| `utils/`             | Pure helpers (diff/caret safety)                      |
| `ui/`                | Swap renderer, highlighter, live region (a11y)        |
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

- The demo lives in `web-demo/`.
- The older term `tapestry` is now `active region`; see `core/activeRegion.ts`.
