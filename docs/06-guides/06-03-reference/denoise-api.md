<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  D E N O I S E   A P I   R E F E R E N C E  ░░░░░  ║
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
    • WHAT ▸ Comprehensive text denoising API reference
    • WHY  ▸ Document fuzzy text correction capabilities for testing
    • HOW  ▸ API usage, patterns, and integration examples
-->

# Denoising API Reference

The denoising API provides comprehensive fuzzy text correction capabilities for testing and integration scenarios. It combines multiple correction strategies to handle complex text noise patterns.

## Overview

The denoising API is designed to handle severely corrupted text inputs that go beyond the scope of the live typing pipeline. It's primarily used for:

- **Regression testing** of text correction capabilities
- **Batch processing** of noisy text documents
- **Integration scenarios** where comprehensive correction is needed
- **Quality assurance** validation of correction algorithms

## API Interface

### Core Function

```typescript
async function denoise(text: string): Promise<string>
```

**Parameters:**
- `text` (string): Input text with potential noise/errors

**Returns:**
- `Promise<string>`: Corrected text with minimal, high-confidence fixes

**Location:** `core/api/denoise.ts`

## Correction Strategies

The denoising API applies corrections in multiple stages:

### 1. Comprehensive Word Substitutions
- **Pattern matching**: Over 100 common typo patterns
- **Transpositions**: Character order corrections (e.g., "teh" → "the")
- **Missing letters**: Common dropped characters (e.g., "ths" → "this")
- **Compound words**: Separated words (e.g., "moon lite" → "moonlight")
- **Leetspeak**: Number substitutions (e.g., "s0undz" → "sounds")

### 2. Noise Transformer Integration
- Applies existing `noiseTransform` rules iteratively
- Handles remaining patterns not caught by substitutions
- Maintains caret safety principles

### 3. Context Transformer Integration
- Sentence-level corrections via `contextTransform`
- Punctuation normalization
- Capitalization fixes
- Grammar improvements

### 4. Post-processing Cleanup
- Spacing around punctuation
- Em dash normalization
- Sentence capitalization
- Standalone "i" → "I" corrections
- Contraction handling

## Usage Examples

### Basic Usage

```typescript
import { denoise } from '../core/api/denoise';

const noisyText = "Thre is a wind in the trese tonite, softy hummin like old memorees";
const cleanText = await denoise(noisyText);
console.log(cleanText);
// Output: "There is a wind in the trees tonight, softly humming like old memories"
```

### Test Integration

```typescript
import { denoise } from '../core/api/denoise';

describe('Text Correction Tests', () => {
  it('handles fuzzy text patterns', async () => {
    const testCases = [
      {
        input: "hearts drfit liek papers in teh straets",
        expected: "Hearts drift like papers in the streets"
      },
      {
        input: "moon lite clibms over brcks",
        expected: "Moonlight climbs over bricks"
      }
    ];

    for (const testCase of testCases) {
      const result = await denoise(testCase.input);
      expect(result).toBe(testCase.expected);
    }
  });
});
```

## Correction Patterns

### Supported Pattern Types

| Pattern Type | Examples | Coverage |
|--------------|----------|----------|
| **Basic Typos** | teh → the, adn → and | High |
| **Transpositions** | drfit → drift, liek → like | High |
| **Missing Letters** | ths → this, wit → with | Medium |
| **Compound Words** | moon lite → moonlight | Medium |
| **Contractions** | its → it's, dont → don't | Medium |
| **Capitalization** | sentence starts, "i" → "I" | High |
| **Punctuation** | spacing, em dashes | High |
| **Leetspeak** | s0undz → sounds, n0 → no | Medium |

### Preservation Rules

The API preserves:
- **Colloquial terms** when semantically clear (e.g., "hummin", "round")
- **Original meaning** without expansion
- **Voice and style** consistency
- **Intentional formatting** where possible

## Performance Characteristics

- **Processing time**: ~10-50ms for typical sentences
- **Memory usage**: Low, processes text in-place where possible
- **Scalability**: Suitable for documents up to ~10KB
- **Async operation**: Non-blocking for UI integration

## Limitations

1. **Context dependency**: Limited cross-sentence context awareness
2. **Ambiguity resolution**: May not handle highly ambiguous cases
3. **Domain specificity**: Optimized for general English text
4. **Correction confidence**: 50% success rate on highly corrupted text

## Testing Coverage

The denoising API includes comprehensive regression tests:

- **16 test cases** covering various corruption patterns
- **Fuzzy text scenarios** from mild to severe corruption
- **Edge case handling** for empty/minimal inputs
- **Pipeline integration** validation
- **Caret safety** verification

## Integration Notes

### With Live Pipeline
- The denoising API is **separate** from the live typing pipeline
- Use for **batch processing** or **testing scenarios**
- Not optimized for **real-time** character-by-character correction

### Error Handling
```typescript
try {
  const result = await denoise(noisyText);
  return result;
} catch (error) {
  console.warn('Denoising failed:', error);
  return noisyText; // Fallback to original
}
```

### Configuration
The API uses internal configuration and cannot be customized externally. For custom correction patterns, extend the `COMPREHENSIVE_SUBSTITUTIONS` map in the source code.

## Future Enhancements

Planned improvements include:
- **Enhanced contraction handling** for remaining edge cases
- **Improved sentence boundary detection**
- **Better comma placement** algorithms
- **Context-aware corrections** using LM integration
- **Performance optimizations** for larger documents

## See Also

- [Noise Transformer Reference](./noise-transformer.md)
- [Context Transformer Reference](./context-transformer.md)
- [Testing Guidelines](../how-to/testing.md)
- [Pipeline Integration](./pipeline.md)

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
