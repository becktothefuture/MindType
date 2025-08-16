<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  P1 TEST MATRIX & QUALITY GATES  ░░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Checklist linking P1 tasks to tests and gates
    • WHY  ▸ Hard proof that features work even without manual UI tests
    • HOW  ▸ Map each FT-* to unit/integration/acceptance tests + CI gates
-->

### P1 Test Matrix (living checklist)

- FT-115 Secure field detection
  - Unit: `tests/secureFields.spec.ts` covers IME + secure inputs; extend with more field types
  - Integration: Pipeline drops events when secure; no band render
  - Acceptance: Scenario doc in `docs/qa/acceptance/caret_safety.feature` (add secure-field scenario)

- FT-123 Minimal logging
  - Unit: Logger emits nothing by default; emits expected lines under debug flag
  - Integration: Debug traces do not change timing/behaviour

- FT-130/131 Rust core + fragment extraction
  - Rust tests: `crates/core-rs/src/*` with `proptest` and golden fixtures in `shared-tests/`
  - Bench: Criterion baselines (document in PR only for P1)

- FT-310/311/312 A11y
  - Unit: Reduced‑motion branches; aria-live string builder
  - E2E: Axe smoke on demo (non-blocking initially)

- FT-315/316/317 Demo integration
  - Unit: Config persistence; toggle wiring
  - E2E: Playwright smoke for band rendering and controls

- FT-230/231/232 LM track (later)
  - Contract: Mock `LMAdapter` streaming; merge policy respects caret
  - Perf/Memory: Harness thresholds logged in CI (non-blocking initially)

### CI Gate Order

1. Typecheck → 2) Lint → 3) Format:check → 4) Unit+Integration tests (coverage) → 5) Coverage guard → 6) E2E/A11y smoke (non-blocking; report only)

Keep this file short and link to detailed specs in `docs/implementation.md` and `docs/PRD.md`.
