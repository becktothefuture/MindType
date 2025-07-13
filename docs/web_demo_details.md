# Web Demo Walkthrough

This document paints a picture of the interactive demo found at `/demo`. It explains how the web version of MindType behaves and how it showcases the core technology.

## Purpose

The demo serves three goals:
1. **Visualise the magic** – Users can see sentences correct themselves as they type, giving a tangible feel for the final product.
2. **Collect interested users** – A small email capture form invites visitors to sign up for the macOS beta.
3. **Gather telemetry** – With consent, we log anonymised latency and token counts to help tune the algorithm.

## Components

- **Editable.tsx** – A `div` with `contentEditable` that mimics a normal text box. It listens for keystrokes and maintains selection when React re-renders.
- **usePauseTimer.ts** – Debounces typing using `requestAnimationFrame` for precision. When the timer fires, it triggers the correction pipeline.
- **useMindType.ts** – Hooks the shared algorithm into React. It handles cancellation when new keys arrive mid-stream and exposes the current latency.
- **LLMClient.ts** – Wraps the network call to OpenAI with an SSE polyfill so we can stream tokens as soon as they are available.
- **UI Polish** – A subtle flash highlights the corrected fragment. A badge displays current latency in milliseconds.

## User Flow

1. The user starts typing into the editable area.
2. After ~500 ms of idle time, the current sentence is sent for correction.
3. Tokens stream back and the text updates in place. Each patch is applied with `document.execCommand('insertText')` to preserve the undo stack.
4. If the user resumes typing mid-stream, the current correction is cancelled and a new pause cycle begins.

## Reasoning

- **Minimal React State** – Most of the logic lives outside React to avoid unnecessary re-renders. This keeps the typing experience smooth even on slower machines.
- **One Undo Step** – By using the browser’s native `insertText` command, the entire correction can be undone with a single `Cmd+Z`, matching the behaviour of the macOS app.
- **No Shortcut Clashes** – The demo is careful not to call `preventDefault` on standard shortcuts. This emphasises how the final product will feel invisible until it makes a fix.

The web demo is intentionally lightweight; it mirrors the eventual macOS experience but runs entirely in the browser.

### Implementation Notes

- Set up a Vite project with React and TypeScript. Import the shared logic from the WASM package `@mindtype/core` (compiled from `crates/core-rs`) so the demo remains thin.
- Build the `usePauseTimer` hook to wrap the Rust `PauseTimer` and expose an `idle` event to React components.
- Implement `Editable.tsx` so it never resets the DOM tree — rely on refs and `contentEditable` to maintain cursor position.
- When integrating `LLMClient.ts`, mock the network layer first with a small async generator to feed tokens for local testing.
- Add a small Express server to store email sign-ups; keep telemetry logging optional via a checkbox.