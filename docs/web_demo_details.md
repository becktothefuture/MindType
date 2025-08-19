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
    • HOW  ▸ Three.js scene + custom shaders + versioned JSON config
-->

## Overview

The demo renders luminous particle bursts under a frosted glass layer. It is designed for high visual quality at a stable frame rate, auto‑adapting to device capability.

## Architecture

- Scene: one Three.js `Points` system for main particles + one for low‑alpha boost.
- Shaders: custom vertex/fragment with per‑particle impulse, wobble, and temporal dither.
- Overlay: CSS frosted glass blur with dynamic grain.
- Loop: single animation loop with time scaling and pixelRatio governor.
- Persistence: full, versioned JSON config (`ethereal_config_v1`) in localStorage + cookie, plus legacy flat values for back‑compat.

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

# Web Demo Walkthrough

This document paints a picture of the interactive demo found at `/demo`. It explains how the web version of MindType behaves and how it showcases the core technology.

## Purpose

The demo serves three goals:

1. **Visualise the magic** – Users can see sentences correct themselves as they type, giving a tangible feel for the final product.
2. **Collect interested users** – A small email capture form invites visitors to sign up for the macOS beta.
3. **Gather telemetry** – With consent, we log anonymised latency and token counts to help tune the algorithm.

Current state:

- The demo uses a simple `<textarea>` and will be wired to the TypeScript streaming pipeline (TypingMonitor → SweepScheduler → DiffusionController) for real‑time validation band and corrections.
- `Editable.tsx`, `useTypingTick.ts` (replacing pause‑only logic), and `useMindType.ts` are planned improvements; the names here describe intent.

## Components (what each piece does)

- **Editable.tsx**: A `contentEditable` surface (like a rich textarea). Listens for keystrokes and keeps the caret stable across React renders.
- **useTypingTick.ts**: Drives a ~60–90 ms cadence during typing for streamed diffusion; pairs with pause detection for catch‑up.
- **useMindType.ts**: Orchestrates the flow: on typing tick → band‑bounded tidy sweep; on idle → catch‑up. Cancels mid‑stream if the user resumes typing.
- **LMClient.ts**: In future, wraps a local model via Transformers.js (Qwen2.5‑0.5B‑Instruct, q4, WebGPU) with streaming tokens. Today we use rule‑based tidy sweep.
- **UI Polish**: Subtle highlight for the changed fragment; latency badge; keyboard toggle for the Debug Panel.

## User Flow (step-by-step)

1. The user starts typing into the editable area.
2. While typing, a typing tick (~60–90 ms) advances a trailing validation band (typically 3–8 words long) behind the caret.
3. Words stream back and apply as tiny, caret‑safe patches within that band. The UI uses a subtle shimmer; reduced-motion falls back to a gentle fade.
4. After ~500 ms of idle time, the diffusion catches up until the band reaches the caret.
5. If the user resumes typing mid-stream, diffusion continues behind the moving caret; any word at the caret is skipped until a boundary appears.

## Reasoning

- **Minimal React State** – Most of the logic lives outside React to avoid unnecessary re-renders. This keeps the typing experience smooth even on slower machines.
- **One Undo Step** – By using the browser’s native `insertText` command, the entire correction can be undone with a single `Cmd+Z`, matching the behaviour of the macOS app.
- **No Shortcut Clashes** – The demo is careful not to call `preventDefault` on standard shortcuts. This emphasises how the final product will feel invisible until it makes a fix.

The web demo is intentionally lightweight; it mirrors the eventual macOS experience but runs entirely in the browser.

### Implementation Notes (how to run and tinker)

- Import the TypeScript streaming pipeline for immediate realism; optionally augment with the WASM package `@mindtype/core` (compiled from `crates/core-rs`) when Rust components land.
- Build the `usePauseTimer` hook to wrap the Rust `PauseTimer` and expose an `idle` event to React components.
- Implement `Editable.tsx` so it never resets the DOM tree — rely on refs and `contentEditable` to maintain cursor position.
- When integrating `LMClient.ts`, start with Transformers.js streaming in a Web Worker and a `TextStreamer`; keep corrections band‑bounded and caret‑safe.
- Add a small Express server to store email sign-ups; keep telemetry logging optional via a checkbox.

### Glossary

- **WASM (WebAssembly)**: Runs compiled Rust in the browser for speed.
- **FFI (Foreign Function Interface)**: Lets native apps like Swift/SwiftUI call Rust.
- **Fragment**: The last complete sentence to the left of the caret.
- **Token**: Typically a word or subword emitted by a model; we use words for the stub stream.
