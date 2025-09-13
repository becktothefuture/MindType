<!--══════════════════════════════════════════════════════════
  ╔════════════════════════════════════════════════════════════╗
  ║  ░  T H R E E ‑ S T A G E   P I P E L I N E   ( v 0 . 4 ) ░  ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
    • WHAT ▸ Noise → Context → Tone stages, confidence-gated
    • WHY  ▸ Improve text in layers without breaking flow
    • HOW  ▸ See diffusionController, sweepScheduler; UI exposes tone controls
-->

# Three-Stage Pipeline (v0.4)

- Noise: fast local cleanup of keystrokes (typos, spacing). Always behind the caret.
- Context: sentence-level fixes using ±2 sentences (S−1=1.0, S−2=0.5). Runs on pause when input fidelity ≥ τ_input.
- Tone: gentle rephrasing to match the selected tone (None/Casual/Professional). Applies only when τ_tone and τ_commit are met.

Safety: Edits never touch or cross the caret. Tone stage does not rollback on caret move but still never edits at/after the caret.

Scheduling: The scheduler streams Noise while typing. On a ≥500ms pause, it schedules Context; upon commit, Tone may run if language gating allows.

## Pipeline Overview (single-keystroke journey)

1. Typing event
   - `core/typingMonitor.ts` emits `{text, caret, atMs}`
   - `core/sweepScheduler.ts` receives `onEvent` and calls `diffusion.update`
   - Security/IME guard drops event if active (no timers)

2. Streaming while typing
   - `diffusion.tickOnce()` advances one word behind the caret
   - `engines/noiseTransformer.ts` proposes a caret-safe diff
   - On apply, `ui/highlighter.ts` emits `mindtype:highlight` for UI feedback

3. Pause catch‑up (~SHORT_PAUSE_MS, tier‑aware)
   - WebGPU = base delay, WASM ≈ 1.1×, CPU ≈ 1.3×
   - `diffusion.catchUp()` processes several words in small chunks to avoid UI stalls

4. Context stage (English‑only)
   - `engines/contextTransformer.ts` builds proposals (caret‑safe)
   - `core/confidenceGate.ts` scores; `core/stagingBuffer.ts` records states

5. Tone stage (optional)
   - If enabled and thresholds met, `engines/toneTransformer.ts` proposes pre‑caret diffs

6. Conflict resolution & apply
   - `engines/conflictResolver.ts` (precedence: Noise > Context > Tone; no overlaps)
   - `diffusion.applyExternal` applies resolved diffs; caret never crossed

## Scheduler Playbook

- Guards (drop or skip):
  - IME composition active → drop
  - Secure fields → drop
  - Language gating (`core/languageDetection.ts`) → Context/Tone only for English

- Timers:
  - Typing interval (`getTypingTickMs`) streams Noise
  - Pause debounce (tiered): schedules catch‑up and Context/Tone

- Anti‑thrash:
  - Tier‑aware debounce avoids thrash on slower devices
  - Single‑flight LM behavior lives in `core/lm/*`

## Contracts / Specs

- Conflict Resolution
  - Module: `engines/conflictResolver.ts`
  - Rule: precedence Noise > Context > Tone; longer span wins within source; no overlaps

- Active Region Spans
  - Module: `core/activeRegion.ts`
  - Spans: `{original, corrected, confidence, appliedAt, source}`; Unicode‑safe queries

- Anti‑thrash Scheduler
  - Module: `core/sweepScheduler.ts`
  - Debounce: WebGPU=base; WASM≈1.1×; CPU≈1.3×; guards enforce safety
