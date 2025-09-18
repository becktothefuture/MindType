<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  A D R - 0 0 0 6 :   L M - O N L Y   V 0 . 6  ░░  ║
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
    • WHAT ▸ LM-only transformers; external undo; rollback hotkey
    • WHY  ▸ Simplify architecture; eliminate rule complexity
    • HOW  ▸ Single Active Region; Cmd+Alt+Z wave rollback
-->

# ADR-0006: LM-Only Pipeline with External Undo

**Status**: Accepted (v0.6)  
**Date**: 2025-09-18  
**Supersedes**: Rule-based correction fallbacks and internal undo isolation.

## Context

Mind⠶Flow v0.5 implemented a dual approach: rule-based corrections with LM enhancement and internal undo isolation. This created complexity in testing, maintenance, and user experience. The revolutionary v0.6 vision demands simplification and focus on the core value proposition: **thought-speed typing through cognitive augmentation**.

## Decision

**All text corrections will be LM-driven.** The complete pipeline—Noise, Context, and Tone transformers—relies exclusively on language model inference within a single, configurable Active Region.

### Core Changes

1. **LM-Only Transformers**: Remove all rule-based correction logic. If the LM fails to initialize, corrections are disabled with a clear developer-facing error and restart path.

2. **Single Active Region**: Replace dual render/context ranges with one configurable region (default: 20 words) that grows during typing bursts and serves both visual and LM selection.

3. **External Undo**: Remove internal undo isolation. The host editor manages normal undo (Cmd+Z). Add dedicated rollback hotkey (Cmd+Alt+Z) to revert the last complete correction wave across all stages.

4. **Tone Default None**: Tone adjustments are disabled by default. Users must explicitly enable Casual or Professional tone.

## Architecture

```
User Types → Active Region (20 words) → LM Pipeline → Corrections
             ↑                         ↓
             └── Burst Growth ←────── Noise → Context → Tone
                                      ↓
Host Undo ←─── Cmd+Z (normal)    Wave Rollback ←─── Cmd+Alt+Z
```

### Active Region Policy
- **Size**: Configurable 5-50 words (default: 20)
- **Growth**: Expands to 1.5x during typing bursts (>5 keys, <200ms intervals)
- **Safety**: Grapheme-safe boundaries; never at/after caret
- **Scope**: Same region for visual rendering and LM selection

### LM Integration
- **Device Tiers**: WebGPU (48 tokens) → WASM (24 tokens) → CPU (16 tokens)
- **Failure Policy**: Disable corrections; surface developer error; provide restart
- **Models**: Qwen2.5-0.5B-Instruct with q4 quantization via Transformers.js

### Correction Wave
1. **Noise Stage**: Typo/spacing fixes within Active Region
2. **Context Stage**: Grammar/coherence improvements 
3. **Tone Stage**: Style adjustments (only when enabled; default None)

## Consequences

### Positive
- **Simplified Architecture**: Single correction path eliminates complexity
- **Better Quality**: LM corrections superior to rule-based approaches
- **Consistent Behavior**: Same logic across all platforms via unified pipeline
- **Clear Failure Modes**: Explicit error states rather than degraded functionality
- **Revolutionary UX**: Single Active Region concept is intuitive and powerful

### Negative
- **LM Dependency**: No corrections when LM unavailable (by design)
- **Resource Requirements**: Requires WebGPU/WASM for optimal performance
- **Migration Effort**: Existing rule-based logic must be removed/replaced

## Implementation

### Phase 1: Removal
- Delete `engines/noiseTransformer.ts` rule logic
- Delete `core/undoIsolation.ts` and `ui/groupUndo.ts`
- Delete `core/api/denoise.ts` batch processing
- Remove obsolete documentation

### Phase 2: LM-Only Core
- Implement configurable Active Region with burst growth
- Create LMAdapter with device-tier detection
- Rewrite transformers to use LM within Active Region bounds
- Add error boundaries for LM failures

### Phase 3: Rollback System
- Track correction wave history (bundle of diffs per wave)
- Implement Cmd+Alt+Z global hotkey for wave rollback
- Preserve native Cmd+Z for normal typing undo

## Alternatives Considered

1. **Hybrid Rule/LM**: Rejected due to complexity and inconsistent quality
2. **Graceful LM Degradation**: Rejected; clear failure states preferred
3. **Multiple Active Regions**: Rejected; single region is simpler and more intuitive
4. **Internal Undo Integration**: Rejected; external undo is cleaner and more predictable

## Related Documents

- PRD: `docs/01-prd/01-PRD.md` (v0.6 transformer roles, Active Region specification)
- Architecture: `docs/04-architecture/revolutionary-architecture.mmd`
- Implementation: `docs/02-implementation/02-Implementation.md` (Phase 0-6 plan)
- Principles: `docs/03-system-principles/03-System-Principles.md` (failure policy update)

## Metrics for Success

- ✅ All transformers use LM-only logic
- ✅ Single Active Region with configurable size
- ✅ LM failure shows developer error and disables corrections
- ✅ Rollback hotkey reverts last wave precisely
- ✅ Native undo behavior preserved
- ✅ No rule-based code remains in pipeline
- ✅ Documentation aligned with implementation

## Validation

- **Tests**: 39 passing tests for v0.6 core components (Active Region, LMAdapter, Correction Wave, Grapheme safety)
- **Demo**: Working playground at `http://localhost:5175` showcasing Active Region with controls
- **Coverage**: Core v0.6 components achieve >95% test coverage
- **Architecture**: All changes trace to PRD requirements and System Principles

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-18T18:05:00Z -->

