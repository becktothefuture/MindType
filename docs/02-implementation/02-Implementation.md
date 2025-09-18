<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  I M P L E M E N T A T I O N   G U I D E  ░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Implementation roadmap for Mind⠶Flow revolutionary features
    • WHY  ▸ Enable 7 scenarios + Correction Marker with precise execution
    • HOW  ▸ Phase-based development with scenario-driven milestones
-->

# Mind⠶Flow v0.6 Implementation Plan

## Executive Summary

This plan delivers the v0.6 architecture: LM‑only transformers (Noise/Context/Tone), a single configurable Active Region (default 20 words), the Correction Wave trailing the caret, external native undo, and a rollback hotkey (Cmd+Alt+Z) to revert the last full wave across stages. Demos are unified into a single, performant testing grounds in `playground/`. macOS MVP mirrors behavior via FFI/AX.

## Phases & Tasks (ordered)

### Phase 0 — Groundwork (Docs + Traceability)

- P0.1 Finalize v0.6 docs and traceability
  - Tasks
    - P0.1.1 Update PRD: LM‑only, tone default None, Correction Wave, single Active Region
      - Deliverables: Edited `docs/01-prd/01-PRD.md`
      - Tests: Links resolve; SPEC blocks consistent; doc:check passes
      - Estimate: 1.5h
    - P0.1.2 Update Principles: remove rules‑only fallback; undo external
      - Deliverables: Edited `docs/03-system-principles/03-System-Principles.md`
      - Tests: Caret safety wording consistent; no rules fallback mentions
      - Estimate: 1h
    - P0.1.3 Update Architecture pages/diagram per v0.6
      - Deliverables: Edited `docs/04-architecture/*`
      - Tests: Diagrams reference LM‑only pipeline and single Active Region
      - Estimate: 1.5h
    - P0.1.4 Update Guides: `active-region-policy.md` (single region), `lm.md`, `config-flags.md`
      - Deliverables: Edited guides
      - Tests: Cross-links valid; policies match PRD
      - Estimate: 1.5h
    - P0.1.5 Remove obsolete docs (`add-a-grammar-rule.md`, `denoise-api.md`)
      - Deliverables: Files removed; indices updated
      - Tests: No broken links; doc:check green
      - Estimate: 0.5h
    - P0.1.6 Update traceability; run doc:check/doc:sync
      - Deliverables: Updated `docs/traceability.json` and headers
      - Tests: `pnpm doc:check` and `pnpm doc:sync` succeed
      - Estimate: 0.5h

### Phase 1 — Repository Audit and Removals

- P1.1 Audit codebase vs v0.6
  - Tasks
    - P1.1.1 Inventory rules‑based engines (e.g., `engines/noiseTransformer.ts`) and pattern maps
      - Deliverables: List of files to delete
      - Tests: List covers all rule paths
      - Estimate: 1h
    - P1.1.2 Inventory undo/groupUndo/injector integrations to remove/adjust
      - Deliverables: List of files to delete/update (`core/undoIsolation.ts`, UI hooks)
      - Tests: No stray references expected post‑removal
      - Estimate: 1h
    - P1.1.3 Inventory demo rename tasks and cross‑repo links (`web-demo` → `playground`)
      - Deliverables: Rename plan
      - Tests: All imports/paths accounted
      - Estimate: 1h
    - P1.1.4 Produce mapping table file → action (delete/keep/rewrite)
      - Deliverables: Markdown/CSV mapping committed
      - Tests: Peer review
      - Estimate: 1h
- P1.2 Delete rules‑based/legacy paths
  - Tasks
    - P1.2.1 Remove `engines/noiseTransformer.ts` and rule maps; purge imports
      - Deliverables: File deletions; updated imports
      - Tests: Typecheck
      - Estimate: 1h
    - P1.2.2 Remove `core/undoIsolation.ts` and UI groupUndo wiring
      - Deliverables: File deletions; event cleanup
      - Tests: Typecheck
      - Estimate: 1h
    - P1.2.3 Remove `core/api/denoise.ts` and related docs
      - Deliverables: File deletion; docs already removed in P0.1.5
      - Tests: Typecheck
      - Estimate: 0.5h
    - P1.2.4 Rename `web-demo` → `playground`; update imports/routes/paths
      - Deliverables: Renamed dir; fixed references
      - Tests: App boots
      - Estimate: 1.5h
    - P1.2.5 Fix residual imports; build
      - Deliverables: Passing build
      - Tests: `pnpm -s test` and build pass
      - Estimate: 1h

