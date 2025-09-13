<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  D A T A   M O D E L   &   P E R S I S T E N C E  ░░░░░░  ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
    • WHAT ▸ Define core entities/relationships and constraints
    • WHY  ▸ Blueprint for persistence and AI reasoning
    • HOW  ▸ TS-first types; optional persistence adapters later
-->

### Scope

This document captures the runtime data model used by Mind::Type's core pipeline. Today, data is in-memory only; future hosts may persist settings and logs locally. No user text leaves the device.

### Entities

- **TypingSnapshot**
  - Keys: `atMs`
  - Fields: `text: string`, `caret: number`, `atMs: number`
  - Constraints: `0 ≤ caret ≤ text.length`

- **ActiveRegion**
  - Keys: implicit by `start,end`
  - Fields: `start: number`, `end: number`, `minWords: number`, `maxWords: number`
  - Constraints: `0 ≤ start ≤ end ≤ text.length`; size targets 3–8 words; never crosses caret

- **Diff**
  - Keys: implicit by `start,end`
  - Fields: `start: number`, `end: number`, `text: string`
  - Constraints: `end ≥ start`; apply only when `end < caret` (caret-safe)

- **SweepResult**
  - Fields: `diff: Diff | null` (tidy), `diffs: Diff[]` (backfill)
  - Constraints: all diffs respect caret safety and window limits

- **TapestrySpan (future)**
  - Fields: `{ original: string; corrected: string; start: number; end: number; confidence: number; appliedAtMs: number }`
  - Relationships: spans are ordered, non-overlapping; define the validated neighborhood behind caret

- **Settings**
  - Keys: `profile` (default)
  - Fields: `typingTickMs`, `minRegionWords`, `maxRegionWords`, `reducedMotion`, `localOnly`
  - Constraints: `minRegionWords ≤ maxRegionWords`; clamp ranges to sane defaults

### Relationships

- `TypingSnapshot` → determines `ActiveRegion` window.
- `SweepResult` → produces `Diff`(s) within the `ActiveRegion` trailing zone.
- `TapestrySpan`(s) ← derived from applied diffs; drive rollback and confidence.

### Constraints (Business Rules)

- Caret Safety: No `Diff` may start or end at/after caret.
- Windowing: Tidy operates within `MAX_SWEEP_WINDOW` behind caret; Backfill only in the stable zone.
- Reduced Motion: Visual feedback degrades to static when enabled.
- Privacy: No text persistence by default; logs gated and content-free.

### Persistence (Future hosts)

- Settings: local storage (web), `UserDefaults` (macOS). Schema versioned with migrations if needed.
- Telemetry: none by default. Optional debug logs are ephemeral.
- Text/Spans: not persisted unless an explicit feature requires it; if added, must be local-only and opt-in.

### TypeScript Types (source of truth)

See `core/typingMonitor.ts`, `core/diffusionController.ts`, `utils/diff.ts`, and `core/lm/types.ts` for canonical shapes. Keep types and this doc in sync.

### Traceability

- PRD: REQ-IME-CARETSAFE, REQ-STREAMED-DIFFUSION, REQ-ACTIVE-REGION, REQ-LOCAL-LM-INTEGRATION
- ADRs: ADR-0002 (caret-safe diffs), ADR-0003 (architecture constraints)
- QA: `docs/qa/acceptance/*.feature` scenarios map to caret safety and active region behavior
