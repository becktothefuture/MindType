<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  S Y S T E M   P R I N C I P L E S  ░░░░░░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Principles that elevate human nature and input
    • WHY  ▸ Align UX + code with MindTyper’s purpose at all times
    • HOW  ▸ Subcategories → principles → behaviours → examples
-->

# MindType System Principles

## Purpose

Transform typing from mechanical skill into **fluid expression of thought**. MindType amplifies human capability through the revolutionary **Correction Marker** system, enabling **thought-speed typing** while preserving authorship, privacy, and flow state.

## Core Philosophy: Cognitive Augmentation

MindType doesn't just correct errors—it **unlocks latent human potential** by removing the cognitive overhead of mechanical accuracy. Users operate at the speed of thought, trusting MindType to handle the translation between rapid human intent and polished communication.

## Revolutionary Principles

### 1. Burst-Pause-Correct Rhythm
**Core Innovation**: Train users in natural typing rhythm where bursts of rapid input are followed by intelligent correction during natural pauses.

**Behavior**: 
- **Burst Phase**: Correction Marker holds position, pulsing in listening mode
- **Pause Recognition**: 500ms trigger activates correction mode
- **Correction Phase**: Marker travels through text, applying refinements
- **Flow Resumption**: Seamless return to burst typing

**Examples**:
- Marcus (Speed Demon): Types "Th defdnt clamd" at 180 WPM → pauses → marker corrects to "The defendant claimed"
- James (Creative): Stream-of-consciousness writing with background refinement
- Priya (Data): Rapid data dialect entry with intelligent expansion

### 2. Correction Marker as Cognitive Partner
**Innovation**: Visual representation of AI intelligence working alongside human creativity.

**Behavior**:
- **Listening Mode**: Hypnotic braille pulse (⠂ → ⠄ → ⠆ → ⠠ → ⠢ → ⠤ → ⠦ → ⠰ → ⠲ → ⠴ → ⠶)
- **Correction Mode**: Purposeful travel with speed adaptation based on processing complexity
- **Processing Indicators**: Different braille patterns for noise/context/tone corrections
- **Accessibility**: High contrast, reduced-motion compliance, screen reader integration

**Examples**:
- Maya (Academic): Marker provides confidence during complex scientific writing
- Dr. Chen (Accessibility): Silent operation with single batch announcements
- Emma (Professional): Invisible enhancement without conscious awareness

### 3. Scenario-Driven Intelligence
**Philosophy**: One size fits none—MindType adapts to specific user contexts and needs.

**Behavior**:
- **Academic Mode**: Scientific terminology, transposition priority, privacy-first
- **Multilingual Mode**: Cross-language error detection, cultural context preservation
- **Velocity Mode**: Phonetic shorthand, trust-based interface, legal terminology
- **Data Mode**: Custom dialect understanding, domain-specific expansion
- **Creative Mode**: Voice preservation, narrative coherence, flow enhancement
- **Professional Mode**: Tone consistency, business terminology, polished output
- **Accessibility Mode**: Screen reader optimization, silent corrections, high contrast

### 4. Caret-Safe Guarantee
**Absolute Rule**: No correction ever occurs at or after the cursor position.

**Behavior**:
- Active region limited to text behind caret (default 20 words)
- If cursor moves into correction zone, correction is immediately cancelled
- Safety validation before every edit operation
- Graceful degradation when safety constraints conflict with corrections

**Examples**:
- All scenarios: Users never experience text changing under their fingers
- Dr. Chen: Screen reader position never disrupted by corrections
- Marcus: High-speed typing never interrupted by safety violations

### 5. Privacy-First Architecture
**Philosophy**: User text is sacred—protect it with on-device processing by default.

**Behavior**:
- Default: All processing happens locally using WebGPU/WASM language models
- Optional: Encrypted remote processing with explicit per-session opt-in
- No user text persistence—only settings and preferences stored
- Secure context detection—disabled in password fields and IME composition

**Examples**:
- Maya: Unpublished research remains completely private
- Carlos: Sensitive business communications never leave device
- All scenarios: Users control their data destiny

## Performance & Reliability Principles

### 6. Device-Tier Adaptive Performance
**Philosophy**: Meet every device where it is—from high-end MacBook Pro to older hardware.

**Behavior**:
- **WebGPU Tier**: 15ms latency, 48 token limit, 60 FPS marker animation
- **WASM Tier**: 25ms latency, 24 token limit, 30 FPS marker animation  
- **CPU Tier**: 30ms latency, 16 token limit, 15 FPS marker animation
- Graceful degradation without feature loss

**Examples**:
- Marcus: Velocity Mode adapts to device capability while maintaining speed
- All scenarios: Consistent experience regardless of hardware

### 7. Fail-Soft Reliability
**Philosophy**: Any error should degrade gracefully, never block the user's typing flow.

**Behavior**:
- Timeouts cancel work and defer until next pause
- Missing local models → rules-only mode with setup guidance
- GPU unavailable → WASM fallback → CPU fallback
- Network errors → local-only operation

**Examples**:
- All scenarios: Users never experience typing interruption due to system failures
- Priya: Data entry continues even if advanced processing fails

## Implementation Impact

These principles directly enable the **Seven Revolutionary Scenarios**:

- **Maya (Academic)**: Privacy-first + scenario-driven intelligence + accessibility
- **Carlos (Multilingual)**: Device adaptation + scenario-driven intelligence + fail-soft reliability
- **Dr. Chen (Accessibility)**: Caret-safe guarantee + privacy-first + accessibility-native design
- **James (Creative)**: Burst-pause-correct rhythm + correction marker partnership + flow preservation
- **Emma (Professional)**: Invisible enhancement + device adaptation + scenario-driven intelligence
- **Marcus (Speed Demon)**: Burst-pause-correct rhythm + velocity mode + trust-based interface
- **Priya (Data Whisperer)**: Custom dialect + scenario-driven intelligence + rapid processing

## Success Measurement

Principles are validated through user transformation:
- **Cognitive Load Reduction**: Users report "typing at the speed of thought"
- **Flow State Enhancement**: 35-50% productivity increases across scenarios
- **Accessibility Excellence**: Full WCAG 2.2 AA compliance with innovative accommodations
- **Privacy Confidence**: On-device processing builds user trust
- **Performance Reliability**: Consistent experience across all device tiers

---

*These principles transform MindType from a typing tool into a cognitive prosthetic—extending human capability at the intersection of thought and text.*

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
