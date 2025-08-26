# Project Structure (beginner-friendly)

| Folder            | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| `config/`         | Global thresholds/tunables                         |
| `core/`           | Orchestration (typing monitor, scheduler)          |
| `engines/`        | TidySweep & BackfillConsistency (rules)            |
| `utils/`          | Pure helpers (diff/caret safety)                   |
| `ui/`             | Swap renderer (mechanical), SR cues, undo grouping |
| `tests/`          | Unit tests for TS core/engines/utils               |
| `crates/core-rs/` | Rust core (compiled to WASM for the web)           |
| `web-demo/`       | React/Vite demo; LM wiring via Rust WASM           |
| `docs/`           | Specs, guides, plans                               |
| Root configs      | Lint/test/tsconfig, `Justfile`, scripts            |

Notes:

- The previous path `platform/web_demo/` is deprecated; the demo lives in `web-demo/` now.
