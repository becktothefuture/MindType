<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  Q U E S T I O N S   L O G  ░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Central place to capture clarifications needed to         ║
  ║   proceed confidently. Live, iterative, and referenced      ║
  ║   by all tasks.                                             ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
    • WHAT ▸ Shared Q&A artifact influencing design & impl
    • WHY  ▸ Reduce back-and-forth, ensure decisions are visible
    • HOW  ▸ Add questions inline; answer directly under them
-->

## How to use this document

- Add questions whenever a task needs clarification. Keep them short and specific.
- Answers go directly beneath questions, in bold “Answer” blocks.
- Link each question to its related FT-\* task(s) and doc sections.
- Treat resolved answers as source-of-truth until superseded.
- Reference this doc in PRs; copy key decisions to `docs/02-implementation/02-Implementation.md` if they affect scope/AC.

## Template

### Q{NNN}: <short title>

- Related: FT-xxxx, docs/...
- Context: <why this matters>
- Question: <the thing to clarify>

Answer:

> <Owner fills here>

Notes:

- <any follow-ups or implications>

---

## Open Questions

### Q001: Local-only asset location policy

- Related: FT-231E, FT-231A
- Context: We need a canonical path for locally hosted models and WASM binaries to avoid 404s and mismatched versions.
- Question: Should we standardize on `/models/` and `/wasm/` under the app root, and require `pnpm setup:local` before enabling `localOnly`?

Answer:

> TBD

Notes:

- If yes, we will show a one-line preflight log suggesting `pnpm setup:local` when assets are missing, and auto-fallback to rules-only.

### Q002: Device-tier thresholds

- Related: FT-231D, FT-231F, FT-232B
- Context: On non-WebGPU devices, we should auto-degrade token caps and spacing.
- Question: Do we adopt default tiers: webgpu (tokens 32–48, debounce ~50–150ms), wasm-simd (16–24, 150–400ms), cpu-basic (8–16, 300–600ms)?

Answer:

> TBD

Notes:

- These will guide default merges and scheduling.

### Q003: Confidence gating source of truth

- Related: FT-232, FT-232A
- Context: When LM and rules disagree, we prefer rules on structural conflicts, LM on semantic ones. We need a single place to calculate “confidence”.
- Question: Do we keep confidence heuristics in `core/lm/policy.ts` or move them into `DiffusionController` for access to runtime signals (latency, abort rate)?

Answer:

> TBD

Notes:

- Keeping it in policy keeps host-agnostic behavior; controller may pass runtime hints to policy.

### Q004: Rollback granularity (active region)

- Related: FT-232A
- Context: If the caret enters the active region mid-stream, we need to undo any partial LM merge.
- Question: Should rollback be span-level (revert entire span) or incremental (revert only the yet-unconfirmed suffix)?

Answer:

> TBD

Notes:

- Span-level is simpler and safer initially; incremental can come later.

### Q005: Error-type prompt templates

- Related: FT-231C
- Context: Tailored prompts can improve precision.
- Question: Which error buckets do we prioritize first (typos, casing, punctuation, grammar)?

Answer:

> TBD

Notes:

### Q008: Branding alignment — Mind::Type vs MindTyper

- Related: docs/brand/messaging.md, README.md, PRD Summary, implementation tasks
- Context: Public pitch uses “Mind::Type”; internal code and many docs use “MindTyper”. We need a single naming policy for public copy, docs, package names, and code identifiers.
- Question: Do we officially adopt “Mind::Type” as the public brand while retaining `MindTyper` as the internal/project code name for v0.2 (docs and code), with a later unification task? Or should we migrate code/docs now for consistency?

Answer:

> TBD

Notes:

- If we keep both for v0.2, add a persistent naming note in docs/README and brand guidelines; schedule a rename task post‑v0.2.

- We’ll add toggles as we add templates, keeping the default concise.

### Q006: Remote model opt-in default and data handling (RESOLVED)

- Related: FT-231, crates/core-rs/src/\*, docs/06-guides/06-03-reference/lm-worker.md
- Context: Principles propose "remote off unless opted in". Current runner defaults to allow remote unless `localOnly=true`.
- Question: Should the default be `localOnly=true` at the host level unless the user explicitly enables remote models for the session? If not, how do we surface opt-in clearly and reversibly?

Answer:

> Default to localOnly=true; remote requires explicit per‑session opt‑in and resets on restart. No user text persisted; no outbound analytics.

Notes:

- If default remains remote-allowed, we must add a prominent opt-in toggle and a per-session indicator in the demo.

### Q007: Control-plane JSON in prompts (RESOLVED)

- Related: FT-232, core/lm/policy.ts
- Context: We allow control-plane JSON in prompts for determinism while sanitizing outputs to plain text.
- Question: Do we standardize this as a core pattern? What is the acceptable size budget for control metadata within the prompt window?

Answer:

> Approved. Budget ≤10% of prompt window. Outputs sanitized to plain text (strip labels/guillemets; clamp length).

Notes:

- Document the JSON schema and enforce output sanitization (labels/guillemets stripped; length clamped).
