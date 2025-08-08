<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  A D R  —  C A R E T - S A F E   D I F F  ░░░░░░  ║
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
    • WHAT ▸ Never apply edits at/after the CARET
    • WHY  ▸ Avoid user surprise; maintain trust & flow
    • HOW  ▸ Guardrails in `utils/diff.ts`, engine checks
-->

Context
Users must never see unexpected forward edits; IME/secure fields require
strict boundaries.

Decision
All diffs MUST satisfy `end <= caret`. Engines MUST reject proposals that
cross the caret. (PRD: REQ-IME-CARETSAFE)

Consequences
- Simpler mental model; robust undo integration.
- Limits certain ahead‑of‑caret fixes; acceptable for trust.

Alternatives
- Allow ahead edits with preview/confirm — rejected for flow/latency.

Links
- Code: `utils/diff.ts`, `engines/tidySweep.ts`
- Tests: `tests/diff.spec.ts`, `tests/tidySweep.spec.ts`


