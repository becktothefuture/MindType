<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  S Y S T E M   L I V I N G   G U I D E  ░░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Master reference: how Mind⠶Flow works and why
    • WHY  ▸ Onboarding, code reviews, self-reminder, architecture decisions
    • HOW  ▸ PDF-aligned explanations with technical depth
-->

# Mind⠶Flow System Living Guide (v0.6)

> **Authoritative Source**: This guide aligns with `docs/00-index/pdf-guide-requirements.md` (extracted from the MindFlow Product Experience Guide PDF). All implementation decisions should verify against the PDF requirements.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Pipeline Deep Dive](#pipeline-deep-dive)
4. [Technical Decisions](#technical-decisions)
5. [Component Explanations](#component-explanations)
6. [Terminology Glossary](#terminology-glossary)
7. [Performance Characteristics](#performance-characteristics)
8. [Debugging Guide](#debugging-guide)

---

## Executive Summary

**Mind⠶Flow** is a typing intelligence layer that synchronises corrections with natural typing pauses, applying bounded edits behind the caret during user breathing moments. The system preserves semantic intent without interruptive UI by operating only in the **Active Area** (2–3 sentences behind the caret), using a three-stage pipeline (Noise → Context → Tone), and enforcing caret safety.

**Core Innovation**: The Correction Marker—a visual organism that signals system readiness and sweeps through text during pauses, applying corrections atomically (single undo per sweep).

**Key Principles**:
- **Caret Safety**: Never modify at or after the caret position
- **Confidence Gating**: Low certainty → no-op (non-interference bias)
- **Deterministic-First**: Noise stage always runs; higher stages degrade under load
- **Privacy by Architecture**: On-device by default; secure fields excluded
- **Accessibility First**: Reduced-motion instant swap; one screen reader announcement per batch

---

## System Overview

### High-Level Architecture

```
User Types → TypingMonitor → SweepScheduler → CorrectionWave → Engines → Diffs → UI Application
```

**Data Flow**:
1. **Input**: User keystrokes captured via DOM events → `TypingMonitor.emit()` creates `TypingEvent`
2. **Orchestration**: `SweepScheduler` receives events, manages timers (pause detection, streaming ticks)
3. **Processing**: `CorrectionWave` executes three-stage pipeline (Noise → Context → Tone) within Active Region
4. **Application**: Diffs applied caret-safe; visual feedback via Correction Marker

### Key Modules

| Module | Responsibility | Key Files |
| --- | --- | --- |
| **Entry** | Boot system, expose API | `index.ts` |
| **Monitoring** | Capture typing events | `core/typingMonitor.ts` |
| **Scheduling** | Orchestrate sweeps, pause detection | `core/sweepScheduler.ts` |
| **Diffusion** | Advance frontier, manage Active Region | `core/diffusionController.ts` |
| **Correction Wave** | Execute three-stage pipeline | `core/correctionWave_v06.ts` |
| **Engines** | Noise, Context, Tone transformers | `engines/*.ts` |
| **Active Region** | Compute editable window | `core/activeRegionPolicy.ts` |
| **Confidence** | Quality gates for commits | `core/confidenceGate.ts` |
| **Safety** | Caret-safe validation | `utils/grapheme.ts` |
| **UI** | Visual feedback, undo | `ui/*.ts` |

---

## Pipeline Deep Dive

### Complete Flow: Input → Output

#### 1. Input Phase: Keystroke Capture

**Location**: `core/typingMonitor.ts`

```typescript
interface TypingEvent {
  text: string;      // Full text content
  caret: number;     // UTF-16 caret position
  atMs: number;       // Timestamp
}
```

**Process**:
- DOM input events → extract text and caret position
- `monitor.emit(event)` → notifies all listeners (typically `SweepScheduler`)

**Why**: Decouples input capture from processing, enabling testability and multiple consumers.

#### 2. Monitoring Phase: Event Reception

**Location**: `core/sweepScheduler.ts` → `onEvent()`

**Process**:
- Security guard: If secure field or IME composing → drop event, clear timers
- Update `DiffusionController` state (text, caret)
- Reset pause timer (tier-aware debounce: WebGPU ≈ 600ms, WASM ≈ 660ms, CPU ≈ 780ms)
- Start streaming tick interval (~75ms) for deterministic noise during typing

**Why**: Tier-aware timing prevents UI thrash on slower devices while maintaining responsiveness.

#### 3. Active Region Phase: Computable Window

**Location**: `core/activeRegionPolicy.ts` → `computeRenderRange()`

**Process**:
- Work backwards from caret to find N words (default: 20 words, configurable)
- Apply burst growth: During active bursts (>5 keys, <200ms gaps), expand up to 1.5×
- Align to grapheme boundaries (handles emoji, multi-byte)
- Validate caret-safety: If region would cross caret → return empty range

**Output**: `{ start: number, end: number }` — only this span is editable

**Why**: Localised edits stay predictable; the model still reads broader context for tone/coherence.

#### 4. Streaming Phase: Deterministic Noise (During Typing)

**Location**: `core/diffusionController.ts` → `tickOnce()`

**Process**:
- Extract next word behind frontier
- Call `noiseTransformSync()` for deterministic fixes (typos, spacing, casing)
- Apply diff if caret-safe
- Advance frontier
- Throttle rendering (~16ms minimum) to avoid UI storms

**Why (PDF requirement)**: Deterministic-first ensures immediate cleanup during bursts without waiting for LM.

**Implementation**: `engines/noiseTransformer.ts` → `noiseTransformSync()` uses pattern matching (`teh` → `the`, `recieve` → `receive`, etc.)

#### 5. Pause Detection: Trigger for Context/Tone

**Location**: `core/sweepScheduler.ts` → `runSweeps()`

**Trigger**: User pause ≥ configured debounce (default 600ms, tier-adjusted)

**Process**:
- Catch-up streaming diffusion (process remaining words up to caret)
- Execute `CorrectionWave` with full three-stage pipeline

**Why (PDF requirement)**: ~500–700ms pauses align with natural breathing moments; edits applied here are perceived as continuous.

#### 6. Correction Wave: Three-Stage Pipeline

**Location**: `core/correctionWave_v06.ts` → `runCorrectionWave()`

**Stages**:

##### Stage 1: Noise (Deterministic + LM)
- **Deterministic**: Pattern matching (handled in streaming tick above)
- **LM**: Stream LM correction for Active Region span
- **Output**: Single diff covering whole span (if meaningful change)

##### Stage 2: Context (LM-only, Confidence-Gated)
- **Input**: Text after Noise stage
- **Process**: Build context-aware prompt (±2 sentences), stream LM correction
- **Gating**: Compute input fidelity → dynamic thresholds → confidence score → `applyThresholds()`
- **Output**: Array of proposals (grammar, agreement, micro-reorder)

##### Stage 3: Tone (Optional, Conservative)
- **Input**: Text after Context stage
- **Process**: Stream LM tone adjustment (if `toneTarget !== 'None'`)
- **Gating**: Must pass both `τ_commit` and `τ_tone` thresholds
- **Output**: Array of proposals (lexical smoothing, register adjustment)

**Sequential Application**: Each stage applies diffs to working text before next stage runs.

**Why**: Separation of concerns enables independent gating and graceful degradation (skip Context/Tone under latency pressure).

#### 7. Confidence Gating

**Location**: `core/confidenceGate.ts`

**Inputs**:
- `inputFidelity`: Ratio of valid characters (letters/digits) to total
- `transformationQuality`: Heuristic quality of proposed change
- `contextCoherence`: Semantic fit (often inferred)
- `temporalDecay`: Time-based decay (currently 1.0 = no decay)

**Thresholds** (configurable):
- `τ_input`: Minimum input fidelity to attempt Context stage (default: 0.55)
- `τ_commit`: Minimum combined score to apply proposal (default: 0.80)
- `τ_tone`: Tone proposals must also meet this (default: 0.75)
- `τ_discard`: Below this, proposals are dropped (default: 0.30)

**Decision**: `hold` | `commit` | `discard`

**Why (PDF requirement)**: Low confidence → no-op prevents over-editing and preserves user voice.

#### 8. Output Phase: Diff Application

**Location**: `ui/swapRenderer.ts`, `utils/diff.ts`

**Process**:
- Resolve conflicts (precedence: Noise > Context > Tone)
- Apply diffs caret-safe via `replaceRange()` (UTF-16 safe, preserves caret position)
- Visual feedback: Correction Marker animation, highlight wake effect
- Undo grouping: All diffs from one wave grouped atomically (Cmd+Alt+Z rollback)

**Why**: Caret-safe application ensures user never experiences text changing under fingers.

---

## Technical Decisions

### Why Rust for Core Logic?

**Decision**: All correction algorithms live in Rust (`crates/core-rs/`), exposed via FFI/WASM.

**Rationale** (from ADR-0005):
- **Performance**: 5–10× faster corrections vs TypeScript
- **Memory Safety**: Guaranteed by Rust compiler
- **Platform Consistency**: Same core across web (WASM) and macOS (C FFI)
- **Testability**: One implementation to test thoroughly

**Trade-offs**:
- Learning curve for TypeScript developers
- Build complexity (Rust toolchain required)
- Debugging across FFI boundaries

**Current Status**: Rust core exists but TypeScript engines (`engines/*.ts`) are still used for v0.6. Migration path: Feature flag → default Rust → remove TS engines.

### Why TypeScript for UI?

**Decision**: Platform UI layers (web, macOS shell) use TypeScript/Swift for UI concerns only.

**Rationale**:
- **Ecosystem**: Rich tooling for DOM/React integration
- **Development Speed**: Fast iteration for visual feedback
- **Separation**: UI concerns (animation, accessibility) separate from correction logic

**Current Status**: TypeScript UI fully implemented; Rust core ready for integration.

### Why Three-Stage Pipeline?

**Decision**: Separate Noise → Context → Tone stages with independent gating.

**Rationale** (PDF requirement):
- **Deterministic-First**: Noise always runs; higher stages degrade gracefully
- **Confidence Layers**: Each stage can gate independently (prevent over-editing)
- **Performance**: Skip Context/Tone under latency pressure while maintaining basic cleanup

**Implementation**: 
- Noise: Pattern matching (sync) + LM correction (async)
- Context: LM-only, confidence-gated (requires `τ_input`, `τ_commit`)
- Tone: LM-only, optional (requires `τ_tone` in addition to `τ_commit`)

### Why Active Region Policy?

**Decision**: Single editable window (~2–3 sentences) computed dynamically behind caret.

**Rationale** (PDF requirement):
- **Predictability**: Users understand edits happen in visible trailing window
- **Performance**: Limited processing scope maintains low latency
- **Safety**: Caret-safety validation ensures no edits at/after cursor

**Implementation**: Word-count based (default 20 words) with burst growth; sentence-bound option available.

### Why JSON over FFI?

**Decision**: Swift↔Rust communication uses JSON strings over C ABI (ADR-0008).

**Rationale**:
- **Debuggability**: Human-readable payloads in logs/debugger
- **Flexibility**: Schema evolution without ABI breaks
- **Performance**: ~1.6ms overhead acceptable for our latency budget

**Trade-off**: Larger payloads than binary formats, but debugging value outweighs cost.

### Why Device-Tier Optimization?

**Decision**: Adaptive performance based on WebGPU/WASM/CPU availability.

**Rationale**:
- **Accessibility**: Consistent experience regardless of hardware
- **Graceful Degradation**: Slower devices get longer debounces, shorter windows
- **User Trust**: System adapts transparently

**Implementation**: Tier detection in `sweepScheduler.ts` adjusts pause debounce; latency fallback policy (`config/defaultThresholds.ts`) shrinks Active Area and skips stages.

---

## Component Explanations

### `index.ts` — Boot Entrypoint

**Purpose**: Bootstrap system, wire components, expose control API.

**Key Functions**:
- `boot(options?)`: Create `TypingMonitor`, `SweepScheduler`, `DiffusionController`
- `ingest(text, caret)`: Feed typing events into pipeline
- `setLMAdapter(adapter)`: Inject language model (can be set after boot)

**Design**: Dependency injection pattern — LM adapter injected at runtime for testability.

### `core/typingMonitor.ts` — Event Emission

**Purpose**: Decouple input capture from processing.

**Design**: Publisher/subscriber pattern — multiple listeners can subscribe to typing events.

**Why**: Enables diagnostics, logging, and multiple consumers without tight coupling.

### `core/sweepScheduler.ts` — Orchestration

**Purpose**: Coordinate streaming ticks, pause detection, and correction waves.

**Key Behaviours**:
- **Security Guards**: Drop events in secure fields or IME composition
- **Tier-Aware Debounce**: Device-tier detection adjusts pause threshold
- **Streaming Ticks**: ~75ms interval for deterministic noise during typing
- **Pause Sweeps**: Trigger full correction wave on pause

**Why**: Centralised orchestration keeps timing logic consistent and testable.

### `core/diffusionController.ts` — Frontier Management

**Purpose**: Advance validation frontier word-by-word, manage Active Region rendering.

**Key Concepts**:
- **Frontier**: Leftmost index not yet validated
- **Active Region**: Computed window (via `ActiveRegionPolicy`) behind caret
- **Streaming Tick**: `tickOnce()` processes one word with deterministic noise
- **Catch-Up**: On pause, process remaining words up to caret

**Why**: Word-by-word advancement prevents UI stalls and maintains responsiveness.

### `core/activeRegionPolicy.ts` — Window Computation

**Purpose**: Compute editable region (Active Area) and read-only context window.

**Key Features**:
- **Burst Growth**: Expand region during active typing bursts (up to 1.5×)
- **Grapheme Alignment**: Handle emoji, multi-byte sequences correctly
- **Caret Safety**: Return empty range if computation would cross caret

**Why**: Dynamic window balances performance (smaller) with context (larger during bursts).

### `engines/noiseTransformer.ts` — Typo Correction

**Purpose**: Fix typos, spacing, casing (deterministic-first per PDF).

**Two Paths**:
1. **Deterministic** (`noiseTransformSync`): Pattern matching for streaming tick (always available)
2. **LM** (`noiseTransform`): Async LM correction for full Active Region (requires adapter)

**Why**: Deterministic path ensures basic cleanup even under load or LM failures.

### `engines/contextTransformer_v06.ts` — Grammar & Flow

**Purpose**: Improve grammar, agreement, micro-reordering within context window.

**Process**:
- Build context-aware prompt (±2 sentences)
- Stream LM correction
- Compute confidence → gate via thresholds

**Why**: Context-aware corrections improve coherence while respecting user voice.

### `engines/toneTransformer_v06.ts` — Style Adjustment

**Purpose**: Optional tone smoothing (Casual/Professional) with conservative gating.

**Process**:
- Only if `toneTarget !== 'None'`
- Stream LM tone adjustment
- Require both `τ_commit` and `τ_tone` thresholds

**Why**: Optional tone preserves user control; conservative gating prevents over-editing.

### `core/confidenceGate.ts` — Quality Gates

**Purpose**: Prevent over-editing by gating proposals with confidence scores.

**Components**:
- `computeInputFidelity()`: Assess input quality (ratio of valid characters)
- `computeConfidence()`: Weighted sum of inputs → combined score
- `applyThresholds()`: Decision (hold/commit/discard) based on thresholds

**Why**: Non-interference bias — when uncertain, do nothing.

### `utils/grapheme.ts` — Caret Safety

**Purpose**: Validate diffs never cross caret; handle Unicode graphemes correctly.

**Functions**:
- `isCaretSafe(start, end, caret)`: True if diff range is entirely before caret
- `alignToGraphemeBoundaries()`: Ensure range doesn't split multi-byte sequences

**Why**: Caret safety is absolute — system must never edit at/after cursor position.

---

## Terminology Glossary

- **Active Area / Active Region**: The sliding window (~2–3 sentences) immediately behind the caret where edits are allowed. Edits outside this region are forbidden.

- **Caretonism / Caret Organism**: The visual symbol (braille-like) that appears in-field to indicate system readiness and sweeps through text during corrections. States: Listening, Thinking, Cleaning.

- **Caret-Safe**: Guarantee that no edit range touches or crosses the live caret position. Validated before every diff application.

- **Confidence Gating**: Quality control system that scores proposals and only commits high-confidence edits. Low confidence → hold or discard.

- **Correction Marker**: Visual element that travels through text during sweep, unveiling corrections. Animated with different patterns for Listening/Thinking/Cleaning states.

- **Deterministic-First**: Design principle requiring Noise stage (typos, spacing) to always run, even under load. Higher stages (Context/Tone) degrade gracefully.

- **Diffusion**: Term for the word-by-word validation process that advances a "frontier" through text behind the caret. Processes deterministically during typing, catches up on pause.

- **Frontier**: The leftmost character index that has been validated/corrected. Advances word-by-word during streaming ticks.

- **LM Adapter**: Abstraction over language model inference (WebGPU/WASM/CPU). Provides async streaming interface for corrections.

- **Noise Stage**: First pipeline stage handling typos, spacing, casing. Has both deterministic (sync) and LM (async) paths.

- **Pause Detection**: Timing mechanism that triggers full correction wave when user stops typing for ≥ configured threshold (default 600ms, tier-adjusted).

- **Sweep**: The correction wave that processes Active Region during pause, applying all three stages sequentially.

- **Streaming Tick**: Periodic interval (~75ms) during active typing that processes one word at a time with deterministic noise fixes.

- **Tier-Aware**: Performance adaptation based on device capabilities (WebGPU → WASM → CPU). Adjusts debounces, token limits, animation FPS.

- **Three-Stage Pipeline**: Sequential execution of Noise → Context → Tone stages, with each stage's diffs applied before next stage runs.

- **Wave History**: Tracks correction waves for atomic undo (Cmd+Alt+Z). Bundles all diffs from one sweep into single undo group.

---

## Performance Characteristics

### Latency Budgets

- **Deterministic Noise**: < 5ms (pattern matching, synchronous)
- **LM Noise (WebGPU)**: p95 ≤ 15ms
- **LM Context (WebGPU)**: p95 ≤ 30ms
- **LM Tone (WebGPU)**: p95 ≤ 50ms
- **Total Pipeline (WebGPU)**: p95 ≤ 60ms

### Memory Usage

- **Typical**: ≤ 150MB RSS
- **Peak**: ≤ 200MB RSS
- **Model Loading**: ~80MB for Qwen2.5-0.5B-Instruct (q4 quantized)

### Device Tier Characteristics

| Tier | Pause Debounce | Token Limit | Animation FPS | Latency |
| --- | --- | --- | --- | --- |
| WebGPU | 600ms | 48 | 60 | p95 ≤ 15ms |
| WASM | 660ms | 24 | 30 | p95 ≤ 25ms |
| CPU | 780ms | 16 | 15 | p95 ≤ 30ms |

### Latency Fallback Policy

When p95 latency exceeds thresholds:
- **≥ 25ms**: Shrink Active Area to minimum (5 words)
- **≥ 40ms**: Skip Context stage (deterministic noise continues)
- **≥ 60ms**: Skip Tone stage (Context may still run if below skip threshold)

**Why**: Maintains basic cleanup (deterministic noise) even under extreme load.

---

## Debugging Guide

### Key Log Points

**TypingMonitor**:
- `[monitor] emit`: Every typing event (caret, text length)

**SweepScheduler**:
- `[sweep] onEvent`: Event received, security/IME guards
- `[sweep] pause collected`: Pause detected, catch-up steps
- `[sweep] runSweeps`: Full sweep execution

**DiffusionController**:
- `[diffusion] update`: State update (caret, frontier)
- `[diffusion] diff`: Deterministic noise diff applied
- `[diffusion] tickOnce`: Streaming tick execution

**Engines**:
- `[NoiseTransformer] LM error`: LM failure (falls back to deterministic)
- `[ContextTransformer] confidence`: Proposal scored, gate decision
- `[ToneTransformer] confidence`: Tone proposal gated

### Diagnostics Bus

Subscribe to event channels:
- **`noise`**: Deterministic noise decisions (applied/skipped/none)
- **`lm-wire`**: LM adapter calls, token streaming, abort events

### Common Issues

**Problem**: No corrections applied
- **Check**: LM adapter loaded? (`getLMAdapter()` returns non-null?)
- **Check**: Active Region caret-safe? (`isCaretSafe()` validation)
- **Check**: Confidence thresholds too high? (lower `τ_commit` for testing)

**Problem**: Corrections applied at caret
- **Critical**: This violates caret-safety guarantee. Check `replaceRange()` validation.

**Problem**: Deterministic noise not running
- **Check**: `noiseTransformSync()` returning non-null for test words
- **Check**: Streaming tick interval active? (`typingInterval` set)

**Problem**: Latency too high
- **Check**: Device tier detection (WebGPU available?)
- **Check**: Latency fallback policy thresholds (should auto-shrink/skip)

### Performance Profiling

**Web Lab** (`web-lab-v0.6`):
- Structured logs capture every pipeline event
- JSON export for analysis
- Real-time visualization of stage status, Active Region, confidence scores

**Chrome DevTools**:
- Performance tab: Record during typing → identify slow stages
- Memory tab: Monitor RSS during model loading

---

## Cross-References

- **PDF Requirements**: `docs/00-index/pdf-guide-requirements.md`
- **Current System Audit**: `docs/00-index/current-system-audit.md`
- **Misalignment Analysis**: `docs/00-index/misalignment-analysis.md`
- **Realignment Plan**: `docs/00-index/realignment-plan.md`
- **PRD**: `docs/01-prd/01-PRD.md`
- **Implementation Guide**: `docs/02-implementation/02-Implementation.md`
- **ADRs**: `docs/05-adr/*.md`
- **Architecture Diagrams**: `docs/04-architecture/architecture.mmd`

---

*This guide is a living document. Update when architecture evolves or new components are added. Last updated: 2025-09-19 (v0.6 branch).*

