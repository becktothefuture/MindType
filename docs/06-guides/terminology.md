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
    • WHAT ▸ Standardized terminology for MindType
    • WHY  ▸ Consistency across documentation and code
    • HOW  ▸ Use these terms everywhere, no exceptions
-->

# MindType Terminology Guide

This document defines the official terminology for MindType. **Use these terms consistently across all documentation, code, and communications.**

## Revolutionary Concepts

### Product & Revolutionary System

| ✅ **USE THIS** | ❌ **NOT THIS** | **Definition** |
|-----------------|----------------|----------------|
| **MindType** | MindType, MindTyper, MT | The revolutionary cognitive augmentation product |
| **Correction Marker** | Wave, Marker, Indicator | The intelligent visual worker that travels through text |
| **Burst-Pause-Correct** | Pause detection, Rhythm | The revolutionary methodology for muscle memory training |
| **Thought-Speed Typing** | Fast typing, Speed enhancement | Cognitive augmentation enabling typing at neural firing speed |
| **Seven Scenarios** | Use cases, User stories | The revolutionary usage patterns that define our vision |
| **Listening Mode** | Idle mode, Waiting | Correction Marker state with hypnotic braille pulse |
| **Correction Mode** | Active mode, Processing | Marker traveling through text applying corrections |
| **Velocity Mode** | Speed mode, Fast mode | Revolutionary speed enhancement for 180+ WPM typing |
| **Cognitive Augmentation** | AI assistance, Smart typing | Revolutionary enhancement of human capability |
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
| **NoiseWorker** | Typo fix, Basic correction | Basic typos, transpositions, spacing |
| **GrammarWorker** | Punctuation worker | Punctuation, capitalization, simple grammar |
| **ContextWorker** | Semantic worker | Sentence-level coherence improvements |
| **ToneWorker** | Style worker | Formality level changes |

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

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
