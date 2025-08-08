<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  E X P L A I N E R  —  C A R E T - S A F E  ░░░░  ║
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
    • WHAT ▸ Rationale for never editing ahead of caret
    • WHY  ▸ Trust, predictability, and undo integration
    • HOW  ▸ Engine + utils enforce guardrails
-->

Editing ahead of the caret surprises users and breaks trust. By limiting
edits to behind the caret, we keep ⌘Z atomic, avoid cursor jumps, and
align with IME/secure field constraints.


