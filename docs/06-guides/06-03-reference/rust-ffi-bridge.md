<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  R U S T   F F I   B R I D G E   D E S I G N  ░░░  ║
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
    • WHAT ▸ FFI/WASM bridge design for cross-platform
    • WHY  ▸ Enable Rust core usage from JS/Swift/etc
    • HOW  ▸ Type-safe bindings with memory management
-->

# Rust FFI Bridge Design

## Overview

This document specifies the Foreign Function Interface (FFI) and WebAssembly (WASM) bridge design that enables the MindType Rust core to be used from JavaScript, Swift, and other platform languages.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Platform UI Layer                   │
│         (JavaScript, Swift, Kotlin, etc.)            │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│                    Bridge Layer                      │
│   ┌─────────────┐  ┌─────────────┐  ┌──────────┐   │
│   │    WASM     │  │   C FFI     │  │   JNI    │   │
│   │  (Browser)  │  │ (iOS/macOS) │  │(Android) │   │
│   └─────────────┘  └─────────────┘  └──────────┘   │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│                     Rust Core                        │
│            (All Correction Logic Here)               │
└─────────────────────────────────────────────────────┘
```

## WASM Bridge (Web Platform)

### Rust Side (`crates/core-rs/src/wasm_bridge.rs`)

```rust
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use crate::engine::{CorrectionEngine, CorrectionRequest, CorrectionResponse};

/// Main WASM interface for web platform
#[wasm_bindgen]
pub struct MindTypeWasm {
    engine: CorrectionEngine,
}

