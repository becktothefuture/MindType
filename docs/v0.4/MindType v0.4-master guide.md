<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  M I N D T Y P E   v 0 . 4   M A S T E R  ░░░░░  ║
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
    • WHAT ▸ Comprehensive guide to MindType v0.4 architecture and behavior
    • WHY  ▸ Provide clear understanding for developers and stakeholders
    • HOW  ▸ Structured documentation with examples and implementation details
-->

# MindType v0.4 — Master Guide

## Executive Summary

**What MindType Does**

MindType watches you type, quietly cleans up what you meant, and only changes the document when it's sure. You keep your flow. The tool smooths your rushed keystrokes into readable sentences in the background. It stages suggested edits, scores them for confidence, and applies only the winners. When it changes text, it does so without moving your cursor or polluting your undo.

### Example in One Glance

- **You type:** `helloo thr weathfr has beenb hood`
- **MindType suggests and commits:** `Hello, the weather has been good.`

- **You type:** `das fsdhge ovjvpsfdbjvdsi`  
  → MindType detects low fidelity and leaves it alone.

- **You type:** `i willl meet yuo at 5pm`
- **MindType suggests and commits:** `I will meet you at 5pm.`

- **You type:** `The quick brown fox jumps over the lazy dog`
- **MindType suggests and commits:** `The quick brown fox jumps over the lazy dog`  
  _(No changes needed; MindType leaves correct text untouched.)_

- **You type:** `i cant beleive its not butter`
- **MindType suggests and commits:** `I can't believe it's not butter.`

---

## High-Level Idea (Plain Language)

- You type fast and roughly. MindType turns fuzzy keystrokes into clear words.
- It does this in small, local steps that are cheap to compute first, then bigger repairs only when useful.
- It never rewrites text under your caret or adds changes you didn't intend, because every edit needs to pass a confidence check.

Think of it as a patient editor that sits behind your shoulder: fixes tiny slips immediately, rearranges sentences when there's enough context, and only applies changes that improve clarity.

---

## What Happens As You Type — Step by Step (Non-Technical)

1. **UI Registration:** The UI registers your keystrokes.
2. **Boundary Detection:** A small monitor notices boundaries (spaces, punctuation, caret moves).
3. **Scheduling:** A scheduler decides which worker to run and when.
4. **Proposal Generation:** Workers propose edits; those proposals live in a staging area.
5. **Confidence Scoring:** A confidence check scores proposals.
6. **Selective Application:** Only high-scoring proposals are merged into the live text.
7. **Validation Marking:** Merged spans are marked validated and skipped next time.

---

## The Parts, Explained with Human Analogies

### Frontend: The Surface You See

- **UI Renderer:** The text box. It displays text and accepts input.
- **Caret Monitor:** Like an attentive stenographer. It sees each key, backspace, arrow move, and IME session and emits simple signals such as "word finished" or "user paused."
- **Scheduler:** The editor's calendar. It decides if a small fix should run now or a deeper pass should wait until you pause.

**Why this matters:** The UI must stay snappy. The monitor and scheduler ensure heavy work runs off the main path.

### Platform Bindings: The Courier Between UI and Engine

- **Swift / ObjC** on Apple
- **WASM + Worker** on web

They pack a small payload (the active region text and caret) and hand it to the shared Rust core. Then they return proposals and timing hints. They keep the UI thread free and handle platform details.

### Rust Core: The Trusted Editor Brain

- **🧹 Noise (Stage 1):** Turns noisy keystrokes into the words most likely intended. Uses keyboard-proximity priors, word-frequency priors, and Damerau–Levenshtein edits to fix typos, repeats, out‑of‑order keys, and basic spacing. Outputs plausible, correctly spelled tokens. No grammar.

- **📚 Context (Stage 2):** Reads the current sentence with a ±2 sentence look‑around (weight S±1=1.0, S±2=0.5) and corrects grammar, syntax, and semantics. Applies punctuation, capitalization, spacing, and stylistic polish. Ensures sentence flow and cross‑sentence coherence (agreement, tense, consistent naming/synonyms). Never edits at/after the caret.

- **🎨 Tone (Stage 3):** Detects the document’s baseline tone, then normalizes or nudges it toward the selected tone (None/pass‑through, Casual, Professional). May change wording, grammar, and punctuation when needed to achieve tone and maintain clarity. Never edits at/after the caret. If tone is “None,” pass through Context output unchanged.

#### Context Window & Lookaround

- Window: Current sentence plus up to ±2 neighboring sentences (if available), weighted S±1=1.0, S±2=0.5.
- Lookahead gate: The model may peek into the next sentence only after a sentence boundary is observed; still never edits at/after the caret.
- Minimal‑diff policy: Prefer the smallest viable edit that satisfies agreement, coherence, and clarity.

- **Staging Buffer:** Holds proposals until a decision is reached. No half-applied edits leak to the screen.
- **Confidence Gate:** Scores proposals on multiple axes; only high-score items proceed.
- **Diff/Merge Gate:** Applies approved edits atomically and caret-safely (and keeps them out of the user undo stack).

**Why Rust core:** Same behavior everywhere, high performance, deterministic diffs.

---

## How the Tool Decides — The Confidence Gate (Plain)

Every proposal gets a score built from:

- **Input fidelity** — How wordlike the raw keystrokes are (low for random hammering)
- **Transformation quality** — How probable the suggested correction is according to the LM
- **Context coherence** — Whether the suggestion fits surrounding sentences
- **Temporal decay** — Older proposals lose weight if they linger

### Parameters You Should Know

- **τ_input** (default 0.65) — Minimum fidelity to attempt a context pass
- **τ_commit** (default 0.90) — Minimum combined score to commit a change
- **τ_tone** (default 0.85) — Tone proposals must meet τ_tone AND τ_commit to apply.

