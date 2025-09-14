<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  C 3   —   C O M P O N E N T S  ░░░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Key components with responsibilities
    • WHY  ▸ Map PRD REQs to code units
    • HOW  ▸ Keep short; link files
-->

- InputMonitor (`crates/core-rs/src/monitor.rs`): emits keystream events.
- CorrectionScheduler (`crates/core-rs/src/scheduler.rs`): orchestrates correction passes.
- Noise Worker (`crates/core-rs/src/workers/noise.rs`): proposes minimal, caret‑safe diffs.
  - REQ-NOISE-CORRECTION, REQ-IME-CARETSAFE
- BackfillWorker (`crates/core-rs/src/workers/backfill.rs`): stable‑zone corrections.
- DiffModule (`crates/core-rs/src/diff.rs`): replaceRange with caret safety. REQ-IME-CARETSAFE
- DiffusionController (`crates/core-rs/src/diffusion.rs`): advances a frontier, requests word‑bounded diffs, updates the active region, catches up on pause.
- Highlighter (`web-demo/src/components/highlighter.tsx`): active region (3–8 words behind caret) with subtle shimmer and reduced‑motion fallback; draws‑in corrections smoothly.
  - REQ-A11Y-MOTION
- GroupUndo (`web-demo/src/components/groupUndo.tsx`): optional grouping of host‑applied diffs. Active region/LM evolutions are excluded; they must preserve native undo behavior.

### LM & Context (v0.4)

- ContextWorker (`crates/core-rs/src/workers/context.rs`):
  - Selects active region behind caret; builds prompt; orchestrates LM usage; merges within active region only.
  - Integrates with LM context management and adapter for streaming.
- LMContextManager (`crates/core-rs/src/lm/context_manager.rs`):
  - Computes dual context windows: Close (2–5 sentences around caret; active excluded) and Wide (document‑level awareness for validation).
  - Validates proposals against Wide context before commit.
- LM Worker Bridge (Platform UI layer):
  - Manages Web Worker lifecycle, timeouts, and error propagation for web demo.
- LM Runner (`crates/core-rs/src/lm/runner.rs`):
  - Configures model execution and fallback strategies.
