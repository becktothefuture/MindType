Context
Users must never see unexpected forward edits; IME/secure fields require
strict boundaries.

Decision (Traceability)
All diffs MUST satisfy `end <= caret`. Engines MUST reject proposals that
cross the caret. (PRD: REQ-IME-CARETSAFE, Principles: PRIN-SAFETY-04)

Consequences

- Simpler mental model; robust undo integration.
- Limits certain ahead‑of‑caret fixes; acceptable for trust.

Alternatives

- Allow ahead edits with preview/confirm — rejected for flow/latency.

Links (Traceability)

- PRD: `docs/PRD.md#functional-requirements`
- Principles: `docs/system_principles.md#4-caret-safe-never-risky`
- Architecture: `docs/architecture/C3-components.md`
- Code: `utils/diff.ts`, `engines/noiseTransformer.ts`
- Tests: `tests/diff.spec.ts`, `tests/noiseTransformer.spec.ts`