If a candidate scores below τ_commit, it stays staged until more context improves it or it is discarded.

• Tone staging: Tone proposals commit only when τ_tone ≥ 0.85 AND τ_commit. Tone proposals are not rolled back on caret movement; they remain bounded to behind‑caret edits.

---

## Concrete Examples (To Build Intuition)

### 🧹➡️📚➡️🎨 Complete Pipeline Flow

**Example 1: Typical Typing Correction**

- **Raw Input:** `helloo thr weathfr has beenb hood`
- **🧹 Noise Stage:** `hello the weather has been good` (fixes typos, no grammar)
- **📚 Context Stage:** `Hello, the weather has been good.` (adds punctuation, capitalization)
- **🎨 Tone Stage:** With "Professional" tone → `The weather has been quite favorable.` (may change wording/grammar/punctuation when needed for clarity and tone)

**Example 2: Context-Aware Correction**

- **Raw Input:** `Me tall gear so lit` (in gaming document)
- **🧹 Noise Stage:** `Me tall gear so lit` (no obvious typos detected)
- **📚 Context Stage:** `Metal Gear Solid` (semantic understanding + context)
- **🎨 Tone Stage:** With "Casual" tone → `Metal Gear Solid` (no change needed)

**Example 3: Low-Quality Input Protection**

- **Raw Input:** `das fsdhge ovjvpsfdbjvdsi` (random mashing)
- **🧹 Noise Stage:** Detects very low input fidelity → skip all processing
- **Result:** No changes applied (preserves user intent)

**Example 4: Tone Toggle Demonstration**

- **Context Output:** `I think this approach works well.`
- **🎨 Tone Stage (Professional):** `This approach demonstrates considerable effectiveness.`
- **🎨 Tone Stage (Casual):** `I really think this approach works great!`
- **🎛️ Toggle OFF mid‑process:** In‑flight Tone proposals finish; no new Tone proposals created afterward.

**Example 5: None (pass‑through) Tone**

- **Context Output:** `We will review your application tomorrow.`
- **🎨 Tone Stage (None/pass‑through):** `We will review your application tomorrow.` (unchanged)

**Example 6: Low Compute Tier (CPU)**

- **Scope:** Tone analyzes last N sentences (N=10 on CPU)
- **Effect:** Subtle tone adjustments are limited to the most recent 10 sentences

**Example 7: English‑Only Gating**

- **Raw Input (Spanish):** `hola espero que estes bien`
- **🧹 Noise Stage:** Basic typo fixes only
- **📚 Context/Tone:** Skipped (non‑English detected)

---

## User Experience Rules and Safety

- **Caret-safe:** Never edit at or after the caret. You never lose your place.
- **Undo isolation:** System edits are not added to the user undo stack. We keep an internal log so the system can undo its own changes if later context invalidates them.
- **Secure fields:** Detection blocks transforms (passwords, etc.).
- **Reduced-motion / accessibility:** UI changes are minimal and announced via a11y hooks when needed.

---

## 🎨 Tone Control System (v0.4 Enhancement)

### **Tone Control System**

- **Tone options**: None (pass‑through), Casual, Professional. Rename all references to “Neutral” → “None (pass‑through)”.
- **Detection**: Use an LM classifier to produce a baseline tone assessment over the entire document (internally represented as a tone vector for future use).
- **Gating**: τ_tone = 0.85. Tone proposals must meet τ_tone AND the global τ_commit to apply.
- **Scope**: On CPU tiers analyze up to the last 10 sentences; on higher tiers up to 20. For very short texts (<6 words), Tone still applies.
- **Toggle behavior**: If the user turns Tone OFF mid‑process, finish applying in‑flight Tone proposals; stop creating new Tone proposals for subsequent typing.
- **Caret movement**: Do not rollback Tone proposals simply because the caret moved; still never edit at/after the caret.
- **Global consistency**: Tone aims for document‑wide consistency; prioritize minimal‑diff rewrites that achieve the tone target without harming meaning.

#### Language Detection & English‑Only Operation

- Full pipeline (📚 Context and 🎨 Tone) runs only when language detection indicates English. Otherwise, run 🧹 Noise only and skip Context/Tone (future multilingual support).

---

## 🚀 Performance and Tuning (Practical Notes)

- **Default active region:** ~5 words. Shrink that on constrained devices.
- **Default context interval:** 1000 ms. Shorter intervals = quicker fixes but heavier CPU.
- **LM load strategy:** Lazy-load and cache; unload on memory pressure.

## 🖥️ Platform Implementation Guide

### 🌍 Web Platform (Primary - Fully Implemented)

#### Architecture Overview

- **Entry Point**: `web-demo/src/App.tsx` → `boot()` from `index.ts`
- **Event Handling**: DOM events → `caretShim.ts` → TypeScript pipeline
- **LM Integration**: Transformers.js with WebGPU → WASM → CPU fallback
- **Asset Management**: Local-only by default, graceful degradation

#### Implementation Details

```typescript
// Web Demo Integration (web-demo/src/App.tsx)
const [pipeline] = useState(() =>
  boot({
    security: {
      isSecure: () => secureRef.current,
      isIMEComposing: () => imeRef.current,
    },
  }),
);

// LM Integration with device tier detection
const adapter = createTransformersAdapter(runner);
const capabilities = adapter.init({ preferBackend: 'webgpu' });
// Auto-degrades: WebGPU → WASM → CPU with appropriate token limits
// Demo default: LM enabled by default for Context/Tone; Noise works without LM
```

#### Visual Feedback System

- **Active Region**: `mindtype:activeRegion` events → CSS highlighting
- **Corrections**: `mindtype:highlight` events → mechanical swap animation
- **Accessibility**: Live region announcements via `ui/liveRegion.ts`
- **Reduced Motion**: Instant swaps when `prefers-reduced-motion: reduce`

