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
- SweepScheduler (`core/sweepScheduler.ts`): orchestrates passes, integrates LM adapter with context transformer.
- **LMContextManager (`core/lm/contextManager.ts`)**: manages dual-context system with wide context (full document) and close context (2-5 sentences around caret). Handles click-to-activate initialization and proposal validation.
  - REQ-LM-CONTEXT, REQ-LM-VALIDATION
- **WorkerAdapter (`core/lm/workerAdapter.ts`)**: Web Worker integration for LM processing, handles streaming responses and error recovery.
  - REQ-LM-PERFORMANCE, REQ-LM-RELIABILITY
- Noise Transformer (`engines/noiseTransformer.ts`): proposes minimal, caret‑safe diffs.
  - REQ-TIDY-SWEEP, REQ-IME-CARETSAFE
- **Context Transformer (`engines/contextTransformer.ts`)**: enhanced with LM integration, uses dual-context for semantic corrections with validation.
  - REQ-LM-INTEGRATION, REQ-CONTEXT-VALIDATION
- Tone Transformer (`engines/toneTransformer.ts`): stylistic adjustments using LM.
- BackfillConsistency (`engines/backfillConsistency.ts`): stable‑zone passes.
- Diff (`utils/diff.ts`): replaceRange with caret safety. REQ-IME-CARETSAFE
- DiffusionController (`core/diffusionController.ts`): advances a frontier, requests word‑bounded diffs, updates the active region, catches up on pause.
- Highlighter (`ui/highlighter.ts`): active region (3–8 words behind caret) with subtle shimmer and reduced‑motion fallback; draws‑in corrections smoothly.
  - REQ-A11Y-MOTION
- GroupUndo (`ui/groupUndo.ts`): optional grouping of host‑applied diffs. Active region (formerly "tapestry")/LM evolutions are excluded; they must preserve native undo behavior.
