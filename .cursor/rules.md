<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  C U R S O R   W O R K S P A C E   R U L E S  ░░░░░░░░░░  ║
  ║                                                              ║
  ║   House directives for Cursor's AI to follow in this repo.   ║
  ║   Encodes task order, quality gates, LM policy, and Q&A.     ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
    • WHAT ▸ Ensure consistent execution across sessions
    • WHY  ▸ Avoid drift; keep behaviour predictable + testable
    • HOW  ▸ Read these rules first; consult linked docs
-->

### Golden Rules

1. Follow the plan, in order

- Execute tasks strictly in the order listed under “Critical LM Task Execution Order” in `docs/implementation.md`.
- Announce any intentional deviation with justification; otherwise, do not re-order.

2. Enforce Quality Gates & Definition of Done

- Before marking any task complete: `pnpm typecheck && pnpm lint && pnpm run -s format:check && pnpm test` must pass; coverage guard stays green.
- Update docs (plan, QA matrix, behaviour specs) as part of completion.
- Update docs (plan, QA matrix, behaviour specs) as part of completion.
- If a PR changes behaviour but does not update `docs/system_principles.md` and relevant guides/tests, CI should fail.

3. Use the Questions Log

- Always check `docs/questions.md` before starting a task.
- If clarification is needed, add a new question (QXXX) with context and link to FT-\*; proceed on the safest default and adjust when answered.
- Reference Q entries in PR descriptions and reflect decisions in AC.

4. Core‑first LM behaviour

- LM span selection, scheduling, merge policy, and safety live in core (`core/**`).
- The web demo must not duplicate LM scheduling; it only renders UI and debug info.

5. Device tiers and local‑only

- Detect backend accurately (WebGPU → WASM SIMD/threads → CPU) and auto‑degrade token caps and cadence on slower tiers.
- When `localOnly=true`, preflight model/WASM assets; fall back to rules‑only if missing and log a helpful hint to run `pnpm setup:local`.

6. Safety and single‑flight

- Never edit at/after the caret; merge only within the validation band.
- Enforce single‑flight with abort; stale results are dropped; if caret enters band, rollback/cancel.

7. Tests & docs as deliverables

- Add unit/integration tests for new logic and update `docs/qa/README.md` test mapping.
- Keep `docs/lm_behavior.md` and `docs/implementation.md` in sync with behaviour changes.

8. Communication discipline

- Provide brief status updates (what just happened / what’s next / risks) and a short summary on completion.
- Prefer concise, skimmable explanations; show only relevant code snippets.

9. Execution discipline

- Always pick the first unchecked task in “Critical LM Task Execution Order” unless blocked by a Questions entry.
- Use context7 to validate best practices (Transformers.js/WebGPU/WASM) before coding LM tasks.

10. Code editing rules

- Preserve indentation style; avoid unrelated refactors.
- Add the Swiss‑grid header to any new file; keep comment density <50%.
- Update tests and relevant docs in the same PR as code changes.

11. Tooling workflow

- Prefer semantic search first; combine with grep for exact symbols.
- Batch read-only lookups in parallel when possible.
- After edits, run lints for the touched files and fix before commit.

12. Testing & CI

- For each task: add unit tests; add an integration test if behaviour is user-visible.
- Maintain ≥90% overall coverage; do not lower thresholds.
- Run the one-command gate: `pnpm -s ci` before commit.

13. Git & PR hygiene

- Small, atomic commits with FT-ID in the subject.
- PR template: tests added, gates green, docs updated, linked Questions answered.
- Do not merge if CI is red or Questions are unresolved.

14. LM-specific policies

- Orchestration lives in core; the web demo must not implement LM scheduling/merge logic.
- Enforce single-flight + abort; drop stale generations; rollback if caret enters band.
- Prompt must be a single strict string; sanitize outputs (strip labels/guillemets; clamp length).
- Device tiers: WebGPU > WASM SIMD/threads > CPU; auto-degrade tokens/debounce on slower tiers.
- Local-only: preflight assets; if missing, fall back to rules-only and log guidance.

15. Browser/performance targets

- Primary dev targets: Chrome/Edge; verify Safari fallback each PR.
- Warm-up once after load; cap tokens by device tier; keep p95 latency within documented bounds.

16. Docs & Questions discipline

- Update `docs/implementation.md`, `docs/lm_behavior.md`, and `docs/qa/README.md` for any behaviour change.
- Log uncertainties in `docs/questions.md`; proceed on safe defaults; revisit once answered.

17. Observability & safety

- Debug logs are gated; errors always visible. No external telemetry.
- Never edit at/after the caret; all merges must be band-bounded.

18. Fallbacks and resilience

- Any LM error → immediate, silent degrade to rules-only; show a non-blocking debug notice.

### References

- Plan and task order: `docs/implementation.md`
- QA matrix and CI gates: `docs/qa/README.md`
- LM policy/behaviour: `docs/lm_behavior.md`
- Questions log: `docs/questions.md`