### Phase 2 — Core Rewrite (LM‑only + Active Region)

- P2.1 Active Region Policy (single, configurable)
  - Tasks
    - P2.1.1 Implement words‑config (default 20) with clamps and persistence API
      - Deliverables: Updated `core/activeRegionPolicy.ts`
      - Tests: Unit tests for size and clamps
      - Estimate: 2h
    - P2.1.2 Unicode grapheme safety; caret‑safety enforcement
      - Deliverables: Grapheme utilities; guards
      - Tests: Emoji/ZWJ cases; no split; caret guards
      - Estimate: 2h
    - P2.1.3 Burst growth logic based on typing cadence
      - Deliverables: Policy grows modestly on bursts; never crosses caret
      - Tests: Simulated bursts; clamps honored
      - Estimate: 2h
- P2.2 LMAdapter + LM‑only Transformers
  - Tasks
    - P2.2.1 Implement LMAdapter init/stream with device‑tier and token caps
      - Deliverables: `core/lm/adapter.ts` + runner
      - Tests: Mock stream unit tests
      - Estimate: 3h
    - P2.2.2 Noise Transformer via LM within Active Region span selection
      - Deliverables: `engines/noiseTransformer.ts` (LM‑only rewrite)
      - Tests: Applies only pre‑caret; returns null when unsure
      - Estimate: 3h
    - P2.2.3 Context Transformer via LM (sentence‑aware, active region bound)
      - Deliverables: `engines/contextTransformer.ts` rewrite
      - Tests: Sentence‑level coherence; caret safety
      - Estimate: 3h
    - P2.2.4 Tone Transformer with default None and gating
      - Deliverables: `engines/toneTransformer.ts` rewrite
      - Tests: Only applies when explicitly set; gated by τ_tone
      - Estimate: 2h
    - P2.2.5 Correction Wave scheduler applying passes behind caret
      - Deliverables: Updated `core/diffusionController.ts`
      - Tests: Integration typing burst→pause→wave
      - Estimate: 3h
    - P2.2.6 Integration tests for pipeline
      - Deliverables: Vitest specs
      - Tests: Green tests
      - Estimate: 2h
- P2.3 Failure policy (developer‑facing)
  - Tasks
    - P2.3.1 Error boundary: surface LM init error in dev UI; disable corrections
      - Deliverables: UI error component/hook
      - Tests: Simulated failure path
      - Estimate: 1h
    - P2.3.2 Restart path/hook
      - Deliverables: Restart button; safe re‑init
      - Tests: Restart resumes normal ops
      - Estimate: 1h

### Phase 3 — Playground Testing Grounds (Web)

- P3.1 Unify demo (playground)
  - Tasks
    - P3.1.1 Create single route and shell (textarea + overlay + workbench)
      - Deliverables: `playground` app shell
      - Tests: App boots
      - Estimate: 1h
    - P3.1.2 Remove legacy pages and update links/headers
      - Deliverables: Cleaned routes; updated docs links
      - Tests: No 404s
      - Estimate: 1h
- P3.2 Controls for behavior
  - Tasks
    - P3.2.1 Slider: Active Region words (min/max)
      - Deliverables: UI + state + persistence
      - Tests: Value affects policy
      - Estimate: 1h
    - P3.2.2 Sliders: τ_input, τ_commit, τ_tone
      - Deliverables: UI + state + persistence
      - Tests: Gating behavior changes
      - Estimate: 1h
    - P3.2.3 Sliders: tick (typing cadence), pause thresholds
      - Deliverables: UI + state + persistence
      - Tests: Scheduler behavior changes
      - Estimate: 1h
    - P3.2.4 Toggles: enable/disable stages; Select: Tone (None/Casual/Professional)
      - Deliverables: UI + state + persistence
      - Tests: Stage routing honors toggles
      - Estimate: 1h
    - P3.2.5 Persist settings (localStorage)
      - Deliverables: Persistence module
      - Tests: Reload keeps settings
      - Estimate: 0.5h
    - P3.2.6 Reduced‑motion compliance
      - Deliverables: Media query handling
      - Tests: Snapshots with reduced motion
      - Estimate: 0.5h
    - P3.2.7 E2E: controls affect behavior
      - Deliverables: Playwright specs
      - Tests: Green runs
      - Estimate: 1h
