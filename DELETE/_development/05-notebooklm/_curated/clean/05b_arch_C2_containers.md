- Web Demo: `web-demo/` (aha moment, no real input capture).
- macOS Helper: Swift shell (AppKit/SwiftUI) managing permissions, UI,
  Accessibility bridge.
- Core Engine: Rust crate (`crates/core-rs/`) + TS glue modules
  (`core/`, `engines/`, `utils/`).
- UI Shell: minimal visuals (`ui/`) honoring reduced motion.

Contracts

- REQ-IME-CARETSAFE: applies within Engine/Accessibility boundary.
- REQ-NOISE-TRANSFORMER: `engines/noiseTransformer.ts` public function contract.
- REQ-A11Y-MOTION: `ui/highlighter.ts` honors motion prefs.

### Web Demo specifics (v0.4)

- LM runs in a module Web Worker via `core/lm/workerAdapter.ts`; the UI layer does not own LM orchestration.
- Dual‑context is computed in `core/lm/contextManager.ts`; demo exposes a Workbench tab to visualize Close/Wide context and LM health.
- ONNX Runtime Web assets are loaded from CDN by default; `localOnly` mode uses `/wasm/` fallback.
