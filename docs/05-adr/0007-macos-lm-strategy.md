<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  A D R - 0 0 0 7   L M   S T R A T E G Y  ░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ macOS LM inference strategy and model path decisions
    • WHY  ▸ Define optimal performance and compliance approach for Apple platforms
    • HOW  ▸ Evaluate MLX, Core ML, Core LM options with migration plan
-->

# ADR-0007: macOS Language Model Strategy

**Status**: Accepted  
**Date**: 2025-09-19  
**Deciders**: Core Team  

## Context

The macOS Mind⠶Flow app requires on-device language model inference for text correction. We need to choose the optimal inference framework that balances performance, Apple platform integration, and development complexity.

## Decision Drivers

- **Performance**: Sub-15ms p95 latency for correction decisions
- **Apple Integration**: Leverage platform-optimized frameworks where possible
- **Model Compatibility**: Support for Qwen 2.5-0.5B and future fine-tuned models
- **Distribution**: App Store compatibility and notarization requirements
- **Development Velocity**: Minimize complexity during MVP phase

## Options Considered

### Option 1: MLX Swift (Current Interim)
- **Pros**: Native Swift integration, Apple Silicon optimized, active development
- **Cons**: Newer framework, limited model format support, conversion complexity
- **Performance**: Excellent on M-series chips
- **Compatibility**: Requires model conversion from ONNX/HuggingFace

### Option 2: Core ML
- **Pros**: Mature Apple framework, App Store optimized, excellent toolchain
- **Cons**: Model conversion overhead, limited dynamic shapes
- **Performance**: Highly optimized for Apple Neural Engine
- **Compatibility**: Requires coremltools conversion pipeline

### Option 3: Core LM (Future)
- **Pros**: Apple's latest LM framework, designed for text generation
- **Cons**: Limited availability, requires macOS 15+, early adoption risk
- **Performance**: Expected to be optimal for text tasks
- **Compatibility**: Native support for common model formats

### Option 4: ONNX Runtime (Metal)
- **Pros**: Cross-platform, direct model compatibility, proven performance
- **Cons**: Larger binary size, less Apple-native integration
- **Performance**: Good Metal acceleration
- **Compatibility**: Direct ONNX model support

## Decision

**Phased Approach**:

1. **MVP Phase**: Continue with **MLX Swift** for rapid development
   - Leverage existing Qwen model conversion
   - Proven performance on Apple Silicon
   - Minimal integration complexity

2. **Production Phase**: Migrate to **Core ML** for App Store distribution
   - Convert models using coremltools pipeline
   - Optimize for Apple Neural Engine
   - Better App Store review compatibility

3. **Future Phase**: Evaluate **Core LM** when stable
   - Monitor Apple's roadmap and stability
   - Consider migration for next major version
   - Maintain Core ML as fallback

## Implementation Plan

### Phase 1: MLX Swift Integration (MVP)
**Timeline**: Immediate  
**Target**: Development and testing

**Tasks**:
1. **Model Conversion**
   ```bash
   # Convert Qwen ONNX → MLX format
   python -m mlx_lm.convert \
     --hf-path Qwen/Qwen2.5-0.5B-Instruct \
     --mlx-path ./models/qwen-mlx \
     --quantize
   ```

2. **Swift Integration**
   - Update `macOS/MindFlowApp.swift` MLX loading
   - Implement async token generation with cancellation
   - Add performance monitoring and latency tracking

3. **FFI Bridge Updates**
   - Modify `macOS/RustBridge.swift` to support MLX inference
   - Maintain JSON request/response format
   - Add MLX-specific error handling

**Success Criteria**:
- p95 ≤ 15ms inference latency on M-series
- Successful Qwen model loading and text generation
- Integration with existing FFI architecture

### Phase 2: Core ML Migration (Production)
**Timeline**: Production release  
**Target**: App Store distribution

**Tasks**:
1. **Model Conversion Pipeline**
   ```python
   import coremltools as ct
   from transformers import AutoModel, AutoTokenizer
   
   # Convert Qwen → Core ML with quantization
   model = AutoModel.from_pretrained("Qwen/Qwen2.5-0.5B-Instruct")
   coreml_model = ct.convert(
       model,
       inputs=[ct.TensorType(shape=(1, 512), dtype=np.int32)],
       compute_units=ct.ComputeUnit.ALL,  # Use Neural Engine
       minimum_deployment_target=ct.target.macOS14
   )
   coreml_model.save("qwen-coreml.mlpackage")
   ```

2. **Runtime Detection**
   - Implement Core ML availability detection
   - Fallback to MLX if Core ML fails
   - Performance comparison and selection logic

3. **App Store Optimization**
   - Bundle .mlpackage in app resources
   - Optimize for Neural Engine utilization
   - Validate privacy manifest compliance

**Success Criteria**:
- Successful App Store submission
- Neural Engine utilization >80%
- Binary size ≤ 100MB with model

### Phase 3: Core LM Evaluation (Future)
**Timeline**: When APIs stabilize  
**Target**: Next major version

**Tasks**:
1. **API Exploration**
   - Monitor Core LM public documentation
   - Prototype basic integration
   - Evaluate feature parity with Core ML

2. **Migration Assessment**
   - Performance comparison vs Core ML
   - API stability and backward compatibility
   - Integration complexity analysis

3. **Gradual Migration**
   - Feature flag for Core LM vs Core ML
   - A/B testing with user consent
   - Rollback strategy if issues arise

**Success Criteria**:
- Feature parity with Core ML implementation
- Performance improvement or equivalent
- Stable API with Apple support commitment

## Consequences

### Positive
- **Flexibility**: Phased approach allows optimization at each stage
- **Performance**: MLX provides immediate Apple Silicon optimization
- **Compliance**: Core ML ensures App Store compatibility
- **Future-proofing**: Ready to adopt Core LM when mature

### Negative
- **Complexity**: Multiple inference paths to maintain
- **Conversion Overhead**: Model format conversions required
- **Testing Burden**: Need to validate across multiple frameworks

## Compliance Notes

- **App Store**: Core ML preferred for distribution
- **Notarization**: All frameworks compatible with Hardened Runtime
- **Privacy**: On-device inference aligns with Privacy Manifest requirements
- **Performance**: Apple Neural Engine optimization via Core ML

## Success Metrics

- **Latency**: p95 ≤ 15ms correction decisions
- **Memory**: ≤300MB RSS during active correction
- **CPU**: <2% idle usage
- **Distribution**: Successful App Store submission

---

**Related**: [ADR-0001 Rust-First Architecture](0001-rust-first-architecture.md), [SPEC-MACOS-MVP](../02-implementation/02-Implementation.md#spec-macos-mvp)

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-19T12:00:00Z -->