- P3.3 Correction Marker + dot‑matrix wave + live region
  - Tasks
    - P3.3.1 Correction Marker renderer
      - Deliverables: Marker component
      - Tests: Visual snapshot
      - Estimate: 1h
    - P3.3.2 Dot‑matrix wave animation w/ braille markers
      - Deliverables: Animation module
      - Tests: Reduced‑motion turns off
      - Estimate: 1.5h
    - P3.3.3 Live region batch announcement (polite)
      - Deliverables: SR announcer
      - Tests: Single announcement per wave
      - Estimate: 1h

### Phase 4 — Rollback Undo (Cmd+Alt+Z)

- P4.1 Web rollback of last wave (Noise→Context→Tone)
  - Tasks
    - P4.1.1 Track wave history across stages (bundle of diffs)
      - Deliverables: Wave history store
      - Tests: Unit tests for grouping & revert
      - Estimate: 2h
    - P4.1.2 Bind Cmd+Alt+Z to rollback last wave only
      - Deliverables: Hotkey handler
      - Tests: E2E verifies exact wave revert
      - Estimate: 1h
    - P4.1.3 Preserve native Cmd+Z for typing undo
      - Deliverables: Event handling order
      - Tests: E2E verifies native behavior unaffected
      - Estimate: 1h

### Phase 5 — macOS MVP

- P5.1 Menu‑bar app with LM‑only pipeline
  - Tasks
    - P5.1.1 Status item; enable/disable; developer error display for LM failure
      - Deliverables: Status bar app skeleton
      - Tests: Manual: menu present; errors show
      - Estimate: 2h
    - P5.1.2 Accessibility capture (text/caret); secure fields/IME guards
      - Deliverables: AX watcher + guards
      - Tests: Secure/IME disables pipeline
      - Estimate: 4h
    - P5.1.3 FFI to Rust core LM‑only pipeline
      - Deliverables: FFI bridge calls
      - Tests: Stub stream; then LM
      - Estimate: 4h
    - P5.1.4 Apply diffs caret‑safe; minimal overlay
      - Deliverables: Injector respecting caret safety
      - Tests: Caret position preserved
      - Estimate: 3h
    - P5.1.5 Rollback hotkey Cmd+Alt+Z
      - Deliverables: Global hotkey handler
      - Tests: Reverts last wave across stages
      - Estimate: 2h
    - P5.1.6 Preferences: AR words, tone (None default), thresholds
      - Deliverables: Minimal prefs UI
      - Tests: Settings persist
      - Estimate: 2h
    - P5.1.7 Manual tests with VoiceOver
      - Deliverables: Test notes
      - Tests: Accessibility flows OK
      - Estimate: 1h

### Phase 6 — QA, Coverage, ADR

- P6.1 Tests and coverage
  - Tasks
    - P6.1.1 Unit tests: ActiveRegionPolicy boundaries & grapheme
      - Deliverables: Vitest suite
      - Tests: Pass
      - Estimate: 1.5h
    - P6.1.2 Unit tests: diff guard/caret safety
      - Deliverables: Vitest suite
      - Tests: Pass
      - Estimate: 1h
    - P6.1.3 Integration tests: pipeline (typing→pause→wave)
      - Deliverables: Vitest integration
      - Tests: Pass
      - Estimate: 2h
    - P6.1.4 Playwright scenarios (controls, reduced‑motion, rollback)
      - Deliverables: E2E suite
      - Tests: Green runs
      - Estimate: 3h
    - P6.1.5 Coverage/CI configuration
      - Deliverables: CI workflow updates
      - Tests: Coverage ≥ 85%; CI green
      - Estimate: 1.5h
- P6.2 ADR‑0006 + traceability
  - Tasks
    - P6.2.1 Author ADR‑0006 (LM‑only, undo external, rollback hotkey)
      - Deliverables: `docs/05-adr/0006-lm-only-rollback.md`
      - Tests: Links valid
      - Estimate: 1h
    - P6.2.2 Update `docs/traceability.json` mappings
      - Deliverables: Updated map
      - Tests: doc:check pass
      - Estimate: 1h

## Success Criteria (MVP)

