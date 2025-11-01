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
![version](https://img.shields.io/badge/version-0.6.0-purple)

### TL;DR

- Typing engines propose caret-safe diffs in real time via three-stage pipeline (Noise → Context → Tone). An active region (~20 words, 2–3 sentences) trails the caret and "draws in" corrections during natural pauses.
- A small TypeScript core wires input monitoring and scheduling. A Rust crate powers WASM-ready primitives. Local LM target: Transformers.js + Qwen2.5‑0.5B‑Instruct (q4, WebGPU/WASM/CPU) with deterministic-first fallback.
- Quality gates: pnpm typecheck, lint, format:check, test. Tasks live in `docs/02-implementation/02-Implementation.md`.

### Demo • _add GIF here_

### Table of Contents

- Overview
- Quick Start
- Development Workflow & Quality Gates
- Project Structure (tree)
- Directory and File Guide (every source file)
- Deep Directory Guide (purpose, responsibilities, when to change, contracts)
- Contracts (what this means)
- Cross-Module Data Flow
- Task Board & Docs
- What's New
- License

### Recommended reading

- Product narrative: see `docs/mindtyper_manifesto.md` for the vision and feel.
- Brand pitch: see `docs/brand/messaging.md` (Mind::Type v0.4 Vision Pitch).
- Changelog: see `CHANGELOG.md` for release history.
- **What's New**: see [`docs/06-guides/whats-new-v0.4.md`](docs/06-guides/whats-new-v0.4.md) for v0.4 highlights.

## Overview

Mind::Type turns noisy keystreams into clean text via small, reversible diffs. Forward passes keep typing tidy; reverse passes backfill consistency using accumulating context. All edits respect the CARET and are designed to be grouped into coherent undo steps.

### Beginner primer: key terms

- **Rust crate**: A Rust library/package. Our core logic is in `crates/core-rs`.
- **TypeScript (TS) core**: Lightweight glue in `core/`, `engines/`, and `utils/` that orchestrates typing events and rules.
- **Tests**: Small programs that verify behavior. TS tests live in `tests/**`; Rust tests live next to Rust files.
- **WASM (WebAssembly)**: Lets Rust run in the browser. We compile Rust to a `.wasm` file and import it from TS.
- **wasm-bindgen**: Rust tooling that makes Rust functions callable from JS/TS.
- **Local dependency**: The web demo imports the locally built WASM package from a folder on disk (no publishing needed).
- **Fragment extractor**: Finds the last finished sentence near the end of your text so we only correct complete thoughts.
- **Merger**: Combines incoming tokens into text. Today it appends words; later it will apply precise diffs.
- **Stub token stream**: A fake “stream of words” used to test our pipeline without a real network.
- **In-memory logger**: Collects logs in Rust and exposes them to the web demo.

## Quick Start

1. Install toolchain
   - Node (pnpm), Rust, wasm-pack (for WASM builds), Playwright optional for e2e
2. Install deps: `pnpm install`
3. Run unit tests: `pnpm test`
4. Run quality gates: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`
5. Explore tasks: open `docs/02-implementation/02-Implementation.md`

### Web demo: build and run

1. Install tools (once): Rust toolchain, `wasm-pack`, Node, pnpm
2. From repo root, build the WASM package and the demo:
   - With `just`: `just build-web`
   - Or manually:
     - `wasm-pack build crates/core-rs --target web --out-dir bindings/wasm/pkg`
     - `pnpm --prefix web-demo install`
3. Run: `pnpm --prefix web-demo dev` → open the printed URL
4. Type a sentence and watch the active region trail behind your cursor; pause to see diffusion catch up.

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
MindType/
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
- `core/sweepScheduler.ts`: Orchestrates streamed diffusion via typing ticks and pause catch-up; integrates with `DiffusionController`.
- `core/diffusionController.ts`: Advances a validation frontier word-by-word behind the caret; renders the active region; catches up on pause.

### engines/

- `engines/noiseTransformer.ts`: Stage 1 - Deterministic typo/spacing fixes (sync) + LM corrections (async) within Active Region.
- `engines/contextTransformer_v06.ts`: Stage 2 - LM-powered grammar and coherence improvements, confidence-gated.
- `engines/toneTransformer_v06.ts`: Stage 3 - Optional tone adjustment (None/Casual/Professional), conservative gating.
- `engines/toneTransformer.ts`: Legacy tone helper functions (detectBaseline, planAdjustments) - still used by sweepScheduler legacy path.

### ui/

- `ui/highlighter.ts`: Renders active region and applied fix highlights; honors reduced-motion.
- `ui/correctionMarker_v06.ts`: Visual organism (braille-like symbol) that signals readiness and sweeps through text during corrections.
- `ui/rollbackHandler.ts`: Cmd+Alt+Z handler for atomic wave rollback (groups all diffs from one sweep into single undo).

### utils/

- `utils/diff.ts`: Pure helper `replaceRange` that enforces “never cross CARET” when applying text changes.

### tests/

- `tests/noiseTransformer.spec.ts`: Verifies noise transformer returns no crossing-caret edits.
- `tests/contextTransformer*.spec.ts`: Tests context stage gating and LM integration.
- `tests/diff.spec.ts`: Validates `replaceRange` correctness and caret guardrails.

### docs/

- Core guides:
  - `docs/architecture_overview.md`: Topology and major components.
  - `docs/code_overview_simple.md`: Intro to code layout.
  - `docs/core_rust_details.md`: Deeper Rust core insights.
  - `docs/developer_tasks.md`: Task conventions.
  - `docs/02-implementation/02-Implementation.md`: Live task board (used by workflow).
  - `docs/mac_app_details.md`: macOS app build notes.
  - `docs/14-project-structure/14-project_structure.md`: High-level structure summary.
  - `docs/web_demo_details.md`, `docs/web_demo_server.md`: Web demo explainer.
- Questionnaire (product/UX/tech/security): `docs/questionnaire/*.md`

### crates/core-rs/ (Rust)

- `src/lib.rs`: WASM bindings and exported types; exposes logger, timer, fragment extractor, merger, and token stream stubs.
- `src/fragment.rs`: Extracts the last complete sentence using Unicode segmentation.
- `src/merge.rs`: Simple token-appending merger (placeholder for diff-based merge).
- `src/pause_timer.rs`: Idle detection utility; used to decide when to schedule sweeps.
- `src/logger.rs`: In-memory logger; serializable to JS via WASM.
- `src/llm.rs`: Token stream trait + stub tokenizer; placeholders for OpenAI/CoreML streams.
- Cargo files: crate metadata/lock; `target/` contains build artifacts.

### playground/

- `playground/` is a Vite + React demo shell. Key files:
  - `src/App.tsx`, `src/App_v06.tsx`: Demo UI components.
  - `src/worker/lmWorker.ts`: LM worker integration with Transformers.js.
  - `vite.config.ts`, `vitest.config.ts`: Build/test configs.
  - Note: Demo is deprecated in favor of macOS app; see `demo/README.md`.

### web-lab-v0.6/

- `web-lab-v0.6/`: Standalone testing app with comprehensive pipeline logging and visualization.
  - `src/PipelineLogger.ts`: Captures every pipeline event for debugging.
  - `src/PipelineVisualizer.ts`: Real-time visualization of stage status, Active Region, confidence scores.

### e2e/

- `playwright.config.ts`: E2E runner config.
- `tests/*.spec.ts`: Example tests (demo placeholders).
- `package.json`: Separate package marker for E2E scope.

### .cursor/rules/

- `workflow.mdc`: Cursor execution rules (PLAN_ONLY/EXECUTE/LIB_TOUCH, gates, commit style).
- `generate.mdc`: Structure/naming/documentation conventions for generated code.
- `glossary.mdc`: Quick terms reference.
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
- `core/sweepScheduler` → triggers `engines/noiseTransformer` (short pause) and `engines/backfillConsistency` (idle)
- Engines propose diffs → host applies (grouping optional; active-region/LM evolutions are exempt) → `ui/highlighter` shows feedback
- Rust crate primitives (WASM) may augment extraction/merging/logging when integrated into the demo or apps

## How Rust and TypeScript work together

- We compile the Rust crate to WASM and import it in the web demo as a normal package. The demo calls Rust functions directly.
- Example JS/TS flow:

```ts
const extractor = new WasmFragmentExtractor();
const fragment = extractor.extract_fragment(text);
if (fragment) {
  const fragmentIndex = text.lastIndexOf(fragment);
  const prefix = text.substring(0, fragmentIndex);
  let merger = new WasmMerger(prefix);
  let stream = new WasmStubStream('This is a corrected sentence.');
  let token = await stream.next_token();
  while (token) {
    merger.apply_token(token);
    token = await stream.next_token();
  }
  setText(merger.get_result());
}
```

Corresponding Rust exports (simplified):

```rust
#[wasm_bindgen]
impl WasmFragmentExtractor { /* new(), extract_fragment(&str) -> Option<String> */ }
#[wasm_bindgen]
impl WasmMerger { /* new(&str), apply_token(&str), get_result() -> String */ }
#[wasm_bindgen]
impl WasmStubStream { /* new(&str), async next_token() -> Option<String> */ }
```

Why both languages?

- Rust provides speed and safety for fragmenting, merging, and timing.
- TypeScript/React provides rapid UI development and ecosystem tooling.

Where Swift fits (mac app):

- The macOS app UI will be Swift/SwiftUI calling the same Rust core via FFI (native interface). The Swift project isn’t in this repo yet.

## Task Board & Docs

- Tasks: `docs/02-implementation/02-Implementation.md` (first unchecked drives work in Cursor)
- System rules: `.cursor/rules/workflow.mdc`, `.cursor/rules/comment_style.mdc`, `.cursor/rules/generate.mdc`
- Glossary: `.cursor/rules/glossary.mdc`

## What's New

For the latest features, changes, and improvements in v0.6, see:

📋 **[System Living Guide](docs/00-index/system-living-guide.md)** - Comprehensive reference for how Mind⠶Flow works

Key highlights:

- **PDF-aligned architecture**: Three-stage pipeline (Noise → Context → Tone) with deterministic-first fallback
- **Atomic undo**: Wave history groups all diffs from one sweep into single undo operation
- **Testing infrastructure**: Web lab v0.6 with comprehensive event logging and visualization
- **Documentation**: Living guide, mind maps, and alignment analysis

## License

MIT — see the badge above.

# Mind::Type

- See `docs/06-guides/06-guides/reference/caret-monitor.md` for the Caret Monitor v2 state model and APIs.
