<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  C 2   —   C O N T A I N E R S  ░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ High-level deployable containers
    • WHY  ▸ Clarify boundaries & contracts
    • HOW  ▸ Reference PRD REQs and modules
-->

- Web Demo: `web-demo/` (aha moment, no real input capture).
- macOS Helper: Swift shell (AppKit/SwiftUI) managing permissions, UI,
  Accessibility bridge.
- Core Engine: Rust crate (`crates/core-rs/`) handles all correction logic.
- UI Shell: minimal visuals in platform UI layers (web-demo, macOS app) honoring reduced motion.

Contracts

- REQ-IME-CARETSAFE: applies within Engine/Accessibility boundary.
- REQ-NOISE-CORRECTION: `crates/core-rs/src/workers/noise.rs` public function contract.
- REQ-A11Y-MOTION: Platform UI components honor motion prefs.

### Web Demo specifics (v0.4)

- LM runs in Rust core with optional Web Worker bridge for web demo; the UI layer does not own LM orchestration.
- Dual‑context is computed in Rust core LM context manager; demo exposes a Workbench tab to visualize Close/Wide context and LM health.
- ONNX Runtime Web assets are loaded from CDN by default; `localOnly` mode uses `/wasm/` fallback.
