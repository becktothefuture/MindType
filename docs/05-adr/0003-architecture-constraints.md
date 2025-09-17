<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  A D R  —  A R C H I T E C T U R E   C O N S T R A I N T S  ░  ║
  ║                                                                  ║
  ║                                                                  ║
  ║                                                                  ║
  ║                                                                  ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                          ║
  ║                                                                  ║
  ║                                                                  ║
  ║                                                                  ║
  ║                                                                  ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ Document on‑device processing and prohibitions
    • WHY  ▸ Align implementation with PRD guardrails
    • HOW  ▸ Enforce via code paths, CI checks, and tests
-->

Title: Architecture Constraints
Date: 2025‑08‑09

Context
MindType prioritises privacy, trust, and low latency. The PRD
mandates on‑device processing and prohibits heavy or intrusive UI.

Decision
Adopt explicit constraints for all implementations:

- On‑device Processing: All text processing occurs locally by default.
- No Cloud Text Processing: Input text MUST NOT be sent to servers.
- Minimal UI: No heavy suggestion popups or complex widgets.
- Caret Safety: Never apply edits at/after caret (see ADR‑0002).

Consequences

- Networking code MUST avoid transmitting raw input. Only telemetry
  that contains no plaintext and is opt‑in may be sent.
- WASM/FFI boundaries MUST expose local inference surfaces.
- UI components MUST remain lightweight and accessible.

Scope of Prohibitions (WON'T)

- Cloud GrammarWorker or server‑side diffing of user text.
- Persistent remote storage of input content.
- Complex suggestion panels, ranked lists, or blocking dialogs.

Verification

- Unit tests assert caret safety and secure‑field guards.
- CI denies any dependency or code path labelled for cloud text
  processing until an explicit feature flag/ADR revises this.

Links

- PRD: `docs/01-prd/01-PRD.md` → Goals (MUST/WON'T), Constraints
- Related: `docs/adr/0002-caret-safe-diff.md`

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
