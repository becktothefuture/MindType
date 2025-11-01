<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  C U R R E N T   S Y S T E M   A U D I T  ░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Independent snapshot of current architecture & behaviours
    • WHY  ▸ Establish factual baseline before PDF alignment work
    • HOW  ▸ Module survey, data flows, safety/privacy, gaps
-->

# Current System Audit (v0.6 branch baseline)

## A. Entrypoints & Orchestration

```17:31:index.ts
export function boot(options?: BootOptions) {
  const monitor = createTypingMonitor();
  const security = options?.security ?? createDefaultSecurityContext();
  let lmAdapter: LMAdapter = createNoopLMAdapter();
  const scheduler = createSweepScheduler(monitor, security, () => lmAdapter, {
    toneEnabled: options?.toneEnabled,
    toneTarget: options?.toneTarget,
  });
```

- Boot wires `TypingMonitor` → `SweepScheduler`; LM adapter injectable at runtime.

```59:76:core/sweepScheduler.ts
export function createSweepScheduler(
  monitor?: TypingMonitor,
  security?: SecurityContext,
  getLMAdapter?: () => LMAdapter | null,
  pipeline?: PipelineOptions,
): SweepScheduler {
  ...
  const diffusion = createDiffusionController(defaultActiveRegionPolicy, getLMAdapter);
  const log = createLogger('sweep');
```

## B. Active Region & Safety

```73:114:core/activeRegionPolicy.ts
function computeRenderRangeInternal(state: DiffusionStateLike): {
  start: number;
  end: number;
} {
  const endBound = state.caret;
  ...
  const aligned = alignToGraphemeBoundaries(state.text, finalStart, endBound);
  if (!isCaretSafe(aligned.start, aligned.end, state.caret)) {
    return { start: state.caret, end: state.caret };
  }
  return aligned;
}
```

- Single Active Region behind caret; grapheme‑safe; caret‑safe enforced.

## C. Three‑Stage Pipeline (LM‑only v0.6)

```42:79:core/correctionWave_v06.ts
// Stage 1: Noise Transformer (LM-only typo fixes)
if (lmAdapter) {
  const noiseResult = await noiseTransform({ text: currentText, caret, activeRegion, lmAdapter });
  if (noiseResult.diff) { diffs.push({ ...noiseResult.diff, stage: 'noise' }); ... }
}
// Stage 2: Context Transformer (LM-only grammar/coherence)
// Stage 3: Tone Transformer (LM-only style adjustment)
```

```32:85:engines/noiseTransformer.ts
export async function noiseTransform(input: NoiseInput): Promise<NoiseResult> {
  const { text, caret, activeRegion, lmAdapter } = input;
  if (!lmAdapter) return { diff: null };
  if (!isCaretSafe(activeRegion.start, activeRegion.end, caret)) return { diff: null };
  ... // stream LM; return whole-span replacement if meaningful
}
```

```34:101:engines/contextTransformer_v06.ts
if (!lmAdapter) return { proposals: [] };
if (!isCaretSafe(activeRegion.start, activeRegion.end, caret)) return { proposals: [] };
// computeInputFidelity → dynamic thresholds → stream LM → confidence → applyThresholds
```

```37:100:engines/toneTransformer_v06.ts
if (toneTarget === 'None') return { proposals: [] };
if (!lmAdapter) return { proposals: [] };
// stream LM tone adjustment; gate via confidence and τ_tone/τ_commit
```

Observations:
- v0.6 stages require LM; no rule‑based fallback.
- Noise is implemented as full‑span LM replacement within Active Region when meaningful.

## D. Streaming / Diffusion Behaviour

```150:183:core/diffusionController.ts
function tickOnce() {
  const r = nextWordRange();
  if (!r) return;
  const res = noiseTransformSync({ text: state.text, caret: state.caret });
  if (res.diff) { /* apply & render highlight */ } else { state.frontier = Math.max(state.frontier, r.end); }
}
```

- `noiseTransformSync` currently returns no diffs in v0.6 (stub), so streaming tick validates words without applying changes; pause catch‑up still advances.

## E. Confidence Gate & Thresholds

```46:71:core/confidenceGate.ts
export function computeConfidence(inputs: ConfidenceInputs): ConfidenceScore { /* weighted sum */ }
export function applyThresholds(score: ConfidenceScore | number, thresholds = getConfidenceThresholds(), opts?: { requireTone?: boolean }): GateDecision { /* hold/commit/discard */ }
```

- Context/Tone stages compute input fidelity and dynamic thresholds; commits gated by τ.

## F. Accessibility & Privacy

- Accessibility: `ui/liveRegion.ts` (batch announcements), `ui/motion.ts` (reduced‑motion instant swap), `ui/swapRenderer.ts` (highlights).
- Privacy/Security: `core/security.ts` (secure field & IME guards), `core/caretMonitor.ts`.

## G. Logging & Diagnostics

- Logger: `core/logger.ts` (namespaced, pluggable sink).
- Diagnostics bus: `core/diagnosticsBus.ts` (noise / lm‑wire channels for dev diagnostics).

## H. Identified Gaps vs Intent (Initial)

1) Deterministic‑first under load (PDF) vs LM‑only noise in v0.6.
   - Impact: graceful degradation should preserve deterministic noise; current code disables stage without LM.
2) Single‑undo per sweep: `diffusionController` notes external undo; verify `ui/rollbackHandler.ts` implements atomic grouping across stages.
3) Caret organism visuals/state machine: ensure web app exposes Listening/Thinking/Cleaning with timing (PDF sequences).
4) Latency fallback policy: tier‑aware exists in scheduler debounce, but stage disable/shrinking window policies need codified thresholds.
5) Streaming tick effect: with `noiseTransformSync` stubbed, streaming applies no deterministic fixes while typing; PDF calls for deterministic‑first.

## I. Folder Structure (Snapshot)
- Core TS: `core/` (monitor, scheduler, diffusion, LM, safety)
- Engines: `engines/` (noise/context/tone v06)
- UI: `ui/` (marker highlight, motion, live region, rollback handler)
- Rust core: `crates/core-rs/` (orchestration target; FFI/JSON bridge ADR)
- Demo/playground: `playground/` (diagnostics/logs)

## J. Preliminary Risk Notes
- LM availability directly controls all stages; ensure predictable failure surfaces and deterministic fallback behaviour.
- Confidence thresholds must be tuned to avoid over‑edits; PDF specifies non‑interference bias on uncertainty.


