<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  D A T A   M O D E L   &   P E R S I S T E N C E  ░░░░░░  ║
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
    • WHAT ▸ Define core entities/relationships and constraints
    • WHY  ▸ Blueprint for persistence and AI reasoning
    • HOW  ▸ Rust-first types; optional persistence adapters later
-->

# Mind⠶Flow Revolutionary Data Model

## 🚀 **Revolutionary Data Architecture**

This document defines the data model for Mind⠶Flow's **revolutionary Correction Marker system** and **Seven Usage Scenarios**. The architecture supports **thought-speed typing** through cognitive augmentation while maintaining absolute privacy (no user text persistence).

## 🎆 **Core Revolutionary Entities**

### **Correction Marker State**
```typescript
interface CorrectionMarker {
  mode: 'listening' | 'correcting' | 'idle';
  position: number;              // Character index in text
  targetPosition: number;        // Where marker needs to travel
  animationState: BrailleSymbol; // Current braille symbol
  processingIntensity: 'light' | 'medium' | 'heavy';
  lastCorrectionTime: number;    // For burst-pause detection
}

type BrailleSymbol = '⠂' | '⠄' | '⠆' | '⠠' | '⠢' | '⠤' | '⠦' | '⠰' | '⠲' | '⠴' | '⠶';
```

### **Burst-Pause-Correct Engine**
```typescript
interface BurstState {
  isActive: boolean;
  startTime: number;
  keystrokes: number;
  averageInterval: number;
  currentWPM: number;
}

interface PauseEvent {
  duration: number;
  triggerCorrection: boolean;
  markerAction: 'hold' | 'advance';
  confidenceThreshold: number;
}
```

### **Seven Scenario Contexts**
```typescript
interface ScenarioContext {
  activeScenario: 'academic' | 'multilingual' | 'accessibility' | 'creative' | 'professional' | 'speed' | 'data';
  domainVocabulary: Map<string, string>;
  confidenceAdjustments: ConfidenceProfile;
  performanceOptimizations: DeviceTierConfig;
}

interface ConfidenceProfile {
  noiseThreshold: number;    // Maya: lower for transpositions
  contextThreshold: number;  // Dr. Chen: higher for silent operation
  speedThreshold: number;    // Marcus: optimized for 180+ WPM
}
```

### Legacy Entities (Enhanced)

- **TypingSnapshot**
  - Keys: `atMs`
  - Fields: `text: string`, `caret: number`, `atMs: number`
  - Constraints: `0 ≤ caret ≤ text.length`

- **ActiveRegion**
  - Keys: implicit by `start,end`
  - Fields: `start: number`, `end: number`, `minWords: number`, `maxWords: number`
  - Constraints: `0 ≤ start ≤ end ≤ text.length`; size up to 20 words; never crosses caret

- **Diff**
  - Keys: implicit by `start,end`
  - Fields: `start: number`, `end: number`, `text: string`
  - Constraints: `end ≥ start`; apply only when `end < caret` (caret-safe)

- **CorrectionResult**
  - Fields: `diff: Diff | null` (NoiseWorker), `diffs: Diff[]` (backfill)
  - Constraints: all diffs respect caret safety and window limits

- **ActiveRegionSpan** (runtime tracking)
  - Fields: `{ original: String, corrected: String, start: usize, end: usize, confidence: f32, applied_at_ms: u64 }`
  - Relationships: spans are ordered, non-overlapping; define the validated neighborhood behind caret

- **Settings**
  - Keys: `profile` (default)
  - Fields: `typingTickMs`, `minRegionWords`, `maxRegionWords`, `reducedMotion`, `localOnly`
  - Constraints: `minRegionWords ≤ maxRegionWords`; clamp ranges to sane defaults

### Relationships

- `TypingSnapshot` → determines `ActiveRegion` window.
- `CorrectionResult` → produces `Diff`(s) within the `ActiveRegion` trailing zone.
- `ActiveRegionSpan`(s) ← derived from applied diffs; drive rollback and confidence.

### Constraints (Business Rules)

- Caret Safety: No `Diff` may start or end at/after caret.
- Windowing: NoiseWorker operates within `MAX_ACTIVE_REGION` behind caret; Backfill only in the stable zone.
- Reduced Motion: Visual feedback degrades to static when enabled.
- Privacy: No text persistence by default; logs gated and content-free.

### Persistence (Future hosts)

- Settings: local storage (web), `UserDefaults` (macOS). Schema versioned with migrations if needed.
- Telemetry: none by default. Optional debug logs are ephemeral.
- Text/Spans: not persisted unless an explicit feature requires it; if added, must be local-only and opt-in.

### Rust Types (source of truth)

See `docs/06-guides/06-03-reference/rust-core-api.md` for canonical type definitions. The Rust core defines all data structures via `CorrectionRequest`, `CorrectionResponse`, and related types. Platform UI layers (TypeScript/Swift) mirror these types for FFI/WASM communication.

### Traceability

- PRD: REQ-IME-CARETSAFE, REQ-STREAMED-DIFFUSION, REQ-ACTIVE-REGION, REQ-LOCAL-LM-INTEGRATION
- ADRs: ADR-0002 (caret-safe diffs), ADR-0003 (architecture constraints)
- QA: `docs/12-qa/qa/acceptance/*.feature` scenarios map to caret safety and active region behavior

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
