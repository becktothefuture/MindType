<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  R U S T   C O R E   A P I   S P E C  ░░░░░░░░░░  ║
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
    • WHAT ▸ Complete API specification for Rust core
    • WHY  ▸ Define exact contract between Rust and UI layers
    • HOW  ▸ Type definitions, data flow, error handling
-->

# Rust Core API Specification

## Overview

This document defines the complete API contract between the Mind::Type Rust core and platform UI layers (JavaScript/Swift). The Rust core handles ALL text correction logic. UI layers only capture input and render results.

## Core API Surface

### Primary Entry Point

```rust
/// Main correction processing function
/// This is the ONLY function UI layers need to call
pub fn process_text(request: CorrectionRequest) -> CorrectionResponse
```

### Request Types

```rust
/// Input from UI layer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionRequest {
    /// Full text from the input field
    pub text: String,
    
    /// Current caret position (0-based, UTF-16 code units)
    pub caret_position: usize,
    
    /// User settings and preferences
    pub settings: CorrectionSettings,
    
    /// Optional session ID for tracking
    pub session_id: Option<String>,
    
    /// Timestamp of request (milliseconds since epoch)
    pub timestamp_ms: u64,
}

/// User configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionSettings {
    /// Enable/disable corrections (master switch)
    pub enabled: bool,
    
    /// Active region size (words behind caret)
    pub active_region_words: usize,  // Default: 20
    
    /// Minimum confidence for auto-correction
    pub confidence_threshold: f32,    // Default: 0.9
    
    /// Language hint (ISO 639-1 code)
    pub language: Option<String>,     // Default: auto-detect
    
    /// Correction types to enable
    pub correction_types: CorrectionTypes,
    
    /// Performance mode
    pub performance_mode: PerformanceMode,
    
    /// Debug mode (includes detailed info)
    pub debug: bool,
}

/// Which corrections to apply
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionTypes {
    pub noise: bool,        // Typos, transpositions (Default: true)
    pub grammar: bool,      // Punctuation, capitalization (Default: true)
    pub context: bool,      // Sentence-level coherence (Default: false)
    pub tone: bool,         // Formality adjustments (Default: false)
}

/// Performance/quality trade-off
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PerformanceMode {
    Realtime,    // < 5ms latency, basic corrections only
    Balanced,    // < 20ms latency, most corrections
    Quality,     // < 50ms latency, all corrections including LM
}
```

### Response Types

```rust
/// Output to UI layer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionResponse {
    /// List of corrections to apply
    pub corrections: Vec<Correction>,
    
    /// Overall confidence in corrections
    pub overall_confidence: f32,
    
    /// Processing time in milliseconds
    pub latency_ms: f32,
    
    /// Session ID (echoed from request)
    pub session_id: Option<String>,
    
    /// Debug information (if requested)
    pub debug_info: Option<DebugInfo>,
}

/// Individual correction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Correction {
    /// Start position in text (UTF-16 code units)
    pub start: usize,
    
    /// End position in text (UTF-16 code units)
    pub end: usize,
    
    /// Text to replace the range with
    pub replacement: String,
    
    /// Confidence score [0.0, 1.0]
    pub confidence: f32,
    
    /// Type of correction applied
    pub correction_type: CorrectionType,
    
    /// Human-readable explanation (optional)
    pub explanation: Option<String>,
    
    /// Priority for conflict resolution
    pub priority: u8,
}

/// Correction categories
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum CorrectionType {
    Typo,               // Simple misspelling
    Transposition,      // Character swap
    Spacing,            // Whitespace normalization
    Punctuation,        // Punctuation fix
    Capitalization,     // Case correction
    Grammar,            // Grammar rule
    Context,            // Context-aware fix
    Tone,               // Tone adjustment
}
```

### Debug Information

```rust
/// Detailed debugging data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebugInfo {
    /// Active region boundaries
    pub active_region: ActiveRegionInfo,
    
    /// All corrections attempted (including rejected)
    pub attempted_corrections: Vec<AttemptedCorrection>,
    
    /// Performance breakdown
    pub performance: PerformanceBreakdown,
    
    /// Confidence scoring details
    pub confidence_details: ConfidenceDetails,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveRegionInfo {
    pub start: usize,
    pub end: usize,
    pub word_count: usize,
    pub text_preview: String,  // First/last 20 chars
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttemptedCorrection {
    pub correction: Correction,
    pub rejected_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceBreakdown {
    pub total_ms: f32,
    pub tokenization_ms: f32,
    pub noise_correction_ms: f32,
    pub grammar_correction_ms: f32,
    pub context_correction_ms: f32,
    pub tone_correction_ms: f32,
    pub conflict_resolution_ms: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceDetails {
    pub input_fidelity: f32,
    pub transform_quality: f32,
    pub context_coherence: f32,
    pub temporal_stability: f32,
}
```

