# Web Demo Walkthrough

This document paints a picture of the interactive demo found at `/demo`. It explains how the web version of MindType behaves and how it showcases the core technology.

## Purpose

The demo serves three goals:

1. **Visualise the magic** – Users can see sentences correct themselves as they type, giving a tangible feel for the final product.
2. **Collect interested users** – A small email capture form invites visitors to sign up for the macOS beta.
3. **Gather telemetry** – With consent, we log anonymised latency and token counts to help tune the algorithm.

Current state:

- The demo currently uses a simple `<textarea>` and calls the Rust WASM directly.
- `Editable.tsx`, `usePauseTimer.ts`, and `useMindType.ts` are planned improvements; the names here describe intent.

## Components (what each piece does)

- **Editable.tsx**: A `contentEditable` surface (like a rich textarea). Listens for keystrokes and keeps the caret stable across React renders.
- **usePauseTimer.ts**: A small hook that wraps the Rust `WasmPauseTimer`. It exposes `isIdle` so you can run a correction when the user pauses.
- **useMindType.ts**: Orchestrates the flow: on idle → extract fragment → stream tokens → merge → apply. Cancels mid‑stream if the user resumes typing.
- **LLMClient.ts**: In future, wraps a real model (OpenAI/CoreML) with streaming tokens. Today we use a stub token stream from Rust.
- **UI Polish**: Subtle highlight for the changed fragment; latency badge; keyboard toggle for the Debug Panel.

## User Flow (step-by-step)

1. The user starts typing into the editable area.
2. After ~500 ms of idle time, the current sentence (fragment) is selected for correction.
3. Tokens (words) stream back and the text updates in place. Each patch will be applied with caret safety and one‑step undo in mind.
4. If the user resumes typing mid-stream, the current correction is cancelled and a new pause cycle begins.

## Reasoning

- **Minimal React State** – Most of the logic lives outside React to avoid unnecessary re-renders. This keeps the typing experience smooth even on slower machines.
- **One Undo Step** – By using the browser’s native `insertText` command, the entire correction can be undone with a single `Cmd+Z`, matching the behaviour of the macOS app.
- **No Shortcut Clashes** – The demo is careful not to call `preventDefault` on standard shortcuts. This emphasises how the final product will feel invisible until it makes a fix.

The web demo is intentionally lightweight; it mirrors the eventual macOS experience but runs entirely in the browser.

### Implementation Notes (how to run and tinker)

- Import the shared logic from the WASM package `@mindtype/core` (compiled from `crates/core-rs`) so the demo remains thin.
- Build the `usePauseTimer` hook to wrap the Rust `PauseTimer` and expose an `idle` event to React components.
- Implement `Editable.tsx` so it never resets the DOM tree — rely on refs and `contentEditable` to maintain cursor position.
- When integrating `LLMClient.ts`, mock the network layer first with a small async generator to feed tokens for local testing.
- Add a small Express server to store email sign-ups; keep telemetry logging optional via a checkbox.

### Glossary

- **WASM (WebAssembly)**: Runs compiled Rust in the browser for speed.
- **FFI (Foreign Function Interface)**: Lets native apps like Swift/SwiftUI call Rust.
- **Fragment**: The last complete sentence to the left of the caret.
- **Token**: Typically a word or subword emitted by a model; we use words for the stub stream.