#### Performance Characteristics

- **WebGPU**: 48 tokens, 160ms cooldown, ~15ms p95 latency
- **WASM**: 24 tokens, 240ms cooldown, ~30ms p95 latency
- **CPU**: 16 tokens, 400ms cooldown, ~100ms p95 latency

---

### 🍎 macOS Platform (Secondary - Needs Implementation)

#### Required Architecture

- **Entry Point**: Swift app with `NSStatusItem` menu bar presence
- **Event Handling**: Accessibility API → Swift wrapper → FFI → Rust core
- **LM Integration**: Same Rust core, shared model assets via FFI
- **Permissions**: AX permissions with user onboarding flow

#### Implementation Plan

```swift
// macOS App Structure (need to create)
class MindTypeApp: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem?
    var coreEngine: UnsafeMutableRawPointer? // FFI handle to Rust core

    func applicationDidFinishLaunching() {
        setupStatusItem()
        requestAccessibilityPermissions()
        initializeCore()
    }

    func initializeCore() {
        // FFI calls to Rust core
        coreEngine = mindtype_core_create()
        mindtype_core_start(coreEngine)
    }
}

// AX Event Monitoring
class AccessibilityMonitor {
    func startMonitoring() {
        let observer = AXObserverCreate(getpid()) { observer, element, notification in
            handleAccessibilityEvent(element, notification)
        }

        AXObserverAddNotification(observer, focusedElement,
                                 kAXValueChangedNotification, nil)
        AXObserverAddNotification(observer, focusedElement,
                                 kAXSelectedTextChangedNotification, nil)
    }

    func handleAccessibilityEvent(_ element: AXUIElement, _ notification: CFString) {
        guard let text = getTextFromElement(element),
              let caret = getCaretPosition(element) else { return }

        // Forward to Rust core via FFI
        mindtype_core_ingest(coreEngine, text, caret, getCurrentTimeMs())
    }
}
```

#### Visual Feedback System (macOS)

- **Active Region**: Overlay window with subtle underline/highlight
- **Corrections**: AX insertion API preserving caret position
- **Accessibility**: Native VoiceOver integration
- **System Integration**: Respect system reduced motion, high contrast

#### Required Files to Create

```
macOS/
├── MindType/
│   ├── App.swift                    # Main app + status item
│   ├── AccessibilityMonitor.swift   # AX API integration
│   ├── CoreBridge.swift             # FFI wrapper
│   ├── OverlayWindow.swift          # Visual feedback
│   ├── PreferencesView.swift        # Settings UI
│   └── Permissions.swift            # AX permission flow
├── Info.plist                      # AX usage description
└── Package.swift                   # Swift Package Manager
```

#### Performance Targets

- **M-series**: p95 ≤ 15ms, typical ≤ 150MB memory
- **Intel**: p95 ≤ 30ms, cap ≤ 200MB memory
- **Background Processing**: Core logic in background queues
- **Main Thread**: Only UI updates and AX calls

---

### 📱 iOS Platform (Future - Design Only)

#### Architecture Sketch

- **Entry Point**: UIKit/SwiftUI app with keyboard extension
- **Event Handling**: `UITextInput` protocol → Swift wrapper → shared Rust core
- **LM Integration**: Same core, optimized for mobile constraints
- **Permissions**: Keyboard access, local processing emphasis

#### Key Considerations

- **Memory Constraints**: Aggressive model quantization, smaller context windows
- **Battery Impact**: Longer cooldowns, CPU-only inference
- **Keyboard Extension**: Limited API surface, careful state management
- **App Store Review**: Privacy policy, local processing emphasis

_Note: iOS implementation deferred until macOS + Web are solid_

---

### 🔧 Cross-Platform Development Strategy

#### Shared Components (Rust Core)

- **Text Processing**: Unicode handling, caret safety, diff generation
- **LM Integration**: Model loading, inference, streaming
- **Confidence System**: Scoring algorithms, staging buffer
- **Business Logic**: All transformation rules and policies

#### Platform-Specific Components

- **Event Capture**: DOM events vs AX API vs UITextInput
- **Visual Feedback**: CSS animations vs overlay windows vs keyboard UI
- **Asset Management**: Web workers vs app bundles vs keyboard extensions
- **Permissions**: Web security vs AX permissions vs keyboard access

#### Development Workflow

1. **Develop in Web**: Fastest iteration, comprehensive debugging
2. **Validate in macOS**: Real-world usage, performance profiling
3. **Optimize for iOS**: Memory/battery constraints, submission process

---

## 📋 Comprehensive v0.3 → v0.4 Migration Checklist

### 🔴 Critical Missing Components (Must Create)

#### 1. Context Transformer (High Priority)

- [ ] **Create** `engines/contextTransformer.ts`
  - **Function**: Grammar, syntax, semantics, AND stylistic polish (moved from Tone)
  - **Responsibilities**: Punctuation, capitalization, spacing, sentence flow, coherence
  - **Integration**: Hook into `core/diffusionController.ts` after Noise stage
  - **Dependencies**: `core/lm/transformersClient.ts` (ready), `core/lm/mergePolicy.ts` (ready)
  - **Tests**: Create `tests/contextTransformer.spec.ts`

#### 2. Tone Transformer (High Priority)

- [ ] **Create** `engines/toneTransformer.ts`
  - **Function**: ONLY tone adjustments - no grammar/punctuation changes
  - **Responsibilities**: Rewrite for tone consistency (neutral, friendly, professional, etc.)
  - **Context Analysis**: Analyze entire text field for consistent tone
  - **Toggle Control**: Implement ON/OFF toggle (default ON)
  - **Integration**: Final stage after Context commits
  - **Tests**: Create `tests/toneTransformer.spec.ts`

#### 3. Confidence Gating System (Critical)

