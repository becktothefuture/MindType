<!--
╔═══════════════════════════════════════════════════════════════════╗
║  ░  M I N D T Y P E R  ░  C Y B E R - P U N K   T Y P I N G  ░░░  ║
║                                                                   ║
║   Mental helper and project guide for navigating the codebase.    ║
║   Communicates with `.cursor/rules/workflow.mdc` and docs/*.md.   ║
║                                                                   ║
║           ╌╌  P L A C E H O L D E R  ╌╌                           ║
║                                                                   ║
║                                                                   ║
║                                                                   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  • WHAT ▸ High-signal README: structure, files, flows, commands
  • WHY  ▸ Faster onboarding and assisted coding in Cursor
  • HOW  ▸ Explains every folder/file; links to tasks and rules
-->

![build](https://img.shields.io/badge/build-pending-blue)
![license](https://img.shields.io/badge/license-MIT-green)
![version](https://img.shields.io/badge/version-0.0.1-alpha-purple)

### TL;DR

- Typing engines propose caret-safe diffs in real time (Tidy Sweep) and during idle (Backfill Consistency).
- A small TypeScript core wires input monitoring and scheduling. A Rust crate powers WASM-ready primitives.
- Quality gates: pnpm typecheck, lint, format:check, test. Tasks live in `docs/implementation.md`.

### Demo • _add GIF here_

### Table of Contents

- Overview
- Quick Start
- Development Workflow & Quality Gates
- Project Structure (tree)
- Directory and File Guide (every source file)
- Cross-Module Data Flow
- Task Board & Docs
- License

## Overview

MindTyper turns noisy keystreams into clean text via small, reversible diffs. Forward passes keep typing tidy; reverse passes backfill consistency using accumulating context. All edits respect the CARET and are designed to be grouped into coherent undo steps.

## Quick Start

1. Install toolchain
   - Node (pnpm), Rust, wasm-pack (for WASM builds), Playwright optional for e2e
2. Install deps: `pnpm install`
3. Run unit tests: `pnpm test`
4. Run quality gates: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`
5. Explore tasks: open `docs/implementation.md`

## Development Workflow & Quality Gates

- Follow `.cursor/rules/workflow.mdc` when planning and executing tasks.
- Scripts
  - `pnpm typecheck`: strict TS compile (no emit)
  - `pnpm lint`: ESLint (flat config) for TS
  - `pnpm format`: Prettier write
  - `pnpm format:check`: Prettier check
  - `pnpm test`: Vitest unit tests (scoped to `tests/**`)
- Optional: `just test-all` for broader matrix including Rust/e2e, if you use `just`.

## Project Structure

```text
MindTyper/
  config/                    # Shared thresholds & parameters
  core/                      # TS core: input monitor + sweep scheduler
  crates/core-rs/            # Rust core crate (WASM-friendly)
  docs/                      # Design docs and questionnaires
  e2e/                       # Playwright end-to-end scaffolding
  engines/                   # Typing engines (forward/backfill)
  tests/                     # Unit tests (Vitest)
  ui/                        # UI helpers (highlighting, undo grouping)
  utils/                     # Pure helpers (diff, caret safety)
  web-demo/                  # React/Vite demo app
  eslint.config.js           # ESLint v9 flat config (TS + Prettier)
  vitest.config.ts           # Unit test scope
  tsconfig.json              # TypeScript config (ES2024, Node types)
  package.json               # Scripts and dev dependencies
  Justfile                   # Build/test recipes (Rust/Web/E2E)
  specs.md                   # Product/tech specs (high-level)
  README.md                  # This file
```

## Directory and File Guide

### config/

- `config/defaultThresholds.ts`: Central parameters used by engines and UI
  - `SHORT_PAUSE_MS`, `LONG_PAUSE_MS`, `MAX_SWEEP_WINDOW`

### core/

- `core/typingMonitor.ts`: Emits timestamped typing events; decouples input capture from processing.
- `core/sweepScheduler.ts`: Debounces typing activity; triggers `tidySweep` and `backfillConsistency` after short pauses.

### engines/

- `engines/tidySweep.ts`: Forward pass that proposes minimal diffs behind the CARET within an `MAX_SWEEP_WINDOW` window.
- `engines/backfillConsistency.ts`: Reverse pass that proposes consistency diffs in the stable zone when idle.

### ui/

- `ui/highlighter.ts`: Visualizes recent changes near the CARET; honours reduced-motion.
- `ui/groupUndo.ts`: Batches engine diffs so each sweep collapses into a single undo step.

### utils/

- `utils/diff.ts`: Pure helper `replaceRange` that enforces “never cross CARET” when applying text changes.

### tests/

- `tests/tidySweep.spec.ts`: Verifies tidy sweep returns no crossing-caret edits (stubbed now).
- `tests/backfill.spec.ts`: Ensures reverse pass outputs array of diffs (shape guard for stable zone logic).
- `tests/diff.spec.ts`: Validates `replaceRange` correctness and caret guardrails.

### docs/

- Core guides:
  - `docs/architecture_overview.md`: Topology and major components.
  - `docs/code_overview_simple.md`: Intro to code layout.
  - `docs/core_details.md`, `docs/core_rust_details.md`: Deeper core/Rust insights.
  - `docs/developer_tasks.md`: Task conventions.
  - `docs/implementation.md`: Live task board (used by workflow).
  - `docs/mac_app_details.md`: macOS app build notes.
  - `docs/project_structure.md`: High-level structure summary.
  - `docs/web_demo_details.md`, `docs/web_demo_server.md`: Web demo explainer.
- Questionnaire (product/UX/tech/security): `docs/questionnaire/*.md`

### crates/core-rs/ (Rust)

- `src/lib.rs`: WASM bindings and exported types; exposes logger, timer, fragment extractor, merger, and token stream stubs.
- `src/fragment.rs`: Extracts the last complete sentence fragment using Unicode segmentation.
- `src/merge.rs`: Simple token-appending merger (placeholder for diff-based merge).
- `src/pause_timer.rs`: Idle detection utility; used to decide when to schedule sweeps.
- `src/logger.rs`: In-memory logger; serializable to JS via WASM.
- `src/llm.rs`: Token stream trait + stub tokenizer; placeholders for OpenAI/CoreML streams.
- Cargo files: crate metadata/lock; `target/` contains build artifacts.

### web-demo/

- `web-demo/` is a Vite + React demo shell. Key files:
  - `src/App.tsx`, `src/App.test.tsx`: Example UI and test stub.
  - `src/components/DebugPanel.tsx`, `LogsTab.tsx`, `SettingsTab.tsx`: Debug UI panels.
  - `src/main.tsx`: App bootstrap; Vite entry.
  - `vite.config.ts`, `vitest.config.ts`: Build/test configs for the demo.
  - `tsconfig.*.json`: TS configs for app/node.
  - Note: demo is isolated from core unit tests; see root `vitest.config.ts`.

### e2e/

- `playwright.config.ts`: E2E runner config.
- `tests/*.spec.ts`: Example tests (demo placeholders).
- `package.json`: Separate package marker for E2E scope.

### .cursor/rules/

- `workflow.mdc`: Cursor execution rules (PLAN_ONLY/EXECUTE/LIB_TOUCH, gates, commit style).
- `generate.mdc`: Structure/naming/documentation conventions for generated code.
- `glossary.mdc`: Quick terms referencing `context/glossary.md`.
- `comment_style.mdc`: Boxed comment style (WHAT/WHY/HOW) used across the repo.

### Root files

- `eslint.config.js`: ESLint v9 flat config for TypeScript with Prettier harmony.
- `vitest.config.ts`: Unit test scope limited to `tests/**`; excludes e2e and web-demo.
- `tsconfig.json`: ES2024 target, Node types, excludes `e2e/**` and `web-demo/**` for core typecheck.
- `package.json`: Scripts (typecheck, lint, format, test) and dev deps.
- `Justfile`: Recipes for bootstrap, web build (WASM + Vite), mac build (Rust/Xcode), and test-all.
- `specs.md`: Product and technical specification notes.
- `Cargo.toml`, `Cargo.lock`: Rust workspace metadata.
- `pnpm-lock.yaml`: Node dependency lockfile.

## Cross-Module Data Flow (high level)

- Host editor → `core/typingMonitor` (keystrokes, caret, timestamps)
- `core/sweepScheduler` → triggers `engines/tidySweep` (short pause) and `engines/backfillConsistency` (idle)
- Engines propose diffs → `ui/groupUndo` batches → host applies → `ui/highlighter` shows feedback
- Rust crate primitives (WASM) may augment extraction/merging/logging when integrated into the demo or apps

## Task Board & Docs

- Tasks: `docs/implementation.md` (first unchecked drives work in Cursor)
- System rules: `.cursor/rules/workflow.mdc`
- Glossary: `.cursor/rules/glossary.mdc` and `context/glossary.md`

## License

MIT — see the badge above.
