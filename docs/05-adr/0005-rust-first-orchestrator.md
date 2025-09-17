<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  ADR-0005: COMPLETE RUST ORCHESTRATION  ░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ All correction logic in Rust; JS/Swift are thin UI layers
    • WHY  ▸ Performance, safety, true cross-platform consistency
    • HOW  ▸ Rust core handles everything from text input to corrections
-->

# ADR-0005: Complete Rust Orchestration

**Status**: Accepted (v0.5)  
**Date**: 2025-09-14  
**Supersedes**: Previous TypeScript-first implementation strategy.

## Context

Mind⠶Flow requires consistent, high-performance text correction across all platforms (web, macOS, iOS, future Windows/Linux). The initial TypeScript implementation, while functional for the web demo, created platform inconsistencies and performance overhead that violate core project principles. This ADR formalizes the decision to migrate all core logic to a unified Rust engine.

## Decision

**All text correction logic will live in Rust.** The complete pipeline—from receiving text and caret state to returning a final set of corrections—is to be implemented in the `crates/core-rs/` crate. 

JavaScript and Swift are reduced to thin UI layers that only:
1. Capture user input (text, caret position)
2. Call Rust core via FFI/WASM
3. Apply corrections visually with animations
4. Handle accessibility announcements

## Architecture

```
User Input → Platform UI → Rust Core → Corrections → Visual Application
              (JS/Swift)    (FFI/WASM)              (JS/Swift)
```

### Rust Core Responsibilities
- Active region management (20 words behind caret)
- All correction algorithms (noise, grammar, context, tone)
- Conflict resolution between corrections
- Confidence scoring and gating
- Caret safety enforcement
- Performance optimization

### Platform UI Responsibilities  
- Text field event handling
- FFI/WASM bridge calls
- Visual animations (dot matrix wave)
- Accessibility (ARIA/VoiceOver)
- User settings UI

## Implementation

### Web (WASM)
```typescript
// Simple TypeScript wrapper
import { Mind⠶FlowCore } from './mindtype_core_wasm';

const core = new Mind⠶FlowCore(config);
const corrections = core.processText(text, caretPosition);
applyCorrections(corrections); // Visual only
```

### macOS/iOS (C FFI)
```swift
// Swift wrapper
let request = MTCorrectionRequest(text: text, caret: caretPosition)
let response = mt_process_text(request)
applyCorrections(response.corrections) // Visual only
defer { mt_free_response(response) }
```

## Consequences

### Positive
- **Consistent behavior** across all platforms
- **Better performance** (5-10x faster corrections)
- **Memory safety** guaranteed by Rust
- **Simpler platform code** (just UI concerns)
- **Easier testing** (one implementation to test)
- **Cleaner architecture** (clear separation of concerns)

### Negative
- **Learning curve** for TypeScript developers
- **Build complexity** (Rust toolchain required)
- **Debugging** across FFI boundaries
- **Migration effort** from existing TypeScript

## Migration Strategy

1. **Phase 1**: Implement Rust core alongside TypeScript (feature flag)
2. **Phase 2**: Default to Rust, TypeScript as fallback
3. **Phase 3**: Remove TypeScript correction logic entirely

## Alternatives Considered

1. **Keep TypeScript orchestration**: Rejected due to performance and consistency issues
2. **Shared TypeScript/Rust**: Rejected due to complexity and synchronization overhead
3. **Native platform implementations**: Rejected due to maintenance burden

## Related Documents

- Architecture: `docs/04-architecture/revolutionary-architecture.mmd`
- Implementation: `crates/core-rs/README.md`
- Migration Plan: `docs/02-implementation/02-Implementation.md`
- API Specification: `docs/06-guides/06-03-reference/rust-api.md`

## Metrics for Success

- ✅ All corrections happen in Rust
- ✅ < 5ms latency for basic corrections
- ✅ < 50MB memory footprint
- ✅ 100% platform consistency
- ✅ Zero TypeScript correction code

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
