<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  T E R M I N O L O G Y   G U I D E  ░░░░░░░░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ⌌╌ P L A C E H O L D E R ╌╌⌍              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ Standardized terminology for Mind::Type
    • WHY  ▸ Consistency across documentation and code
    • HOW  ▸ Use these terms everywhere, no exceptions
-->

# Mind::Type Terminology Guide

This document defines the official terminology for Mind::Type. **Use these terms consistently across all documentation, code, and communications.**

## Core Concepts

### Product & System

| ✅ **USE THIS** | ❌ **NOT THIS** | **Definition** |
|-----------------|----------------|----------------|
| **Mind::Type** | MindTyper, MindType, MT | The product name (always with double colon) |
| **Correction** | Sweep, Transform, Fix, Edit | A change made to improve text |
| **Correction Engine** | Pipeline, Transformer, Processor | The Rust core that performs corrections |

### Text & Position

| ✅ **USE THIS** | ❌ **NOT THIS** | **Definition** |
|-----------------|----------------|----------------|
| **Caret** | Cursor, Insertion point | The text insertion position |
| **Active region** | Band, Tapestry, Window, Zone | The 20-word area behind the caret where corrections happen |
| **Text field** | Input, Editor, Textarea | Any editable text area |

### Correction Types

| ✅ **USE THIS** | ❌ **NOT THIS** | **Definition** |
|-----------------|----------------|----------------|
| **Noise correction** | Typo fix, Basic correction | Basic typos, transpositions, spacing |
| **Grammar correction** | Context transform | Punctuation, capitalization, simple grammar |
| **Context correction** | Semantic fix | Sentence-level coherence improvements |
| **Tone adjustment** | Style transform | Formality level changes |

### Processing Concepts

| ✅ **USE THIS** | ❌ **NOT THIS** | **Definition** |
|-----------------|----------------|----------------|
| **Confidence score** | Quality score, Threshold | 0-1 value indicating correction reliability |
| **Conflict resolution** | Merge policy, Precedence | Choosing between overlapping corrections |
| **Rollback** | Undo, Revert | Canceling corrections when caret moves |
| **Caret safety** | Caret guard, Forward protection | Never editing at or after the caret |

### Visual & UX

| ✅ **USE THIS** | ❌ **NOT THIS** | **Definition** |
|-----------------|----------------|----------------|
| **Dot matrix wave** | Swap animation, Letter animation | The visual effect for corrections |
| **Reduced motion** | No animation, Static mode | Accessibility mode with instant changes |
| **Status indicator** | Icon, Badge | Menu bar or UI element showing state |

## Technical Architecture

| ✅ **USE THIS** | ❌ **NOT THIS** | **Definition** |
|-----------------|----------------|----------------|
| **Rust core** | Engine, Orchestrator, Pipeline | The Rust correction implementation |
| **Platform UI** | Host, Client, Frontend | JavaScript or Swift UI layer |
| **FFI bridge** | Bindings, Interface | Foreign Function Interface for native platforms |
| **WASM module** | Web assembly, Browser module | WebAssembly build for web platform |

### Language Model (Optional)

| ✅ **USE THIS** | ❌ **NOT THIS** | **Definition** |
|-----------------|----------------|----------------|
| **Local LM** | On-device model, Offline model | Language model running locally |
| **LM adapter** | Model interface, AI connector | Interface to language model |
| **Token** | Chunk, Piece | Unit of text from language model |
