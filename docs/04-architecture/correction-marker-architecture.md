<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  C O R R E C T I O N   M A R K E R   A R C H I T E C T U R E  ║
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
    • WHAT ▸ Complete technical architecture for the revolutionary Correction Marker system
    • WHY  ▸ Enable implementation of visual intelligence and cognitive augmentation
    • HOW  ▸ Two-mode operation with Burst-Pause-Correct methodology
-->

# Correction Marker System Architecture

## Executive Summary

The **Correction Marker** represents a breakthrough in human-computer collaboration—a visual intelligence system that transforms typing from mechanical skill into **fluid expression of thought**. Through **two-mode operation** and **Burst-Pause-Correct methodology**, the marker trains users to achieve **thought-speed typing** while providing revolutionary visual feedback.

## Core Innovation: Two-Mode Operation

### Listening Mode: The Digital Pulse
**Visual Intelligence in Waiting State**

The Correction Marker enters **Listening Mode** during active typing bursts, creating a hypnotic visual pulse that indicates the system is actively monitoring and ready to assist.

#### Visual Specification
```typescript
interface ListeningMode {
  brailleSequence: BrailleSymbol[];     // Animation progression
  pulseSpeed: number;                   // 200ms per symbol
  cycleDuration: number;                // 2.4 seconds complete cycle
  position: 'hold';                     // Marker holds at last correction point
  visualFeedback: 'hypnotic_pulse';     // Mesmerizing rhythm
}

type BrailleSymbol = '⠂' | '⠄' | '⠆' | '⠠' | '⠢' | '⠤' | '⠦' | '⠰' | '⠲' | '⠴' | '⠶';

const LISTENING_SEQUENCE: BrailleSymbol[] = [
  '⠂', '⠄', '⠆', '⠠', '⠢', '⠤', '⠦', '⠰', '⠲', '⠴', '⠶'
];
```

#### Behavioral Characteristics
- **Position Holding**: Marker remains at last correction point
- **Visual Rhythm**: Creates musical timing that enhances typing flow
- **Burst Detection**: Monitors typing speed to detect rapid input (>60 WPM)
- **Anticipation State**: Visual indication that correction is ready when needed

#### Triggering Conditions
- User typing speed exceeds burst threshold (60+ WPM)
- No pause longer than 500ms detected
- Caret position advancing (forward typing motion)
- No security violations (secure fields, IME composition)

### Correction Mode: The Intelligent Worker
**Visual Intelligence in Active State**

When the user pauses (>500ms), the marker transforms into **Correction Mode**—a focused, purposeful traveler that whooshes through text with surgical precision.

#### Visual Specification
```typescript
interface CorrectionMode {
  travelAnimation: 'whoosh_effect';     // Liquid intelligence flow
  speedAdaptation: {
    noise: 50;          // ms per word - simple typos
    context: 150;       // ms per word - grammar/flow
    tone: 300;          // ms per word - style refinement
  };
  processingIndicators: ProcessingPattern[];
  trailEffect: boolean;                 // Ghost symbols following marker
  wakeEffect: boolean;                  // 85% opacity fade on corrected words
}

interface ProcessingPattern {
  type: 'noise' | 'context' | 'tone';
  braillePattern: BrailleSymbol[];
  intensity: 'light' | 'medium' | 'heavy';
}

const PROCESSING_PATTERNS = {
  noise: ['⠁', '⠂', '⠄', '⠈'],        // Simple dot patterns
  context: ['⠃', '⠆', '⠌'],           // Double dot patterns
  tone: ['⠷', '⠿', '⠷']              // Complex patterns
};
```

#### Behavioral Characteristics
- **Acceleration**: Marker accelerates from waiting position toward cursor
- **Speed Adaptation**: Dynamic speed based on processing complexity
- **Trail Effect**: Ghost symbols mark recently processed text
- **Wake Highlighting**: Corrected words briefly highlight with opacity fade
- **Completion Return**: Returns to listening mode when reaching target

#### Triggering Conditions
- User pause detected (>500ms)
- Burst typing session ends
- Correction processing begins
- Target position (cursor location) established

