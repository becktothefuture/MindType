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
- TidySweep (`engines/tidySweep.ts`): proposes minimal, caret‑safe diffs.
  - REQ-TIDY-SWEEP, REQ-IME-CARETSAFE
- BackfillConsistency (`engines/backfillConsistency.ts`): stable‑zone passes.
- Diff (`utils/diff.ts`): replaceRange with caret safety. REQ-IME-CARETSAFE
- Highlighter (`ui/highlighter.ts`): 2‑word behind highlight.
  - REQ-A11Y-MOTION
- GroupUndo (`ui/groupUndo.ts`): group atomic edits per sweep.