- [ ] **Create** `core/confidenceGate.ts`
  - **Implementation**: Mathematical scoring algorithms from spec above
  - **Functions**: `computeInputFidelity()`, `computeConfidence()`, `applyThresholds()`
  - **Integration**: Hook into staging buffer decision logic
  - **Tests**: Create `tests/confidenceGate.spec.ts`

#### 4. Staging Buffer State Machine (Critical)

- [ ] **Create** `core/stagingBuffer.ts`
  - **Implementation**: HOLD/COMMIT/DISCARD/ROLLBACK state transitions
  - **Integration**: Replace simple proposal system in `core/diffusionController.ts`
  - **Memory Management**: Cleanup stale proposals, temporal decay
  - **Tests**: Create `tests/stagingBuffer.spec.ts`

#### 5. Undo Isolation System (Medium Priority)

- [ ] **Create** `core/undoIsolation.ts`
  - **Function**: Time-bucketed system edits separate from user undo
  - **Integration**: Hook into `utils/diff.ts` application layer
  - **Buckets**: 100-200ms grouping, rollback API
  - **Tests**: Create `tests/undoIsolation.spec.ts`

### 🟡 Enhancements to Existing Components

#### Core Pipeline Modifications

- [ ] **Enhance** `core/diffusionController.ts`
  - Add three-stage pipeline: Noise → Context → Tone
  - Integrate confidence gating before applying edits
  - Replace simple frontier tracking with staging buffer
  - Add rollback triggers when caret enters active region

- [ ] **Enhance** `core/sweepScheduler.ts`
  - Add Context transformer scheduling on pause detection
  - Add Tone transformer scheduling after Context commits
  - Integrate with confidence system for adaptive timing
  - Add memory pressure monitoring for LM degradation

- [ ] **Complete** `core/tapestry.ts`
  - Wire confidence scores into span metadata
  - Add span merging/splitting logic for overlapping edits
  - Implement validated span tracking and skipping
  - Add query methods for confidence-based decisions

#### LM Integration Completions

- [ ] **Complete** `core/lm/factory.ts`
  - Finish `createDefaultLMAdapter()` implementation
  - Add device tier detection and auto-configuration
  - Wire asset verification and fallback logic
  - Add memory monitoring and degradation triggers

- [ ] **Enhance** `core/lm/mergePolicy.ts`
  - Add conflict resolution between rule and LM proposals
  - Implement precedence logic: rules > LM on structure, LM > rules on semantics
  - Add streaming merge cancellation on caret entry
  - Enhance boundary detection for safer merges

#### UI and Visual Feedback

- [ ] **Enhance** `ui/swapRenderer.ts`
  - Complete mechanical swap animation implementation
  - Add braille marker ('⠿') option at swap sites
  - Ensure reduced-motion compliance (instant swaps)
  - Add timing coordination with confidence system

- [ ] **Enhance** `ui/highlighter.ts`
  - Add confidence-aware visual feedback
  - Implement staging buffer state visualization (optional)
  - Add debug overlays for development mode
  - Ensure cross-browser compatibility

### 🔵 Platform-Specific Tasks

#### Web Demo Enhancements

- [ ] **Enhance** `web-demo/src/App.tsx`
  - Add confidence threshold controls (sliders for τ_input, τ_commit)
  - Add staging buffer state visualization
  - Add three-transformer toggle controls
  - Add performance metrics dashboard

#### macOS Platform Creation

- [ ] **Create** macOS app structure
  - Swift app with NSStatusItem menu bar presence
  - Accessibility API integration for text monitoring
  - FFI bridge to shared Rust core
  - Overlay window system for visual feedback
  - Preferences UI for confidence and behavior settings

### 🟢 Testing and Quality Assurance

#### New Test Suites Required

- [ ] **Context Transformer Tests**
  - Sentence repair accuracy with various LM backends
  - Confidence scoring with different input quality levels
  - Integration with staging buffer and rollback system

- [ ] **Confidence System Tests**
  - Mathematical accuracy of scoring algorithms
  - Threshold behavior across different scenarios
  - Temporal decay and cleanup mechanisms

- [ ] **Three-Stage Pipeline Tests**
  - End-to-end flow: Noise → Context → Tone
  - Conflict resolution between transformer outputs
  - Performance under various device tiers

- [ ] **Platform Integration Tests**
  - Web demo with full three-stage pipeline
  - Cross-browser compatibility (Safari, Chrome, Firefox)
  - Accessibility compliance (screen readers, reduced motion)

#### Enhanced Existing Tests

- [ ] **Update** `tests/diffusionController*.spec.ts`
  - Add three-stage pipeline scenarios
  - Add confidence gating test cases
  - Add staging buffer integration tests

- [ ] **Update** `tests/lm_*.spec.ts`
  - Add Context transformer integration
  - Add conflict resolution scenarios
  - Add rollback and cancellation tests

### 🟣 Documentation Updates

#### Technical Documentation

- [ ] **Update** `docs/PRD.md`
  - Add three-transformer specification
  - Add confidence system requirements
  - Update platform implementation details

- [ ] **Update** `docs/implementation.md`
  - Mark v0.4 tasks as completed
  - Add new task tracking for ongoing work
  - Update quality gates and definition of done

- [ ] **Create** `docs/guide/reference/confidence-system.md`
  - Mathematical specification of scoring algorithms
  - Threshold tuning guidelines
  - Performance impact analysis

- [ ] **Create** `docs/guide/reference/three-stage-pipeline.md`
  - Detailed transformer interaction patterns
  - Conflict resolution policies
  - Performance optimization strategies

### 🎯 Priority Order for Implementation

**Phase 1: Foundation — Clean Pipeline (Weeks 1-2)**