## Burst-Pause-Correct Methodology

### Muscle Memory Training Architecture
**Revolutionary Rhythm Development System**

The **Burst-Pause-Correct** methodology trains users to develop optimal typing patterns through consistent timing and visual feedback.

#### Core Components
```typescript
interface BurstPauseEngine {
  burstDetector: BurstDetector;
  pauseScheduler: PauseScheduler;
  rhythmTrainer: RhythmTrainer;
  muscleMemoryTracker: MuscleMemoryTracker;
}

interface BurstDetector {
  isActive: boolean;
  startTime: number;
  keystrokes: number;
  averageInterval: number;
  currentWPM: number;
  burstThreshold: number;               // Default: 60 WPM
}

interface PauseScheduler {
  pauseDuration: number;
  triggerThreshold: number;             // Default: 500ms
  correctionTrigger: boolean;
  markerAction: 'hold' | 'advance';
  deviceTierAdjustment: number;         // Tier-specific timing
}

interface RhythmTrainer {
  cycleCount: number;
  averageBurstDuration: number;
  averagePauseDuration: number;
  rhythmConsistency: number;            // 0-1 score
  muscleMemoryStrength: number;         // 0-1 score
}
```

#### Training Phases
1. **Burst Phase**: Rapid, uninhibited typing with marker in listening mode
2. **Pause Recognition**: Natural breathing moment triggers mode transition
3. **Correction Anticipation**: Subconscious expectation of refinement
4. **Flow Resumption**: Seamless return to burst typing with enhanced confidence

#### Neuroplasticity Effects
- **Cognitive Load Reduction**: Brain learns to offload spelling/grammar anxiety
- **Flow State Enhancement**: Users report "typing at the speed of thought"
- **Muscle Memory Development**: Unconscious rhythm optimization
- **Trust Building**: Confidence in system enables faster typing

## Visual Experience Architecture

### Whoosh Effect System
**Liquid Intelligence Visualization**

The marker doesn't just move—it **flows** like liquid intelligence through text, creating a revolutionary visual experience.

#### Technical Implementation
```typescript
interface WhooshEffect {
  leadingEdge: {
    symbol: BrailleSymbol;
    brightness: number;                 // 100% intensity
    animation: 'current_processing';
  };
  trailEffect: {
    symbols: BrailleSymbol[];
    opacityFade: number[];             // Decreasing opacity
    length: number;                     // Trail length in characters
  };
  wakeHighlighting: {
    correctedWords: HTMLElement[];
    fadeOpacity: number;               // 85% → 0%
    duration: number;                  // 800ms
  };
}
```

#### Processing Indicators
Different braille patterns indicate the type of processing occurring:

**Noise Corrections** (Simple Patterns):
- `⠁` → `⠂` → `⠄` → `⠈` (single dots)
- **Speed**: 50ms per word
- **Purpose**: Typo fixes, transpositions

**Context Analysis** (Double Patterns):
- `⠃` → `⠆` → `⠌` (double dots)
- **Speed**: 150ms per word
- **Purpose**: Grammar, sentence coherence

**Tone Processing** (Complex Patterns):
- `⠷` → `⠿` → `⠷` (complex patterns)
- **Speed**: 300ms per word
- **Purpose**: Style refinement, tone adjustment

### Accessibility Architecture
**Universal Design for Revolutionary Experience**

The Correction Marker system is designed with accessibility as a core principle, not an afterthought.

#### Screen Reader Integration
```typescript
interface ScreenReaderIntegration {
  announcementStrategy: 'batch';        // Single announcement per correction group
  politenessLevel: 'polite';           // Non-intrusive announcements
  messageContent: string;              // "Text updated behind cursor"
  batchingWindow: number;              // 150ms collection window
  cooldownPeriod: number;              // 500ms between announcements
}
```

#### Reduced Motion Compliance
```typescript
interface ReducedMotionMode {
  staticSymbols: boolean;               // Replace animation with static pulse
  opacityPulse: boolean;               // Subtle opacity changes only
  instantPositionJumps: boolean;       // No travel animation
  contrastEnhancement: boolean;        // Higher contrast for visibility
  simplifiedPatterns: boolean;         // Reduced visual complexity
}
```

