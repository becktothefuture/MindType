<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  E T H E R E A L   T Y P I N G   D E M O  ░░░░░░░  ║
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
    • WHAT ▸ Deep dive into how the demo renders, performs, and persists
    • WHY  ▸ Share the controls model + perf strategies for future work
    • HOW  ▸ Simple textarea + overlay; versioned settings persisted
-->

## Overview

The demo renders luminous particle bursts under a frosted glass layer. It is designed for high visual quality at a stable frame rate, auto‑adapting to device capability.

## Architecture

- Surface: `<textarea>` for editing plus an overlay `div` for active-region/highlights.
- Overlay: CSS highlight of the active region and applied diffs; reduced-motion supported.
- Loop: typing tick cadence (configurable) and pause catch-up.
- Persistence: versioned settings in localStorage (tick, band size) with sane defaults.

## Controls that influence animation

- XY Pads
  - Density/Energy: X increases emission density; Y increases energy (speed/size/life weights).
  - Blur/Glow: X expands glass blur range; Y boosts glow/brightness mapping.
  - Drift/Up Bias: X drifts clouds sideways; Y increases upward bias.
- Sliders
  - Light Strength: macro for brightness, count, size.
  - Impact: per‑keypress brightness boost.
  - Particle Count/Size, Min Saturation, Hue Jitter: granular tuning.
  - Time Scale: scales sim delta without skewing FPS.
  - Meter Gain/Decay, Burst Opacity: response curves for input energy.
- Presets
  - Mist, Aether, Dynamo; plus glass presets: Frosted, Deep Diffusion, Curved Lens.

## Bias & Directionality

- Upward bias: adds gentle vertical lift; range controlled by Drift/Up Bias pad (Y).
- User drift: sideways drift from the same pad (X).
- Keyboard‑side drift: left‑hand keys nudge rightwards, right‑hand keys nudge leftwards to simulate cross‑board energy flow. Combined with pad drift and normalized per‑particle.

## Anti‑banding & Tonemap

- Final full‑screen blit with filmic tonemap (ACES‑approx) + adaptive dithering.
- Modes: ordered (Bayer) or white‑noise; automatically selected by capability/FPS.
- Nearly invisible by default; Film option adds subtle chroma grain. Strength is in 1/255 units.

## Performance strategies

- PixelRatio governor raises/lowers `renderer.setPixelRatio` depending on rolling FPS (and a 120 Hz mode).
- Single allocation of buffers; no per‑frame GC pressure.
- Motion cost bounded by drag and curl fields; no heavy post‑FX chains.
- HDR path uses Half/Float targets when available; falls back to 8‑bit RT while retaining tonemap + dithering.
- Dither adapts: lowers strength and temporal components on slow devices.

## Persistence & Import/Export

- Builds a full config object: UI control values, pad positions, and engine tunables.
- Saves to localStorage + cookie (for redundancy).
- Import/Export via sidepanel JSON buttons.

## Adding your own preset

1. Create a preset handler that updates the UI sliders to the desired values.
2. Optionally tune `CONFIG.particles` fields (motionScale, lifeScale, dragPerSec, upwardBias).
3. Call `saveControls()` to persist.

## Safety nets

- All changes debounce into a robust config; legacy flat keys remain supported.
- Strong clamps and defaults for sliders avoid invalid values.
- Feature gates fall back gracefully when extensions are missing.

## FAQ

- Why not MSAA on 32F? Bandwidth/compat constraints; we avoid MSAA at 32F for perf stability.
- Why ordered dither? Texture‑free and deterministic; ideal for low‑end while still effective.

# Web Demo Walkthrough (v0.4)

This document paints a picture of the interactive demo found at `/web-demo`. It explains how the web version of MindType behaves and how it showcases the core technology.

## Purpose

The demo serves three goals:

1. **Visualise the magic** – Users can see sentences correct themselves as they type, giving a tangible feel for the final product.
2. **Collect interested users** – A small email capture form invites visitors to sign up for the macOS beta.
3. **Gather telemetry** – With consent, we log anonymised latency and token counts to help tune the algorithm.

Current state:

- The demo uses a simple `<textarea>` and is wired to the TypeScript streaming pipeline (TypingMonitor → SweepScheduler → DiffusionController) for real‑time active region and corrections. LM integration uses the shared `core/lm/*` stack with device‑tier fallbacks.

## Components (what each piece does)

- **App.tsx**: The demo shell; wires typing to `boot()` and renders controls.
- **Typing/Caret handling**: `core/typingMonitor.ts` emits `TypingEvent`s; `core/security.ts` gates secure/IME.
- **Pipeline**: `core/sweepScheduler.ts` schedules Noise during typing and Context/Tone on pause.
- **LM stack**: `core/lm/{factory.ts,transformersClient.ts,transformersRunner.ts}` provides local LM with WebGPU→WASM→CPU fallback.
- **UI Polish**: `ui/highlighter.ts`, `ui/swapRenderer.ts`, `ui/liveRegion.ts` for visuals and SR.

## User Flow (step-by-step)

1. The user starts typing into the editable area.
2. While typing, a typing tick (~60–90 ms) advances a trailing active region (typically 3–8 words long) behind the caret.
3. Rules apply minimal, caret‑safe patches within that region.
4. After ~500 ms of idle time, Context and Tone stages engage subject to confidence gating.
5. Corrections apply atomically via `replaceRange`, preserving caret and undo isolation.

### How the layers talk (ASCII map)

```
[Your typing]
     |
     v
TypingMonitor (TS) -- emits {text, caret, atMs}
     |
     v         TYPING_TICK_MS (streaming) + SHORT_PAUSE_MS (catch-up)
SweepScheduler (TS) ──── DiffusionController ──── Noise → Context → Tone
     |                           |
     v                           v
 LM (local, device-tiered)   Active Region (3–8 words)
Apply diff (caret‑safe) → Visual → Announce
```

## Notes

- v0.2 consolidates the demo to a single page; previous `/v1` and `/v2` entries were removed.

### Glossary

- **WASM (WebAssembly)**: Runs compiled Rust in the browser for speed.
- **FFI (Foreign Function Interface)**: Lets native apps like Swift/SwiftUI call Rust.
- **Fragment**: The last complete sentence to the left of the caret.
- **Token**: Typically a word or subword emitted by a model; we use words for the stub stream.