1. **🧹 Enhance Noise Transformer**: Focus purely on keystroke cleaning, remove grammar logic
2. **📚 Create Context Transformer**: Move stylistic polish from Tone stage, add comprehensive grammar/semantic corrections
3. **⚖️ Confidence Gating**: Mathematical scoring system
4. **📦 Staging Buffer**: State machine with HOLD/COMMIT/DISCARD logic

**Phase 2: Tone Intelligence (Weeks 3-4)**

1. **🎨 Create Tone Transformer**: Pure tone adjustments, document-wide analysis
2. **🎯 Toggle Control System**: ON/OFF with multiple tone options
3. **🔄 Undo Isolation**: Time-bucketed system edits
4. **🎨 Enhanced Visual Feedback**: Mechanical swaps with tone indicators

**Phase 3: Platform & Polish (Weeks 5-6)**

1. **🍎 macOS Integration**: Platform bindings and native UI
2. **🧠 Cross-Platform Testing**: Consistency across devices
3. **⚡ Performance Optimization**: Device-tier tone processing
4. **📚 Documentation**: Complete implementation guides

### 🚨 Breaking Changes and Migration Notes

- **API Changes**: `DiffusionController` signature will change to accept transformer pipeline
- **Event Changes**: New events for staging buffer state transitions
- **Config Changes**: New threshold parameters in `defaultThresholds.ts`
- **Test Changes**: Many existing tests will need updates for three-stage pipeline

### 🎯 Success Criteria

**Functional**:

- [ ] Three transformers working in sequence with confidence gating
- [ ] Staging buffer handling concurrent proposals correctly
- [ ] Rollback system preserving caret safety under all conditions
- [ ] Web demo showcasing full v0.4 functionality

**Performance**:

- [ ] p95 latency targets met: ≤15ms (WebGPU), ≤30ms (WASM), ≤60ms (CPU)
- [ ] Memory usage within bounds: typical ≤150MB, cap ≤200MB
- [ ] Confidence system adds <5ms overhead per proposal

**Quality**:

- [ ] All existing tests passing with new pipeline
- [ ] New test coverage ≥90% for new components
- [ ] Cross-browser compatibility maintained
- [ ] Accessibility compliance verified

---

## 🎥 Enhanced User Experience Storyboard (v0.4)

### Scenario: "helloo thr weathfr has beenb hood"

**Frame 1: Initial Typing**

- User types rapidly: `helloo thr weathfr`
- **TypingMonitor** captures each keystroke with timestamps
- **Active region** (3-5 words) trails behind caret with subtle highlight
- **Security check** passes (not in password field, no IME composition)

**Frame 2: Word Boundary Detection**

- User hits space after `weathfr`
- **Noise Transformer** (Stage 1) immediately triggers
- **Rule engine** detects `helloo → hello`, `thr → the`, `weathfr → weather`
- **Proposals** enter staging buffer with high confidence (rule-based)

**Frame 3: Continued Typing**

- User continues: `has beenb hood`
- **Staged proposals** remain in buffer (HOLD state)
- **New typos** detected: `beenb → been`
- **Active region** expands to include new content

**Frame 4: Pause Detection**

- User pauses (500ms+ idle time)
- **Input fidelity** calculated: 0.72 (above τ_input = 0.65)
- **Context Transformer** (Stage 2) engages with full sentence
- **LM streaming** begins: local Qwen2.5 processes context

**Frame 5: Context Processing**

- **📚 Context analysis**: "weather" + "has been" + "good" = coherent sentence
- **Grammar & Style**: Adds punctuation, capitalization, spacing polish
- **Context proposal**: `Hello, the weather has been good.`
- **Confidence scoring**:
  - Input fidelity: 0.72
  - Transformation quality: 0.91 (high context score)
  - Context coherence: 0.93 (perfect fit)
  - Temporal decay: 1.0 (fresh)
  - **Combined: 0.92** (above τ_commit = 0.90)

**Frame 6: Tone Processing (If Enabled)**

- **🎨 Tone Transformer** detects baseline tone and plans minimal‑diff adjustments
- **Baseline tone**: None (pass‑through) detected across document
- **User setting**: "Professional" tone selected
- **Tone proposal**: `The weather conditions have been favorable.` (may adjust wording/grammar/punctuation to achieve tone)
- **Tone confidence**: 0.89 (≥ τ_tone = 0.85)

**Frame 7: Commit Decision**

- **Score ≥ τ_commit** → staging buffer state changes to COMMIT
- **Diff/Merge Gate** applies edit atomically
- **Caret safety** verified: all changes behind cursor
- **Undo isolation**: system edit bypasses user undo stack

**Frame 8: Visual Feedback**

- **Mechanical swap** animation shows letter-by-letter replacement
- **Braille marker** ('⠿') briefly appears at correction sites
- **Screen reader** announces: "text updated behind cursor"
- **Reduced motion**: instant replacement if user prefers

**Frame 9: Validation and Cleanup**

- **Active region** (formerly “tapestry”) marks corrected spans as validated
- **Active region** advances past corrected text
- **Staging buffer** clears committed proposals
- **Performance metrics** updated: latency, confidence scores

**Frame 10: Continued Flow**

- User resumes typing new content
- **Validated spans** skipped by future processing
- **System adapts**: device tier affects timing and token limits
- **Memory monitoring**: auto-degrade if approaching limits

### 🎯 Key v0.4 Improvements Demonstrated

1. **🧹➡️📚➡️🎨 Refined Three-Stage Pipeline**:
   - **Noise**: Pure keystroke cleaning (typos, spacing)
   - **Context**: Comprehensive grammar, style, and semantic corrections
   - **Tone**: Intelligent tone consistency without altering meaning

2. **🎨 Smart Tone Control**:
   - Document-wide tone analysis and consistency enforcement
   - Toggle control with multiple tone options
   - Meaning-preserving tone adjustments only

