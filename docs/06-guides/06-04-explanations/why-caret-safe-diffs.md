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

<!-- Alignment note: Terminology updated to “active region”; this replaces older “validation band” wording throughout the system. -->

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
