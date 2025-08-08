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
- Core Engine: Rust crate (`crates/core-rs/`) + TS glue modules
  (`core/`, `engines/`, `utils/`).
- UI Shell: minimal visuals (`ui/`) honoring reduced motion.

Contracts

- REQ-IME-CARETSAFE: applies within Engine/Accessibility boundary.
- REQ-TIDY-SWEEP: `engines/tidySweep.ts` public function contract.
- REQ-A11Y-MOTION: `ui/highlighter.ts` honors motion prefs.
