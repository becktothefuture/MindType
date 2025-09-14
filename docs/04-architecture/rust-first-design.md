<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  R U S T - F I R S T   A R C H I T E C T U R E  ░░  ║
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
    • WHAT ▸ Complete Rust-based correction engine design
    • WHY  ▸ Performance, safety, cross-platform consistency
    • HOW  ▸ Rust core with thin JS/Swift UI layers
-->

# Rust-First Architecture for Mind::Type

## Overview

Mind::Type's core correction functionality is implemented entirely in Rust. The Rust core receives text and caret position, performs all corrections, and returns the corrected text. JavaScript and Swift are thin UI layers that only handle:
- Capturing user input
- Applying visual corrections 
- Rendering animations

## Core Architecture

### Input/Output Contract

```rust
// Simple API surface
pub struct CorrectionRequest {
    text: String,
    caret_position: usize,
    settings: CorrectionSettings,
}

pub struct CorrectionResponse {
    corrections: Vec<Correction>,
    confidence: f32,
    debug_info: Option<DebugInfo>,
}

pub struct Correction {
    start: usize,
    end: usize,
    replacement: String,
    confidence: f32,
    correction_type: CorrectionType,
}
```

### Rust Core Components

#### 1. **Correction Engine** (`crates/core-rs/src/engine.rs`)
- **Responsibility**: Main orchestrator for all corrections
- **Functions**:
  - Receives text and caret position
  - Manages active region (20 words behind caret)  
  - Coordinates parallel correction workers
  - Resolves conflicts between corrections
  - Returns final correction set

#### 2. **Active Region Manager** (`crates/core-rs/src/active_region.rs`)
- **Responsibility**: Manages the 20-word correction zone
- **Functions**:
  - Tracks validated spans to avoid re-processing
  - Enforces caret-safety boundaries
  - Handles rollback on caret movement
  - Maintains correction history

#### 3. **Correction Workers** (`crates/core-rs/src/workers/`)
- **Noise Worker**: Typos, transpositions, spacing
- **Grammar Worker**: Punctuation, capitalization, simple grammar
- **Context Worker**: Sentence-level coherence (optional LM integration)
- **Tone Worker**: Formality adjustments (optional)

#### 4. **Conflict Resolver** (`crates/core-rs/src/conflict_resolver.rs`)
- **Responsibility**: Merge overlapping corrections
- **Priority**: Noise > Grammar > Context > Tone
- **Strategy**: Prefer high-confidence, longer corrections

#### 5. **Confidence Scorer** (`crates/core-rs/src/confidence.rs`)
- **Responsibility**: Mathematical scoring of corrections
- **Dimensions**:
  - Input fidelity (30%)
  - Transformation quality (40%)
  - Context coherence (20%)
  - Temporal stability (10%)

### FFI Bridge Design

#### Web (WASM)
```rust
// wasm_bindings.rs
#[wasm_bindgen]
pub struct MindTypeCore {
    engine: Engine,
}

#[wasm_bindgen]
impl MindTypeCore {
    #[wasm_bindgen(constructor)]
    pub fn new(config: JsValue) -> Result<MindTypeCore, JsValue> {
        // Parse config and initialize
    }
    
    pub fn process_text(&mut self, text: &str, caret: usize) -> JsValue {
        // Process and return corrections as JS object
    }
}
```

#### macOS/iOS (C FFI)
```rust
// ffi.rs
#[repr(C)]
pub struct MTCorrectionRequest {
    text: *const c_char,
    caret_position: usize,
}

#[repr(C)]
pub struct MTCorrectionResponse {
    corrections: *mut MTCorrection,
    correction_count: usize,
}

#[no_mangle]
pub extern "C" fn mt_process_text(request: MTCorrectionRequest) -> MTCorrectionResponse {
    // Process and return corrections
}

#[no_mangle]
pub extern "C" fn mt_free_response(response: MTCorrectionResponse) {
    // Clean up allocated memory
}
```

## Data Flow

```
1. User types in text field
2. JS/Swift captures (text, caret)
3. Calls Rust core via FFI/WASM
4. Rust core:
   a. Identifies active region (20 words behind caret)
   b. Runs correction workers in parallel
   c. Scores each correction (confidence)
   d. Resolves conflicts
   e. Returns correction list
5. JS/Swift applies corrections visually:
   a. Word-by-word replacement
   b. Dot matrix wave animation
   c. Accessibility announcements
```

## Performance Targets

- **Latency**: < 5ms for noise corrections, < 50ms with LM
- **Memory**: < 50MB resident (excluding optional LM models)
- **Throughput**: 60+ corrections/second
- **Active Region**: Process 20 words in < 10ms

## Testing Strategy

### Unit Tests (Rust)
```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_caret_safety() {
        // Verify no corrections at/after caret
    }
    
    #[test]
    fn test_active_region_bounds() {
        // Verify 20-word window
    }
    
    #[test]
    fn test_conflict_resolution() {
        // Verify overlapping corrections handled
    }
}
```

### Integration Tests (FFI)
- Test WASM bindings with Node.js
- Test C FFI with simple C program
- Verify memory safety and cleanup

### End-to-End Tests (Playwright)
- Type fuzzy text
- Verify corrections appear
- Test rollback on caret movement
- Measure latency

## Migration Path from TypeScript

### Phase 1: Parallel Implementation
1. Keep TypeScript pipeline running
2. Implement Rust core alongside
3. Add feature flag to switch between them
4. Run both in parallel, compare outputs

### Phase 2: Rust Primary
1. Make Rust the default path
2. Keep TypeScript as fallback
3. Monitor performance and accuracy
4. Fix any gaps in Rust implementation

### Phase 3: TypeScript Removal
1. Remove TypeScript correction logic
2. Keep only UI and animation code in TypeScript
3. Update all documentation
4. Archive TypeScript implementation

## Debugging & Observability

### Debug Mode
```rust
pub struct DebugInfo {
    active_region: String,
    corrections_attempted: usize,
    corrections_applied: usize,
    latency_ms: f32,
    confidence_scores: Vec<f32>,
}
```

### Logging
- Structured logging with `tracing` crate
- Configurable log levels
- Performance metrics collection
- Error tracking with context

## Security Considerations

- **No network calls** from Rust core
- **No file system access** except for optional local models
- **Memory-safe** Rust prevents buffer overflows
- **Sandboxed** WASM execution in browser
- **Input validation** for all text inputs

## Platform-Specific Optimizations

### Web (WASM)
- Use `wasm-opt` for size optimization
- Enable SIMD when available
- Streaming compilation for faster startup

### macOS
- Use Accelerate framework for vector operations
- Metal Performance Shaders for optional ML
- Grand Central Dispatch for parallelism

### Future: Windows/Linux
- Similar C FFI approach
- Platform-specific text APIs
- Consider using `windows-rs` crate

## Success Criteria

- ✅ All corrections happen in Rust
- ✅ TypeScript only handles UI
- ✅ Same behavior across all platforms
- ✅ Performance targets met
- ✅ Comprehensive test coverage
- ✅ Clean FFI boundaries
- ✅ No memory leaks
- ✅ Documentation complete