#[wasm_bindgen]
impl MindTypeWasm {
    /// Create new instance with JSON configuration
    #[wasm_bindgen(constructor)]
    pub fn new(config_json: &str) -> Result<MindTypeWasm, JsValue> {
        // Parse configuration
        let config: CorrectionSettings = serde_json::from_str(config_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        // Initialize engine
        let engine = CorrectionEngine::new(config)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        Ok(MindTypeWasm { engine })
    }
    
    /// Process text and return corrections as JSON
    #[wasm_bindgen]
    pub fn process_text(&mut self, request_json: &str) -> Result<String, JsValue> {
        // Parse request
        let request: CorrectionRequest = serde_json::from_str(request_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        // Process
        let response = self.engine.process(request);
        
        // Serialize response
        serde_json::to_string(&response)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
    
    /// Update settings without recreating engine
    #[wasm_bindgen]
    pub fn update_settings(&mut self, settings_json: &str) -> Result<(), JsValue> {
        let settings: CorrectionSettings = serde_json::from_str(settings_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        self.engine.update_settings(settings);
        Ok(())
    }
    
    /// Get performance metrics
    #[wasm_bindgen]
    pub fn get_metrics(&self) -> Result<String, JsValue> {
        let metrics = self.engine.get_metrics();
        serde_json::to_string(&metrics)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
    
    /// Get version information
    #[wasm_bindgen]
    pub fn get_version(&self) -> String {
        format!("{}.{}.{}", 
            env!("CARGO_PKG_VERSION_MAJOR"),
            env!("CARGO_PKG_VERSION_MINOR"),
            env!("CARGO_PKG_VERSION_PATCH"))
    }
}

/// Alternative: Direct function exports for smaller bundle
#[wasm_bindgen]
pub fn process_text_direct(text: &str, caret: usize, settings_json: &str) -> Result<String, JsValue> {
    let settings: CorrectionSettings = serde_json::from_str(settings_json)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    let request = CorrectionRequest {
        text: text.to_string(),
        caret_position: caret,
        settings,
        session_id: None,
        timestamp_ms: 0,
    };
    
    let engine = CorrectionEngine::new_ephemeral();
    let response = engine.process(request);
    
    serde_json::to_string(&response)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}
```

### JavaScript Side

```typescript
// TypeScript wrapper (`web-demo/src/mindtype-wasm.ts`)
export interface CorrectionRequest {
  text: string;
  caret_position: number;
  settings: CorrectionSettings;
  session_id?: string;
  timestamp_ms: number;
}

export interface CorrectionResponse {
  corrections: Correction[];
  overall_confidence: number;
  latency_ms: number;
  session_id?: string;
  debug_info?: DebugInfo;
}

export class MindTypeCore {
  private wasm: MindTypeWasm;
  private settings: CorrectionSettings;
  
  constructor(settings: CorrectionSettings) {
    this.settings = settings;
    this.wasm = new MindTypeWasm(JSON.stringify(settings));
  }
  
  processText(text: string, caretPosition: number): CorrectionResponse {
    const request: CorrectionRequest = {
      text,
      caret_position: caretPosition,
      settings: this.settings,
      session_id: crypto.randomUUID(),
      timestamp_ms: Date.now(),
    };
    
    const responseJson = this.wasm.process_text(JSON.stringify(request));
    return JSON.parse(responseJson);
  }
  
  updateSettings(settings: Partial<CorrectionSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.wasm.update_settings(JSON.stringify(this.settings));
  }
  
  getMetrics(): PerformanceMetrics {
    const metricsJson = this.wasm.get_metrics();
    return JSON.parse(metricsJson);
  }
  
  destroy(): void {
    // WASM memory is automatically managed
    // But we can free any retained references
    this.wasm.free?.();
  }
}
```

### Build Configuration (`Cargo.toml`)

```toml
[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
serde-wasm-bindgen = "0.6"

[target.'cfg(target_arch = "wasm32")'.dependencies]
web-sys = "0.3"
js-sys = "0.3"

[profile.release]
opt-level = "z"     # Optimize for size
lto = true          # Link-time optimization
codegen-units = 1   # Single codegen unit for better optimization

# wasm-opt will further optimize after build
```

### Build Script (`build-wasm.sh`)

```bash
#!/bin/bash
set -e

# Build WASM module
wasm-pack build \
  --target web \
  --out-dir bindings/wasm/pkg \
  --release \
  crates/core-rs

# Optimize with wasm-opt
wasm-opt \
  -Oz \
  -o bindings/wasm/pkg/mindtype_core_bg_optimized.wasm \
  bindings/wasm/pkg/mindtype_core_bg.wasm

# Generate TypeScript definitions
mv bindings/wasm/pkg/mindtype_core_bg_optimized.wasm \
   bindings/wasm/pkg/mindtype_core_bg.wasm

echo "WASM build complete!"
echo "Size: $(du -h bindings/wasm/pkg/mindtype_core_bg.wasm)"
```

## C FFI Bridge (Native Platforms)

### Rust Side (`crates/core-rs/src/c_ffi.rs`)

```rust
use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::ptr;
use crate::engine::{CorrectionEngine, CorrectionRequest, CorrectionResponse};

/// Opaque handle to engine
pub struct MTEngine {
    engine: CorrectionEngine,
}

/// Create new engine with JSON configuration
#[no_mangle]
pub extern "C" fn mt_engine_create(config_json: *const c_char) -> *mut MTEngine {
    if config_json.is_null() {
        return ptr::null_mut();
    }
    
    let config_str = unsafe {
        match CStr::from_ptr(config_json).to_str() {
            Ok(s) => s,
            Err(_) => return ptr::null_mut(),
        }
    };
    
    let config: CorrectionSettings = match serde_json::from_str(config_str) {
        Ok(c) => c,
        Err(_) => return ptr::null_mut(),
    };
    
    let engine = match CorrectionEngine::new(config) {
        Ok(e) => e,
        Err(_) => return ptr::null_mut(),
    };
    
    Box::into_raw(Box::new(MTEngine { engine }))
}

/// Process text and return JSON response
#[no_mangle]
pub extern "C" fn mt_process_text(
    engine: *mut MTEngine,
    request_json: *const c_char
) -> *mut c_char {
    if engine.is_null() || request_json.is_null() {
        return ptr::null_mut();
    }
    
    let engine = unsafe { &mut (*engine).engine };
    
    let request_str = unsafe {
        match CStr::from_ptr(request_json).to_str() {
            Ok(s) => s,
            Err(_) => return ptr::null_mut(),
        }
    };
    
    let request: CorrectionRequest = match serde_json::from_str(request_str) {
        Ok(r) => r,
        Err(_) => return ptr::null_mut(),
    };
    
    let response = engine.process(request);
    
    let response_json = match serde_json::to_string(&response) {
        Ok(j) => j,
        Err(_) => return ptr::null_mut(),
    };
    
    match CString::new(response_json) {
        Ok(s) => s.into_raw(),
        Err(_) => ptr::null_mut(),
    }
}

/// Free string allocated by Rust
#[no_mangle]
pub extern "C" fn mt_free_string(s: *mut c_char) {
    if s.is_null() {
        return;
    }
    unsafe {
        let _ = CString::from_raw(s);
    }
}

/// Destroy engine
#[no_mangle]
pub extern "C" fn mt_engine_destroy(engine: *mut MTEngine) {
    if engine.is_null() {
        return;
    }
    unsafe {
        let _ = Box::from_raw(engine);
    }
}

/// Get last error message
#[no_mangle]
pub extern "C" fn mt_get_last_error() -> *mut c_char {
    // Thread-local error storage
    thread_local! {
        static LAST_ERROR: std::cell::RefCell<Option<String>> = std::cell::RefCell::new(None);
    }
    
    LAST_ERROR.with(|e| {
        match e.borrow().as_ref() {
            Some(err) => {
                match CString::new(err.as_str()) {
                    Ok(s) => s.into_raw(),
                    Err(_) => ptr::null_mut(),
                }
            }
            None => ptr::null_mut(),
        }
    })
}
```

### C Header (`bindings/c/mindtype.h`)

```c
#ifndef MINDTYPE_H
#define MINDTYPE_H

#ifdef __cplusplus
extern "C" {
#endif

// Opaque handle to engine
typedef struct MTEngine MTEngine;

// Create engine with JSON configuration
// Returns NULL on error
MTEngine* mt_engine_create(const char* config_json);

// Process text and return JSON response
// Caller must free returned string with mt_free_string()
// Returns NULL on error
char* mt_process_text(MTEngine* engine, const char* request_json);

// Update engine settings
// Returns 0 on success, -1 on error
int mt_update_settings(MTEngine* engine, const char* settings_json);

// Get performance metrics as JSON
// Caller must free returned string with mt_free_string()
char* mt_get_metrics(MTEngine* engine);

// Free string allocated by Rust
void mt_free_string(char* str);

// Destroy engine and free all resources
void mt_engine_destroy(MTEngine* engine);

// Get last error message
// Caller must free returned string with mt_free_string()
char* mt_get_last_error(void);

// Get version string
// Caller must free returned string with mt_free_string()
char* mt_get_version(void);

#ifdef __cplusplus
}
#endif

#endif // MINDTYPE_H
```

### Swift Wrapper (`bindings/swift/MindType.swift`)

```swift
import Foundation

public class MindTypeCore {
    private let engine: OpaquePointer
    private var settings: CorrectionSettings
    
    public init(settings: CorrectionSettings) throws {
        self.settings = settings
        
        let settingsData = try JSONEncoder().encode(settings)
        let settingsString = String(data: settingsData, encoding: .utf8)!
        
        guard let engine = mt_engine_create(settingsString) else {
            if let errorPtr = mt_get_last_error() {
                let error = String(cString: errorPtr)
                mt_free_string(errorPtr)
                throw MindTypeError.initialization(error)
            }
            throw MindTypeError.initialization("Unknown error")
        }
        
        self.engine = engine
    }
    
    public func processText(_ text: String, caretPosition: Int) throws -> CorrectionResponse {
        let request = CorrectionRequest(
            text: text,
            caretPosition: caretPosition,
            settings: settings,
            sessionId: UUID().uuidString,
            timestampMs: UInt64(Date().timeIntervalSince1970 * 1000)
        )
        
        let requestData = try JSONEncoder().encode(request)
        let requestString = String(data: requestData, encoding: .utf8)!
        
        guard let responsePtr = mt_process_text(engine, requestString) else {
            if let errorPtr = mt_get_last_error() {
                let error = String(cString: errorPtr)
                mt_free_string(errorPtr)
                throw MindTypeError.processing(error)
            }
            throw MindTypeError.processing("Unknown error")
        }
        
        let responseString = String(cString: responsePtr)
        mt_free_string(responsePtr)
        
        let responseData = responseString.data(using: .utf8)!
        return try JSONDecoder().decode(CorrectionResponse.self, from: responseData)
    }
    
    public func updateSettings(_ settings: CorrectionSettings) throws {
        self.settings = settings
        
        let settingsData = try JSONEncoder().encode(settings)
        let settingsString = String(data: settingsData, encoding: .utf8)!
        
        if mt_update_settings(engine, settingsString) != 0 {
            if let errorPtr = mt_get_last_error() {
                let error = String(cString: errorPtr)
                mt_free_string(errorPtr)
                throw MindTypeError.settings(error)
            }
            throw MindTypeError.settings("Failed to update settings")
        }
    }
    
    public func getMetrics() throws -> PerformanceMetrics {
        guard let metricsPtr = mt_get_metrics(engine) else {
            throw MindTypeError.metrics("Failed to get metrics")
        }
        
        let metricsString = String(cString: metricsPtr)
        mt_free_string(metricsPtr)
        
        let metricsData = metricsString.data(using: .utf8)!
        return try JSONDecoder().decode(PerformanceMetrics.self, from: metricsData)
    }
    
    deinit {
        mt_engine_destroy(engine)
    }
}

public enum MindTypeError: Error {
    case initialization(String)
    case processing(String)
    case settings(String)
    case metrics(String)
}
```

## Memory Management

### WASM
- **Automatic**: wasm-bindgen handles memory management
- **JavaScript GC**: Objects are garbage collected when no longer referenced
- **Explicit cleanup**: Optional `free()` method for immediate cleanup

### C FFI
- **Manual**: Caller must free strings with `mt_free_string()`
- **Engine lifecycle**: Create with `mt_engine_create()`, destroy with `mt_engine_destroy()`
- **Error handling**: Check for NULL returns, get error with `mt_get_last_error()`

## Error Handling

### WASM Errors
```typescript
try {
  const response = core.processText(text, caret);
  applyCorrections(response.corrections);
} catch (error) {
  console.error('Correction failed:', error);
  // Fallback to no corrections
}
```

### C FFI Errors
```c
MTEngine* engine = mt_engine_create(config);
if (!engine) {
    char* error = mt_get_last_error();
    if (error) {
        fprintf(stderr, "Error: %s\n", error);
        mt_free_string(error);
    }
    return -1;
}
```

## Thread Safety

### WASM
- **Single-threaded**: WASM runs in a single thread
- **Web Workers**: Use multiple instances in different workers for parallelism
- **SharedArrayBuffer**: For shared memory between workers (optional)

### C FFI
- **Thread-safe engine**: Multiple threads can call `mt_process_text()` on same engine
- **Error storage**: Thread-local for `mt_get_last_error()`
- **Best practice**: One engine per thread for maximum performance

## Performance Optimization

### WASM Optimization
```toml
# Cargo.toml
[profile.release]
opt-level = "z"       # Size optimization
lto = true           # Link-time optimization
strip = true         # Strip symbols
panic = "abort"      # Smaller panic handler
```

```bash
# Post-build optimization
wasm-opt -Oz input.wasm -o output.wasm
```

### Native Optimization
```toml
# Cargo.toml
[profile.release]
opt-level = 3        # Maximum performance
lto = "fat"         # Full LTO
codegen-units = 1   # Single codegen unit
```

## Testing

### WASM Tests
```typescript
// Jest test example
describe('MindTypeCore WASM', () => {
  let core: MindTypeCore;
  
  beforeEach(() => {
    core = new MindTypeCore(defaultSettings);
  });
  
  afterEach(() => {
    core.destroy();
  });
  
  test('processes text correctly', () => {
    const response = core.processText('helllo wrold', 12);
    expect(response.corrections).toHaveLength(2);
    expect(response.corrections[0].replacement).toBe('hello');
  });
});
```

### C FFI Tests
```c
// C test example
void test_engine_creation() {
    const char* config = "{\"enabled\":true}";
    MTEngine* engine = mt_engine_create(config);
    assert(engine != NULL);
    mt_engine_destroy(engine);
}

void test_text_processing() {
    MTEngine* engine = mt_engine_create(default_config);
    const char* request = "{\"text\":\"helllo\",\"caret_position\":6}";
    char* response = mt_process_text(engine, request);
    assert(response != NULL);
    assert(strstr(response, "hello") != NULL);
    mt_free_string(response);
    mt_engine_destroy(engine);
}
```

## Platform-Specific Considerations

### Browser (WASM)
- **Bundle size**: Target < 500KB compressed
- **Initialization**: Async loading of WASM module
- **Feature detection**: Check for WebAssembly support
- **Fallback**: Graceful degradation if WASM unavailable

### macOS/iOS
- **Framework**: Build as `.framework` or `.xcframework`
- **Signing**: Code signing required for distribution
- **Sandbox**: Respect app sandbox restrictions
- **Universal binary**: Support both Intel and Apple Silicon

### Android (Future)
- **JNI**: Java Native Interface wrapper
- **AAR**: Android Archive packaging
- **ABI**: Support multiple architectures (arm64-v8a, x86_64, etc.)
- **ProGuard**: Configuration for code obfuscation

## Deployment

### NPM Package (WASM)
```json
{
  "name": "@mindtype/core-wasm",
  "version": "1.0.0",
  "main": "pkg/mindtype_core.js",
  "types": "pkg/mindtype_core.d.ts",
  "files": [
    "pkg/"
  ],
  "scripts": {
    "build": "./build-wasm.sh",
    "test": "jest"
  }
}
```

### CocoaPods (iOS/macOS)
```ruby
Pod::Spec.new do |s|
  s.name         = "MindTypeCore"
  s.version      = "1.0.0"
  s.summary      = "MindType correction engine"
  s.homepage     = "https://mindtype.app"
  s.license      = { :type => "MIT" }
  s.author       = { "MindType" => "hello@mindtype.app" }
  s.source       = { :git => "https://github.com/mindtype/core.git", :tag => s.version }
  s.vendored_frameworks = "MindTypeCore.xcframework"
  s.platforms    = { :ios => "13.0", :osx => "11.0" }
end
```

### Swift Package Manager
```swift
// Package.swift
let package = Package(
    name: "MindTypeCore",
    products: [
        .library(name: "MindTypeCore", targets: ["MindTypeCore"])
    ],
    targets: [
        .binaryTarget(
            name: "MindTypeCore",
            path: "MindTypeCore.xcframework"
        )
    ]
)
```

## Migration Strategy

### Phase 1: Parallel Testing
- Deploy both TypeScript and Rust versions
- Compare outputs in production
- Collect performance metrics

### Phase 2: Gradual Rollout
- Feature flag for Rust engine
- Start with 10% of users
- Monitor error rates and performance

### Phase 3: Full Migration
- Remove TypeScript implementation
- Rust-only deployment
- Archive TypeScript code

## Success Metrics

- ✅ WASM bundle < 500KB compressed
- ✅ FFI overhead < 1ms per call
- ✅ Memory usage < 50MB
- ✅ Zero memory leaks
- ✅ Thread-safe operations
- ✅ Cross-platform consistency
- ✅ 100% API compatibility

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
