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

- TypingMonitor (`core/typingMonitor.ts`): emits keystream events.
- SweepScheduler (`core/sweepScheduler.ts`): orchestrates passes.
- Noise Transformer (`engines/noiseTransformer.ts`): proposes minimal, caret‑safe diffs.
  - REQ-TIDY-SWEEP, REQ-IME-CARETSAFE
- BackfillConsistency (`engines/backfillConsistency.ts`): stable‑zone passes.
- Diff (`utils/diff.ts`): replaceRange with caret safety. REQ-IME-CARETSAFE
- DiffusionController (`core/diffusionController.ts`): advances a frontier, requests word‑bounded diffs, updates the active region, catches up on pause.
- Highlighter (`ui/highlighter.ts`): active region (3–8 words behind caret) with subtle shimmer and reduced‑motion fallback; draws‑in corrections smoothly.
  - REQ-A11Y-MOTION
- GroupUndo (`ui/groupUndo.ts`): optional grouping of host‑applied diffs. Active region (formerly “tapestry”)/LM evolutions are excluded; they must preserve native undo behavior.

### LM & Context (v0.4)

- ContextTransformer (`engines/contextTransformer.ts`):
  - Selects band behind caret; builds prompt; orchestrates LM usage; merges within band only.
  - Integrates with `LMContextManager` and `LMAdapter` (Worker‑backed) for streaming.
- LMContextManager (`core/lm/contextManager.ts`):
  - Computes dual context windows: Close (2–5 sentences around caret; active excluded) and Wide (document‑level awareness for validation).
  - Validates proposals against Wide context before commit.
- LM Worker Adapter (`core/lm/workerAdapter.ts`):
  - Manages Web Worker lifecycle, timeouts, and error propagation.
- Transformers Runner (`core/lm/transformersRunner.ts`):
  - Configures ONNX Runtime Web wasmPaths (CDN by default; `/wasm/` local fallback).