#### High Contrast Support
```typescript
interface HighContrastMode {
  markerContrast: number;              // 4.5:1 minimum ratio
  backgroundContrast: number;          // Enhanced visibility
  colorBlindFriendly: boolean;         // Pattern-based differentiation
  customizableSize: {
    min: number;                       // 12px
    max: number;                       // 24px
    default: number;                   // 16px
  };
}
```

## Device Tier Optimization

### Performance Adaptation by Scenario
Different scenarios require different performance characteristics based on user needs and device capabilities.

#### WebGPU Tier (High Performance)
```typescript
interface WebGPUTier {
  latencyTarget: 15;                   // ms
  tokenLimit: 48;                      // Maximum processing tokens
  markerFPS: 60;                       // Smooth animation
  scenarios: ['Marcus', 'Priya'];      // Speed-critical scenarios
}
```

#### WASM Tier (Balanced Performance)
```typescript
interface WASMTier {
  latencyTarget: 25;                   // ms
  tokenLimit: 24;                      // Balanced processing
  markerFPS: 30;                       // Efficient animation
  scenarios: ['Carlos', 'James', 'Emma']; // Professional scenarios
}
```

#### CPU Tier (Graceful Degradation)
```typescript
interface CPUTier {
  latencyTarget: 30;                   // ms
  tokenLimit: 16;                      // Conservative processing
  markerFPS: 15;                       // Basic animation
  scenarios: ['Maya', 'Dr. Chen'];     // Accessibility-focused scenarios
}
```

## Integration Points

### Core System Integration
```typescript
interface CorrectionMarkerIntegration {
  sweepScheduler: {
    onBurstDetected: () => void;        // Enter listening mode
    onPauseDetected: () => void;        // Enter correction mode
    onCorrectionComplete: () => void;   // Return to listening mode
  };
  
  diffusionController: {
    onFrontierAdvance: (position: number) => void;
    onCorrectionApplied: (correction: Correction) => void;
    onProcessingIntensity: (level: ProcessingIntensity) => void;
  };
  
  visualSystem: {
    renderMarker: (state: MarkerState) => void;
    animateTravel: (from: number, to: number) => void;
    showProcessingIndicator: (type: ProcessingType) => void;
  };
}
```

### Event System
```typescript
interface MarkerEvents {
  'marker:modeChange': {
    from: MarkerMode;
    to: MarkerMode;
    trigger: string;
  };
  
  'marker:positionUpdate': {
    position: number;
    targetPosition: number;
    speed: number;
  };
  
  'marker:correctionApplied': {
    start: number;
    end: number;
    type: ProcessingType;
    confidence: number;
  };
}
```

## Success Metrics

### Technical Performance
- **Latency**: Sub-15ms marker response across all scenarios
- **Accuracy**: 95%+ correction accuracy with marker guidance
- **Accessibility**: 100% WCAG 2.2 AA compliance
- **Device Support**: Consistent experience across all device tiers

### User Experience
- **Cognitive Load Reduction**: Users report "typing at the speed of thought"
- **Flow State Enhancement**: 35-50% productivity increases across scenarios
- **Muscle Memory Development**: Unconscious rhythm optimization within hours
- **Trust Building**: Users develop complete confidence in system accuracy

### Scenario-Specific Validation
Each scenario validates the Correction Marker's effectiveness:
- **Maya**: Academic writing confidence with dyslexia support
- **Carlos**: Professional multilingual communication accuracy
- **Dr. Chen**: Accessibility excellence with visual impairment accommodation
- **James**: Creative flow enhancement with voice preservation
- **Emma**: Professional polish without conscious effort
- **Marcus**: Revolutionary speed unlocking through trust interface
- **Priya**: Analytical flow preservation with intelligent formatting

---

*The Correction Marker doesn't just show corrections—it represents AI intelligence working alongside human creativity to unlock the full potential of thought-speed typing.*
