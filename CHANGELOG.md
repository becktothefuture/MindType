<!--
╔══════════════════════════════════════════════════════╗
║  ░  C H A N G E L O G  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Release history for MindTyper
  • WHY  ▸ Transparent, skeptic‑friendly record of changes
  • HOW  ▸ Keep a Changelog format; date‑stamped entries
-->

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning (pre‑1.0). Dates are in YYYY‑MM‑DD.

## [0.0.1-alpha] - 2025-08-08

### Added

- MindTyper Manifesto (`docs/mindtyper_manifesto.md`) — product narrative for non‑technical readers with measurable guarantees.
- `.prettierignore` to exclude generated artifacts, subpackages, and lockfiles.

### Changed

- Prettier config aligned with workspace gates (`.prettierrc`).
- ESLint flat config polish and consistent single quotes (`eslint.config.js`).
- `docs/implementation.md` updated with TODOs covering WASM bindings, LLM adapter, engine rules, A11Y, benches, and traceability.

### Removed

- Deprecated `docs/core_details.md` (TypeScript core) to reflect Rust‑first architecture.

### CI / Quality Gates

- Verified green on typecheck, lint, format:check, and unit tests.

### Docs

- `README.md` links to the Manifesto under "Recommended reading".

[0.0.1-alpha]: https://github.com/becktothefuture/mindtyper-qna/releases/tag/v0.0.1-alpha

## [0.0.1-alpha+1] - 2025-08-09

### Added

- FT-212: Punctuation normalization in `engines/tidySweep.ts` (spaces around commas/periods, em dash spacing).
- FT-214: Whitespace normalization (collapse multi-spaces/tabs; trim trailing whitespace before newline).
- FT-216: Capitalization rules (sentence-start capitalization; standalone 'i' → 'I').
- Web demo: active region alignment and newline safety improvements; `SecurityContext` gating hooks.

### Tests

- Expanded unit tests across tidySweep rules, diffusion controller, and sweep scheduler; integration harness proves end-to-end flow.
- Added branch-edge tests to lift global branch coverage ≥90%; utils guard at 100% branches.

### CI / Quality Gates

- All gates green: typecheck, lint, format, tests with coverage.
