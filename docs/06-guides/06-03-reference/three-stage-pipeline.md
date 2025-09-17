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
    • HOW  ▸ See Rust diffusion module, correction scheduler; UI exposes tone controls
-->

# Three-Stage Pipeline (v0.6+)

**Revolutionary Context**: The pipeline powers **Correction Marker** intelligence across **Seven Scenarios** with device-tier adaptation.

- Noise: fast local cleanup of keystrokes (typos, spacing). Always behind the caret.
- Context: sentence-level fixes using ±2 sentences (S−1=1.0, S−2=0.5). Runs on pause when input fidelity ≥ τ_input.
- Tone: gentle rephrasing to match the selected tone (None/Casual/Professional). Applies only when τ_tone and τ_commit are met.

Safety: Edits never touch or cross the caret. Tone stage does not rollback on caret move but still never edits at/after the caret.

Scheduling: The scheduler streams Noise while typing. On a ≥500ms pause, it schedules Context; upon commit, Tone may run if language gating allows.

## Pipeline Overview (single-keystroke journey)

1. Typing event
   - `crates/core-rs/src/monitor.rs` emits `{text, caret, atMs}`
   - `crates/core-rs/src/scheduler.rs` receives `onEvent` and calls `diffusion.update`
   - Security/IME guard drops event if active (no timers)

2. Streaming while typing
   - `diffusion.tickOnce()` advances one word behind the caret
   - `crates/core-rs/src/workers/noise.rs` proposes a caret-safe diff
   - On apply, Platform UI emits `mindtype:highlight` for visual feedback

3. Pause catch‑up (~SHORT_PAUSE_MS, tier‑aware)
   - WebGPU = base delay, WASM ≈ 1.1×, CPU ≈ 1.3×
   - `diffusion.catchUp()` processes several words in small chunks to avoid UI stalls

4. Context stage (English‑only)
   - `crates/core-rs/src/workers/context.rs` builds proposals (caret‑safe)
   - `crates/core-rs/src/confidence.rs` scores; `crates/core-rs/src/staging_buffer.rs` records states

5. Tone stage (optional)
   - If enabled and thresholds met, `crates/core-rs/src/workers/tone.rs` proposes pre‑caret diffs

6. Conflict resolution & apply
   - `crates/core-rs/src/conflict_resolver.rs` (precedence: Noise > Context > Tone; no overlaps)
   - `diffusion.applyExternal` applies resolved diffs; caret never crossed

## Scheduler Playbook

- Guards (drop or skip):
  - IME composition active → drop
  - Secure fields → drop
  - Language gating (`crates/core-rs/src/language_detection.rs`) → Context/Tone only for English

- Timers:
  - Typing interval (`getTypingTickMs`) streams Noise
  - Pause debounce (tiered): schedules catch‑up and Context/Tone

- Anti‑thrash:
  - Tier‑aware debounce avoids thrash on slower devices
  - Single‑flight LM behavior lives in `crates/core-rs/src/lm/*`

## Contracts / Specs

- Conflict Resolution
  - Module: `crates/core-rs/src/conflict_resolver.rs`
  - Rule: precedence Noise > Context > Tone; longer span wins within source; no overlaps

- Active Region Spans
  - Module: `crates/core-rs/src/active_region.rs`
  - Spans: `{original, corrected, confidence, appliedAt, source}`; Unicode‑safe queries

- Anti‑thrash Scheduler
  - Module: `crates/core-rs/src/scheduler.rs`
  - Debounce: WebGPU=base; WASM≈1.1×; CPU≈1.3×; guards enforce safety

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