## FFI Bindings

### WebAssembly (JavaScript)

```rust
/// WASM bindings for web platform
#[wasm_bindgen]
pub struct MindTypeCore {
    engine: CorrectionEngine,
}

#[wasm_bindgen]
impl MindTypeCore {
    /// Create new instance with configuration
    #[wasm_bindgen(constructor)]
    pub fn new(config: JsValue) -> Result<MindTypeCore, JsValue> {
        let settings: CorrectionSettings = serde_wasm_bindgen::from_value(config)?;
        Ok(MindTypeCore {
            engine: CorrectionEngine::new(settings),
        })
    }
    
    /// Process text and return corrections
    #[wasm_bindgen]
    pub fn process_text(&mut self, request_js: JsValue) -> Result<JsValue, JsValue> {
        let request: CorrectionRequest = serde_wasm_bindgen::from_value(request_js)?;
        let response = self.engine.process(request);
        serde_wasm_bindgen::to_value(&response).map_err(|e| e.into())
    }
    
    /// Update settings without recreating instance
    #[wasm_bindgen]
    pub fn update_settings(&mut self, settings_js: JsValue) -> Result<(), JsValue> {
        let settings: CorrectionSettings = serde_wasm_bindgen::from_value(settings_js)?;
        self.engine.update_settings(settings);
        Ok(())
    }
    
    /// Get current performance metrics
    #[wasm_bindgen]
    pub fn get_metrics(&self) -> Result<JsValue, JsValue> {
        let metrics = self.engine.get_metrics();
        serde_wasm_bindgen::to_value(&metrics).map_err(|e| e.into())
    }
}
```

### C FFI (macOS/iOS)

```c
// C header for Swift/Objective-C interop

// Opaque handle to Rust engine
typedef struct MTEngine MTEngine;

// Create engine with JSON configuration
MTEngine* mt_engine_create(const char* config_json);

// Process text (JSON in, JSON out)
const char* mt_process_text(MTEngine* engine, const char* request_json);

// Update settings
int mt_update_settings(MTEngine* engine, const char* settings_json);

// Get metrics
const char* mt_get_metrics(MTEngine* engine);

// Free allocated string from Rust
void mt_free_string(const char* str);

// Destroy engine
void mt_engine_destroy(MTEngine* engine);
```

## JavaScript Usage Example

```typescript
// TypeScript wrapper for WASM
import { MindTypeCore } from '@mindtype/core-wasm';

class MindType {
  private core: MindTypeCore;
  
  constructor(settings: CorrectionSettings) {
    this.core = new MindTypeCore(settings);
  }
  
  processText(text: string, caretPosition: number): CorrectionResponse {
    const request: CorrectionRequest = {
      text,
      caret_position: caretPosition,
      settings: this.settings,
      session_id: this.sessionId,
      timestamp_ms: Date.now(),
    };
    
    return this.core.process_text(request);
  }
  
  applyCorrections(corrections: Correction[]): void {
    // Sort by position (reverse to maintain indices)
    corrections.sort((a, b) => b.start - a.start);
    
    for (const correction of corrections) {
      // Apply to textarea/contenteditable
      this.replaceRange(correction.start, correction.end, correction.replacement);
      
      // Trigger animation
      this.animateDotMatrix(correction);
      
      // Accessibility announcement
      this.announceCorrection(correction);
    }
  }
}
```

## Swift Usage Example

```swift
// Swift wrapper for C FFI
import Foundation

class MindTypeCore {
    private let engine: OpaquePointer
    
    init(settings: CorrectionSettings) throws {
        let settingsJSON = try JSONEncoder().encode(settings)
        let settingsString = String(data: settingsJSON, encoding: .utf8)!
        
        guard let engine = mt_engine_create(settingsString) else {
            throw MindTypeError.initializationFailed
        }
        self.engine = engine
    }
    
    func processText(_ text: String, caretPosition: Int) throws -> CorrectionResponse {
        let request = CorrectionRequest(
            text: text,
            caretPosition: caretPosition,
            settings: self.settings,
            sessionId: self.sessionId,
            timestampMs: UInt64(Date().timeIntervalSince1970 * 1000)
        )
        
        let requestJSON = try JSONEncoder().encode(request)
        let requestString = String(data: requestJSON, encoding: .utf8)!
        
        guard let responsePtr = mt_process_text(engine, requestString) else {
            throw MindTypeError.processingFailed
        }
        
        let responseString = String(cString: responsePtr)
        mt_free_string(responsePtr)
        
        let responseData = responseString.data(using: .utf8)!
        return try JSONDecoder().decode(CorrectionResponse.self, from: responseData)
    }
    
    deinit {
        mt_engine_destroy(engine)
    }
}
```

