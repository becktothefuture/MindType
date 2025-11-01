Title: Architecture Constraints
Date: 2025‑08‑09

Context
MindTyper prioritises privacy, trust, and low latency. The PRD
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

- Cloud grammar correction or server‑side diffing of user text.
- Persistent remote storage of input content.
- Complex suggestion panels, ranked lists, or blocking dialogs.

Verification

- Unit tests assert caret safety and secure‑field guards.
- CI denies any dependency or code path labelled for cloud text
  processing until an explicit feature flag/ADR revises this.

Links

- PRD: `docs/01-prd/01-PRD.md` → Goals (MUST/WON'T), Constraints
- Related: `docs/adr/0002-caret-safe-diff.md`