3. **⚖️ Enhanced Confidence Gating**: Mathematical scoring prevents low-quality changes
4. **📦 Intelligent Staging Buffer**: Proposals can be held, improved, or discarded
5. **🧠 Advanced LM Integration**: Local model provides semantic understanding
6. **🎨 Polished Visual Feedback**: Mechanical swaps with accessibility compliance
7. **⚡ Adaptive Performance**: Device-aware resource management

### 🔄 Error Recovery Scenarios

**Scenario A: Caret Enters Active Region**

- User clicks/moves cursor into area being processed
- **Rollback trigger** fires immediately
- **Staging buffer** transitions proposals to ROLLBACK state
- **Partial changes** reverted atomically
- **Processing cancels** gracefully, no corruption

**Scenario B: Low Confidence Input**

- User types: `das fsdhge ovjvpsfdbjvdsi` (random mashing)
- **Input fidelity**: 0.12 (well below τ_input = 0.65)
- **Context Transformer** skipped entirely
- **Only Noise** attempts basic cleanup, finds nothing
- **System stays silent**, preserves user intent

**Scenario C: LM Failure/Timeout**

- **WebGPU unavailable** or model loading fails
- **Auto-degradation**: falls back to WASM backend
- **Asset verification** fails → rules-only mode
- **User experience** continues uninterrupted
- **Debug panel** shows fallback status

**Scenario D: Memory Pressure**

- **System memory** approaching 200MB limit
- **LM adapter** auto-reduces token limits
- **Cooldown periods** extended to reduce load
- **Graceful degradation** to simpler processing
- **Performance dashboard** reflects current tier

---

## 🎆 Implementation Roadmap & Next Steps

### 📋 Immediate Actions (This Sprint)

1. **Review and Validate This Guide**
   - Ensure all technical specifications align with project vision
   - Verify code location references are accurate
   - Confirm priority ordering matches business needs

2. **Set Up Development Environment**
   - Run `pnpm test` to establish current baseline (should be green)
   - Review failing tests and document expected behavior changes
   - Set up branch strategy for v0.4 development

3. **Begin Core Component Development**
   - Start with Context Transformer (highest impact)
   - Create confidence gating mathematical implementation
   - Build staging buffer state machine

### 🕰️ Development Timeline Estimate

**Week 1-2: Foundation**

- Context Transformer creation and basic LM integration
- Confidence scoring algorithms implementation
- Basic staging buffer with HOLD/COMMIT states

**Week 3-4: Integration**

- Three-stage pipeline wiring in DiffusionController
- Enhanced visual feedback with mechanical swaps
- Comprehensive testing of core functionality

**Week 5-6: Polish & Platform**

- Tone Transformer and full pipeline completion
- macOS app development start
- Performance optimization and device tier tuning

**Week 7-8: Quality & Launch**

- Cross-platform testing and bug fixes
- Documentation completion
- Demo scenarios and user validation

### 📊 Success Metrics

**Technical Metrics**:

- All existing tests pass with new pipeline
- New test coverage ≥ 90% for v0.4 components
- Performance targets met across device tiers
- Memory usage within specified bounds

**User Experience Metrics**:

- Correction accuracy improvement over v0.3 baseline
- Reduced false positive rate (undo frequency)
- Accessibility compliance maintained
- Cross-browser compatibility verified

**Business Metrics**:

- Web demo showcases full v0.4 functionality
- macOS app reaches alpha state
- Documentation enables external contributors
- Architecture supports future enhancements

### 🎯 Final Note — What to Expect in Day-to-Day Use

**MindType v0.4** should feel like an intelligent, patient editor that understands context:

- **Immediate Typo Fixes**: Simple errors like `teh → the` correct instantly as you type
- **Thoughtful Sentence Repair**: Waits for context before suggesting larger changes
- **Confident Decision Making**: Only applies changes when mathematically confident
- **Respectful of Intent**: Preserves meaning while improving clarity
- **Adaptive Performance**: Matches your device capabilities and typing rhythm
- **Accessible by Default**: Works with screen readers, respects reduced motion
- **Private and Local**: Processing stays on your device unless you opt-in otherwise

The three-stage pipeline (Noise → Context → Tone) ensures corrections flow naturally from quick fixes to thoughtful improvements. The confidence gating prevents surprises, while the staging buffer allows the system to "think" before acting.

**Customization**: Adjust τ_commit threshold for more/less aggressive corrections. Tune active region size for your preferred processing window. Enable debug mode to understand the system's decision-making process.

**Safety Guarantees**: Your caret position is sacred — never modified. System edits stay separate from your undo history. Secure fields and IME composition are automatically detected and bypassed.

This guide serves as the definitive blueprint for building MindType v0.4. Every component, algorithm, and interaction pattern has been specified to enable precise, confident implementation. 🚀

---

## 🔗 Related Documentation

**Core References**:

- [`docs/PRD.md`](PRD.md) - Product requirements and success criteria
- [`docs/implementation.md`](implementation.md) - Current task tracking and quality gates
- [`docs/system_principles.md`](system_principles.md) - Behavioral principles and design philosophy

**Technical Deep-Dives**:

- [`docs/architecture/`](architecture/) - C4 diagrams and system design
- [`docs/adr/`](adr/) - Architecture decision records
- [`docs/guide/reference/`](guide/reference/) - API contracts and implementation guides

**Quality Assurance**:

- [`docs/qa/acceptance/`](qa/acceptance/) - BDD scenarios and test specifications
- [`tests/`](../../tests/) - Comprehensive test suite with coverage reports

**This guide is the definitive v0.4 specification. All implementation should reference back to these detailed requirements and architectural decisions.**

---

## 🏗️ System Architecture

### Visual Architecture Overview

The v0.4 system follows a streaming pipeline architecture with three-stage transformation, confidence gating, and platform-specific bindings:

[See the comprehensive architecture diagram above showing the complete data flow from user input through platform bindings, core pipeline, transformers, confidence gating, and UI feedback]

### 🎯 Implementation Status Matrix

| Component               | Status            | Location                      | v0.4 Ready? |
| ----------------------- | ----------------- | ----------------------------- | ----------- |
| **Core Pipeline**       | ✅ Implemented    | `index.ts` → `core/`          | Yes         |
| **Active Region**       | ✅ Implemented    | `core/diffusionController.ts` | Yes         |
| **Noise Transformer**   | ✅ Implemented    | `engines/noiseTransformer.ts` | Yes         |
| **Context Transformer** | ❌ Missing        | Need to create                | **No**      |
| **Tone Transformer**    | ❌ Missing        | Need to create                | **No**      |
| **Confidence Gating**   | 🔄 Partial        | `core/confidenceGate.ts`/`core/tapestry.ts` planned | **No**      |
| **Staging Buffer**      | 🔄 Partial        | State machine designed        | **No**      |
| **LM Integration**      | ✅ Infrastructure | `core/lm/` complete           | Yes         |
| **Web Demo**            | ✅ Implemented    | `web-demo/` working           | Yes         |
| **macOS Bindings**      | ❌ Missing        | Need Swift/FFI                | **No**      |

### 🔄 Data Flow Architecture (Detailed)

#### 1. Input Layer → Platform Bindings

- **Web**: DOM events → `web-demo/src/caretShim.ts` → WASM bridge
- **macOS**: AX API → Swift wrapper → FFI calls (⚠️ **Missing**)
- **Output**: Normalized `{text, caret, atMs}` events

#### 2. Core Pipeline Orchestration

```typescript
// Implemented in index.ts
TypingMonitor → SweepScheduler → DiffusionController
```

- **TypingMonitor**: Emits typing events, handles debouncing
- **SweepScheduler**: Manages timing, triggers engines based on pause detection
- **DiffusionController**: Word-by-word streaming with Unicode segmentation

#### 3. Three-Stage Transformer Pipeline (v0.4 Design)

**Stage 1: Noise Transformer** ✅ _Implemented_

- **Location**: `engines/noiseTransformer.ts`
- **Function**: Immediate typo fixes (transposition, punctuation, capitalization)
- **Trigger**: Word boundaries during typing
- **Examples**: `teh → the`, `recieve → receive`

**Stage 2: Context Transformer** ❌ _Missing_

- **Location**: Need to create `engines/contextTransformer.ts`
- **Function**: Sentence-level repairs using local LM
- **Trigger**: Pause detection (500ms+) with sufficient input fidelity
- **Examples**: `me tall gear → Metal Gear`, grammar corrections

**Stage 3: Tone Transformer** ❌ _Missing_

- **Location**: Need to create `engines/toneTransformer.ts`
- **Function**: Stylistic polish, punctuation spacing
- **Trigger**: After Context commits, during longer pauses
- **Examples**: Comma placement, quote normalization

#### 4. Confidence Gating System (v0.4 Core Missing)

**Current State**: `core/tapestry.ts` has data structures but no scoring algorithms

**Required Implementation**:

```typescript
interface ConfidenceScore {
  inputFidelity: number; // How "word-like" the input is
  transformationQuality: number; // LM probability score
  contextCoherence: number; // Fits surrounding text
  temporalDecay: number; // Age penalty for stale proposals
  combined: number; // Weighted final score
}

// Thresholds
const τ_input = 0.65; // Minimum to attempt Context pass
const τ_commit = 0.9; // Minimum to apply changes
```

#### 5. Staging Buffer State Machine (v0.4 Core Missing)

**Current State**: Interface exists, state transitions not implemented

**Required States**:

- `HOLD`: Proposal waiting for more context
- `COMMIT`: High confidence, ready to apply
- `DISCARD`: Low confidence or superseded
- `ROLLBACK`: Caret entered active region mid-process

#### 6. Platform-Specific UI Rendering

**Web Implementation** ✅ _Working_

- **Active Region**: `ui/highlighter.ts` → `mindtype:activeRegion` events
- **Corrections**: `ui/swapRenderer.ts` → mechanical letter swap animation
- **Accessibility**: `ui/liveRegion.ts` → screen reader announcements

**macOS Implementation** ❌ _Missing_

- **Active Region**: Overlay window with subtle underline (need to create)
- **Corrections**: AX insertion API with caret preservation (need to create)
- **Accessibility**: Native VoiceOver integration (need to create)

### 🔧 Platform Integration Details

#### Web Platform (Primary) ✅ _Ready_

- **Entry**: `web-demo/src/App.tsx` boots pipeline via `index.ts`
- **LM Integration**: Transformers.js with WebGPU → WASM → CPU fallback
- **Asset Verification**: Local-only by default, graceful degradation
- **Performance**: Device tier detection, token limits, cooldown policies

#### macOS Platform (Secondary) ❌ _Needs Creation_

- **Entry**: Need Swift app with `NSStatusItem` menu bar presence
- **LM Integration**: Same Rust core via FFI, shared model assets
- **Permissions**: Accessibility API permissions with user onboarding
- **UI**: Preferences window, overlay rendering, system integration

### 🎯 Critical v0.4 Gaps

1. **Context & Tone Transformers**: Core functionality missing
2. **Confidence Scoring Algorithms**: Mathematical implementation needed
3. **Staging Buffer State Machine**: Transition logic incomplete
4. **macOS Platform Bindings**: Entire platform layer missing
5. **Undo Isolation**: Time-bucketed system separate from user undo

---

## 🗺️ How to Read the Architecture Diagram

_Think of this as your GPS guide to understanding the MindType system. We'll walk through it like following a path from typing to corrections._

---

## 🎯 **The Big Picture: What Am I Looking At?**

The diagram shows **one complete journey** from "you type a character" to "you see a correction." It's like a factory assembly line, but for text processing.