## Error Handling

### Error Types

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MindTypeError {
    /// Invalid UTF-16 position
    InvalidPosition { position: usize, text_length: usize },
    
    /// Text too long for processing
    TextTooLong { length: usize, max_length: usize },
    
    /// Language not supported
    UnsupportedLanguage { language: String },
    
    /// Internal processing error
    ProcessingError { message: String },
    
    /// Configuration error
    ConfigurationError { message: String },
}
```

### Error Response

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: MindTypeError,
    pub request_id: Option<String>,
    pub timestamp_ms: u64,
}
```

## Performance Guarantees

| Performance Mode | Latency Target | Memory Usage | Features |
|-----------------|---------------|--------------|----------|
| Realtime | < 5ms | < 10MB | Noise corrections only |
| Balanced | < 20ms | < 30MB | Noise + Grammar |
| Quality | < 50ms | < 50MB | All corrections + LM |

## Thread Safety

- The Rust engine is **thread-safe** and can handle concurrent requests
- Each request is processed independently
- No shared mutable state between requests
- WebAssembly runs in a single thread (Web Workers for parallelism)
- Native platforms can use multiple engine instances

## Memory Management

### WASM
- Automatic memory management via wasm-bindgen
- No manual memory management required from JavaScript

### C FFI
- All returned strings must be freed with `mt_free_string()`
- Engine must be destroyed with `mt_engine_destroy()`
- No memory leaks in normal operation

## Versioning

```rust
/// Get API version
pub fn get_version() -> Version {
    Version {
        major: 1,
        minor: 0,
        patch: 0,
        pre_release: None,
    }
}

/// Check API compatibility
pub fn is_compatible(required: &Version) -> bool {
    // Major version must match
    // Minor/patch can be newer
}
```

## Testing Utilities

```rust
/// Test helper for unit tests
pub fn create_test_request(text: &str, caret: usize) -> CorrectionRequest {
    CorrectionRequest {
        text: text.to_string(),
        caret_position: caret,
        settings: CorrectionSettings::default(),
        session_id: None,
        timestamp_ms: 0,
    }
}

/// Validate correction safety
pub fn validate_correction(correction: &Correction, text: &str, caret: usize) -> bool {
    // Never edit at or after caret
    correction.end <= caret &&
    // Valid range
    correction.start <= correction.end &&
    // Within text bounds
    correction.end <= text.len()
}
```

## Grapheme-safe ranges & index mapping

- Canonical units:
  - UI layers (JS/Swift) report positions in UTF-16 code units.
  - Rust core operates on UTF-8 byte indices.
  - All edit ranges MUST align to Unicode grapheme cluster boundaries (UAX #29).
- Mapping rules:
  - Convert UI UTF-16 positions to UTF-8 byte offsets using validated helpers.
  - Reject ranges that split grapheme clusters (e.g., ZWJ emoji, combining marks).
  - Provide tests covering emoji with skin tones, ZWJ sequences, accented characters.
- Implementation guidance:
  - Use ICU/`unicode-segmentation` or platform segmenters for grapheme boundaries.
  - Carry both caret and range metadata where helpful, but normalize to grapheme-safe byte ranges before processing.
- Safety:
  - If mapping fails or boundaries are invalid, return a structured error and skip edits.

## Migration Path

### Phase 1: Parallel Testing
```typescript
// Run both TypeScript and Rust, compare results
const tsResult = oldEngine.process(text, caret);
const rustResult = newEngine.process_text(text, caret);
console.assert(deepEqual(tsResult, rustResult));
```

### Phase 2: Rust Primary
```typescript
// Use Rust by default, TypeScript as fallback
try {
  return rustEngine.process_text(text, caret);
} catch (e) {
  console.warn('Rust engine failed, using TypeScript', e);
  return tsEngine.process(text, caret);
}
```

### Phase 3: Rust Only
```typescript
// TypeScript engine removed
return rustEngine.process_text(text, caret);
```

## Compliance

- ✅ Caret safety: Never edits at/after caret
- ✅ Active region: 20 words behind caret
- ✅ Privacy: No network calls, no persistence
- ✅ Performance: Meets latency targets
- ✅ Accessibility: Supports screen readers
- ✅ Cross-platform: Same behavior everywhere
