<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  IMPLEMENTATION PLAN (AUTO)  ░░░░░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Auto-inserted live plan header per house rules
    • WHY  ▸ Keep plan visible, structured, and traceable
    • HOW  ▸ Updated by agent in PLAN_ONLY/EXECUTE modes
-->

# Implementation Plan (live)

> Plan (auto) — 2025-08-08
>
> - [ ] (P1) [FT-100] Tooling gates — `package.json`, CI, lint/format/test
>   - AC: pnpm typecheck|test|lint|format:check green locally and in CI
>   - Owner: @alex
>   - DependsOn: None
>   - Source: PRD Quality Gates; Testing & QA (Section 11)
> - [ ] (P1) [FT-101] Caret-safe diff — `utils/diff.ts` + `tests/diff.spec.ts`
>   - AC: never crosses caret; minimal ops; 100% branch coverage for utils
>   - Owner: @alex
>   - DependsOn: FT-100
>   - Source: PRD REQ-IME-CARETSAFE; C3 Diff; ADR-0002
> - [ ] (P1) [FT-200] Forward tidy sweep — `engines/tidySweep.ts`
>   - AC: forward window ≤ 80 chars behind caret; minimal diffs or null; doc latency notes
>   - Owner: @alex
>   - DependsOn: FT-101
>   - Source: PRD REQ-TIDY-SWEEP; C3 SweepScheduler/TidySweep
> - [ ] (P1) [FT-300] Two-word highlight — `ui/highlighter.ts`
>   - AC: highlights two words behind caret on short pause; respects prefers-reduced-motion; tests where feasible
>   - Owner: @alex
>   - DependsOn: FT-100
>   - Source: PRD REQ-A11Y-MOTION; Design System § Motion; BDD features

> **How Cursor uses this file**
>
> - Picks the **first unchecked** task from the highest active Stage.
> - **PLAN_ONLY** may append tasks using the Task Schema; **EXECUTE** fulfils them.
> - Keep tasks atomic; prefer many small boxes over one vague one.

## Stage 1 — Foundation & Setup

- [ ] (P1) [FT-100] Tooling: ESLint + Prettier harmony + Vitest scripts  
       **AC:** `pnpm typecheck|test|lint|format:check` run locally; CI passes on PR.  
       **Owner:** @alex • **Source:** PRD → Quality Gates
- [ ] (P1) [FT-101] Utils: `utils/diff.ts` + `tests/diff.spec.ts`  
       **AC:** replaceRange works; never crosses caret; 100% branch coverage for utils.
- [ ] (P1) [FT-102] Core: `core/typingMonitor.ts` observable API  
       **AC:** emits events with timestamps; unit tests assert event shapes.

## Stage 2 — Core Engines

- [ ] (P1) [FT-200] `engines/tidySweep.ts` (≤ **80 chars** window; caret-safe)  
       **AC:** fixes common transpositions; never crosses caret; latency notes in docstring.
- [ ] (P2) [FT-201] `engines/backfillConsistency.ts` (stable-zone passes)  
       **AC:** proposes diffs only in stable zone; groups by sweep id.

## Stage 3 — UI & Feedback

- [ ] (P1) [FT-300] `ui/highlighter.ts` (2-word-behind highlight)  
       **AC:** fade ≤ **250 ms**; respects `prefers-reduced-motion`.
- [ ] (P2) [FT-301] `ui/groupUndo.ts` (batch AI diffs)  
       **AC:** single undo step per sweep; tests cover grouping edges.

## Stage 4 — Optimisation & Polish

- [ ] (P2) [FT-400] Latency profiling + thresholds in `config/defaultThresholds.ts`  
       **AC:** p95 echo < **10 ms** documented; params configurable per env.

> **Backlog (append here via PLAN_ONLY)**
>
> - [ ] (P3) [FT-999] Web demo shell scaffold (React/Vite + WASM hook)
