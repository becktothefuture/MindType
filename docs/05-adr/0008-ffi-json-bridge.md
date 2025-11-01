<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  A D R - 0 0 0 8   F F I   B R I D G E  ░░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ FFI bridge design using JSON over C ABI for Swift-Rust communication
    • WHY  ▸ Type safety, maintainability, and cross-language compatibility
    • HOW  ▸ JSON serialization with explicit memory management and error handling
-->

# ADR-0008: FFI JSON Bridge Design

**Status**: Accepted  
**Date**: 2025-09-19  
**Deciders**: Core Team  

## Context

The macOS Mind⠶Flow app requires efficient communication between Swift UI and Rust core logic. We need a Foreign Function Interface (FFI) design that balances type safety, performance, and maintainability.

## Decision Drivers

- **Type Safety**: Prevent memory corruption and data misinterpretation
- **Maintainability**: Easy to evolve schemas and debug issues
- **Performance**: Sub-15ms latency budget for correction pipeline
- **Cross-Language**: Support future language bindings (Python, etc.)
- **Error Handling**: Graceful failure modes and debugging information

## Options Considered

### Option 1: Direct C Structs (repr(C))
- **Pros**: Maximum performance, zero serialization overhead
- **Cons**: Brittle ABI, complex memory management, version compatibility issues
- **Risk**: High - ABI breaks require coordinated updates

### Option 2: Protocol Buffers/FlatBuffers
- **Pros**: Efficient binary format, schema evolution, cross-language
- **Cons**: Additional dependency, compilation complexity, overkill for simple data
- **Risk**: Medium - adds build complexity

### Option 3: JSON over C Strings
- **Pros**: Human-readable, debuggable, schema flexibility, simple implementation
- **Cons**: Serialization overhead, larger payloads
- **Risk**: Low - well-understood format

### Option 4: MessagePack/CBOR
- **Pros**: Compact binary JSON-like format, good performance
- **Cons**: Less debuggable, additional dependency
- **Risk**: Medium - less familiar format

## Decision

**JSON over C Strings** with explicit memory management.

### Rationale
- **Debuggability**: JSON payloads are human-readable in logs and debugger
- **Flexibility**: Easy schema evolution without ABI breaks
- **Simplicity**: No additional dependencies or build complexity
- **Performance**: Acceptable overhead for our latency budget (measured <2ms)
- **Safety**: Clear ownership semantics with explicit free functions

## Implementation Design

### Core Interface
```c
// Engine lifecycle
bool mindtype_init_engine(const char* config_json);

// Text processing
MTString mindtype_process_text(const char* request_json);

// Memory management
void mindtype_free_string(MTString str);
```

### Memory Management
- **Rust Side**: Allocates `MTString { ptr, len }` from JSON response
- **Swift Side**: MUST call `mindtype_free_string()` in defer block
- **Ownership**: Clear transfer from Rust → Swift → explicit free

### Error Handling
- **Init Errors**: Return `false` from `mindtype_init_engine`
- **Processing Errors**: JSON response with `error` field
- **Timeouts**: Partial results with timeout indication
- **Memory Errors**: Null pointer returns, graceful degradation

### Schema Evolution
- **Backward Compatibility**: Optional fields with defaults
- **Version Detection**: Include schema version in requests
- **Graceful Degradation**: Unknown fields ignored

## Performance Characteristics

### Measured Overhead
- JSON serialization: ~0.5ms (request) + ~1ms (response)
- String allocation/free: ~0.1ms
- Total FFI overhead: ~1.6ms (well within 15ms budget)

### Memory Usage
- Request payload: ~200-500 bytes typical
- Response payload: ~1-5KB with corrections
- Peak allocation: ~10KB per request

## Safety Guarantees

### Memory Safety
- No shared pointers across FFI boundary
- Explicit ownership transfer with `mindtype_free_string`
- Swift defer blocks ensure cleanup

### Type Safety
- JSON schema validation on both sides
- Serde deserialization catches malformed data
- Graceful error propagation

### Caret Safety
- All corrections validated pre-caret in Rust
- Active region bounds checked
- Rollback preserves exact caret position

## Consequences

### Positive
- **Debuggable**: JSON payloads visible in logs and debugger
- **Maintainable**: Schema changes don't break ABI
- **Safe**: Clear memory ownership and error handling
- **Flexible**: Easy to add fields and evolve interface

### Negative
- **Performance**: ~1.6ms serialization overhead per request
- **Size**: Larger payloads than binary formats
- **Validation**: Runtime schema validation required

## Monitoring and Debugging

### Logging
- Request/response payloads logged at debug level
- FFI call latency tracked and reported
- Memory allocation/free events traced

### Error Reporting
- JSON parse errors with line/column information
- Schema validation errors with field details
- Performance warnings when exceeding budgets

## Future Considerations

### Optimization Paths
- **Binary Format**: Migrate to MessagePack if performance becomes critical
- **Streaming**: Support incremental processing for large texts
- **Compression**: Add optional compression for large payloads

### Schema Evolution
- **Versioning**: Add explicit version negotiation
- **Capabilities**: Feature detection and graceful degradation
- **Extensions**: Plugin architecture for custom transformers

---

**Related**: [ADR-0007 macOS LM Strategy](0007-macos-lm-strategy.md), [CONTRACT-FFI-CORE](../02-implementation/02-Implementation.md#contract-ffi-core)

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-19T12:00:00Z -->