- Web playground demonstrates live correction with configurable Active Region, LM‑only wave, reduced‑motion, and rollback hotkey.
- macOS menu‑bar app demonstrates same pipeline with AX and rollback.
- No residual rule‑based code; LM failure halts with developer‑facing error and restart.
- Docs and ADRs synced; tests green; coverage target met.

### 1.1 Correction Marker System
**Priority**: Critical  
**Scenarios Enabled**: All  
**Tasks**: IMPL-01  

#### Core Components
```typescript
// ui/correctionMarker.ts
interface CorrectionMarker {
  mode: 'listening' | 'correcting' | 'idle';
  position: number;
  targetPosition: number;
  animationState: BrailleSymbol;
  processingIntensity: 'light' | 'medium' | 'heavy';
}

// Braille symbol animation sequences
const LISTENING_SEQUENCE = ['⠂', '⠄', '⠆', '⠠', '⠢', '⠤', '⠦', '⠰', '⠲', '⠴', '⠶'];
const CORRECTING_PATTERNS = {
  noise: ['⠁', '⠂', '⠄', '⠈'],
  context: ['⠃', '⠆', '⠌'],
  tone: ['⠷', '⠿', '⠷']
};
```

#### Implementation Tasks
1. **Visual System**: Braille symbol renderer with CSS animations
2. **Positioning Engine**: Character-precise marker placement
3. **Animation Controller**: Mode transitions and speed adaptation
4. **Accessibility Layer**: Screen reader integration, reduced-motion support

### 1.2 Burst-Pause-Correct Engine
**Priority**: Critical  
**Scenarios Enabled**: Marcus (Speed), James (Creative), Priya (Data)  
**Tasks**: IMPL-02  

#### Core Components
```typescript
// core/burstDetector.ts
interface BurstState {
  isActive: boolean;
  startTime: number;
  keystrokes: number;
  averageInterval: number;
}

// core/pauseScheduler.ts
interface PauseEvent {
  duration: number;
  triggerCorrection: boolean;
  markerAction: 'hold' | 'advance';
}
```

#### Implementation Tasks
1. **Burst Detection**: Identify rapid typing patterns (>60 WPM sustained)
2. **Pause Recognition**: 500ms threshold with device-tier adjustment
3. **Marker Coordination**: Hold position during bursts, advance on pause
4. **Muscle Memory Training**: Consistent timing for habit formation

## Quality Gates and Testing

### Performance Requirements
- **Latency**: p95 ≤ 15ms (WebGPU), ≤ 30ms (WASM/CPU)
- **Memory**: ≤150MB typical, ≤200MB maximum
- **Accuracy**: ≥95% semantic accuracy across all scenarios
- **Throughput**: Support 180+ WPM in Velocity Mode

### Core Success Metrics
- Correction latency targets met by device tier
- Coverage ≥ 85%; CI green
- Playwright core scenarios pass (typing → pause → wave; rollback)

## Phase Gates & Observability

- Phase 0 Gate — Docs Integrity
  - Checks: `pnpm doc:check`, `pnpm doc:sync` green; all links resolve; traceability updated
  - Observability: Link validator output archived in CI artifacts
- Phase 1 Gate — Clean Tree Build
  - Checks: Typecheck/build green; no references to deleted symbols; demo rename boots
  - Observability: Build logs, unused import scanner output
- Phase 2 Gate — Core Pipeline Integrity
  - Checks: Unit tests (ActiveRegion, grapheme, caret safety) green; integration typing→pause→wave
  - Observability: Structured logs for scheduler ticks, wave apply, stage outcomes
- Phase 3 Gate — Playground UX & A11y
  - Checks: Playwright E2E (controls affect behavior, reduced‑motion, SR batch)
  - Observability: A11y snapshot diffs, FPS meter if enabled
- Phase 4 Gate — Rollback Reliability
  - Checks: E2E verifies Cmd+Alt+Z reverts exactly last wave; Cmd+Z unaffected
  - Observability: Wave history events logged (apply/revert)
- Phase 5 Gate — macOS MVP Flows
  - Checks: Manual VoiceOver pass; caret safety; rollback; secure/IME guards
  - Observability: Console logs and AX event traces (dev builds)
- Phase 6 Gate — CI & Coverage
  - Checks: Coverage ≥ 85%; CI green across unit/integration/E2E
  - Observability: Coverage HTML, junit reports saved

---

*Implementation success is measured not by technical complexity, but by user transformation: turning typing from a mechanical skill into fluid expression of thought.*

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