**The main path goes like this:**

1. 📝 **You type** → 2. ⚡ **System processes** → 3. 🎨 **You see results**

**Think of it as:** Raw typing → Smart fixing → Polished output

---

## 📍 **Start Here: The Input/Output Loop (Top of Diagram)**

### **Left Side: Text Goes IN**

- **① Text Field**: Where you type (like any text box)
- **② Event Capture**: System notices each keystroke
- **③ Pipeline Start**: Your typing enters the processing system

### **Right Side: Corrections Come OUT**

- **⑫ Corrections Ready**: System has suggestions ready
- **⑬ Atomic Update**: Text gets updated safely
- **⑭ Updated Field**: You see the corrected text

**The Loop**: Updated text becomes new input → continuous improvement cycle

---

## 🏗️ **The Middle: Where the Magic Happens**

_This is the "factory floor" where your rough typing gets transformed into polished text._

### **🌐 Platform Layer (How You Connect)**

Think of this as the "entrance" to the system:

- **Web**: Browser-based (what we have now)
- **macOS**: Desktop app (planned for later)

Both send the same info: your text, where your cursor is, and when you typed it.

### **⚡ Core Pipeline (The Assembly Line Manager)**

This is like the factory foreman who coordinates everything:

- **System Entry**: The main control center
- **Input Monitoring**: Watches your typing and checks for security (password fields, etc.)
- **Scheduler**: Decides when to run different types of processing
- **Diffusion Control**: Manages the "active region" (the 3-8 words behind your cursor that get processed)

---

## 🔧 **The Three-Stage Assembly Line (The Heart of the System)**

_This is where your messy typing gets progressively cleaner._

### **🧹 Stage 1: NOISE (Quick Fixes)**

**What it does**: Fixes obvious typos instantly
**When it runs**: Every time you finish a word (hit space)
**Examples**: `teh → the`, `helllo → hello`
**Think of it as**: A spell-checker that works as you type

Note: Noise runs without the Language Model. It is rules‑ and heuristic‑driven and always available, even when the LM is disabled or unavailable.

### **📚 Stage 2: CONTEXT (Smart Grammar)**

**What it does**: Understands meaning and fixes grammar
**When it runs**: When you pause typing (500ms break)
**Examples**: `me tall gear → Metal Gear`, adds punctuation
**Think of it as**: A grammar teacher who understands context
**Status**: _Needs to be built_

### **🎨 Stage 3: TONE (Style Polish)**

**What it does**: Adjusts writing style (casual, professional, etc.)
**When it runs**: After grammar fixes are done
**Examples**: `This works well → This demonstrates effectiveness`
**Think of it as**: A writing coach who matches your desired tone
**Status**: _Needs to be built_

---

## 🧠 **The AI Brain (Language Model)**

_This is what makes Stage 2 and 3 smart._

**What it includes**:

- **LM Factory**: Creates the AI system
- **TransformersClient**: Manages AI requests
- **TransformersRunner**: Runs the actual AI model (Qwen2.5)

**Device Tiers** (automatically detected):

- **WebGPU**: Fastest, best quality
- **WASM**: Good speed, good compatibility
- **CPU**: Slowest, works everywhere

---

## ⚖️ **Quality Control (The Gatekeeper)**

_This decides which suggestions are good enough to show you._

### **Confidence Gate**

Scores every suggestion on:

- How word-like your original typing was
- How good the suggested fix is
- How well it fits the surrounding text
- How old the suggestion is

### **Staging Buffer**

Manages suggestion states:

- 🟡 **HOLD**: Waiting for more info
- 🟢 **COMMIT**: Good enough, apply it
- 🔴 **DISCARD**: Not good enough, throw away
- 🔄 **ROLLBACK**: User moved cursor, undo everything

**Status**: _Both need to be built_

---

## 🧩 **Safe Application (The Final Step)**

_This actually changes your text safely._

### **Active Region (formerly “Tapestry”)**

Keeps track of what's been changed and what hasn't.

### **Diff/Merge Gate**

The actual text-changing function. Super safe:

- Never moves your cursor
- All-or-nothing updates
- Handles special characters correctly

### **Undo Isolation**

Keeps system changes separate from your undo history.
**Status**: _Needs to be built_

---

## 🎨 **Visual Feedback (What You See)**

_This shows you what's happening._

- **UI Highlighter**: Shows the "active region" behind your cursor
- **SwapRenderer**: Animates text changes (the letter-swapping effect)
- **LiveRegion**: Announces changes to screen readers

---

## 🔄 **How to Follow the Arrows**

### **Solid Arrows = Main Flow**

Follow these to see the normal path from typing to corrections.

### **Dotted Arrows = Error Recovery**

These show what happens when something goes wrong (like you move your cursor into the processing area).

---

## 🚦 **What's Built vs What's Not**

### **✅ Working Right Now**

- The input/output loop
- Web platform
- Core pipeline engine
- Stage 1 (Noise) transformer
- AI infrastructure
- Safe text updating
- Visual feedback basics

### **🔄 Partially Built**

- Some AI components
- Some visual effects
- Data tracking

### **❌ Need to Build for v0.4**

- macOS platform
- Stage 2 (Context) transformer
- Stage 3 (Tone) transformer
- Quality control system
- Undo isolation

---

## 🎯 **Key Takeaways**

1. **Most of the time, nothing happens** - 90% of processing results in no changes
2. **Safety first** - Multiple systems ensure your cursor never moves unexpectedly
3. **Progressive enhancement** - Each stage makes the text a little better
4. **Smart timing** - Quick fixes happen immediately, smart fixes wait for pauses
5. **Cross-platform ready** - Same core logic works everywhere

**Bottom line**: The diagram shows a sophisticated but safe system that gradually improves your typing without getting in your way.
