# macOS App Deep Dive

This document outlines how the menu‑bar application operates and highlights some of the decisions behind its architecture.

-## User Experience

- When launched, a small pencil icon appears in the menu bar. Clicking it toggles MindType on or off. The app never records audio; the icon simply represents writing assistance.
- The first launch triggers an Accessibility permission prompt so the app can monitor and edit text fields.
- Preferences include sliders for idle timeout and aggressiveness, plus a switch between Cloud and Local mode.
- A debug overlay (⌥⇧⌘L) shows live latency and token count for diagnostics.

## Key Components

- **EventTapMonitor** – A passive event tap listens for printable keys. Any command‑modified key is ignored to avoid conflicts with shortcuts.
- **AXWatcher** – Observes changes to the focused UI element. When the user moves to a different application or text field, the fragment snapshot resets.
- **FragmentExtractor & MergeEngine** – Rust core functions called via FFI; results are fed back to the main thread for injection.
- **MacInjector** – Applies the diff via Accessibility APIs. If direct editing fails (e.g. some Electron apps), it falls back to copying corrected text to the clipboard and simulating Cmd‑V.
- **LLMClient** – Uses `URLSession` with HTTP/2 streaming. Tokens are provided through an `AsyncSequence` so the rest of the code can await them naturally.

## Why a Menu-Bar App?

- **Always Available** – Users can enable MindType system‑wide without cluttering the dock.
- **Minimal Footprint** – A menu‑bar presence keeps the UI simple while still allowing quick access to settings.
- **Avoiding Sandboxing** – Distribution outside the Mac App Store simplifies access to the Accessibility API and custom models.

## Failure Modes

- If the Accessibility permission is revoked, the menu icon displays a warning badge and corrections are disabled.
- If network calls repeatedly fail, the app falls back to the local dictionary and surfaces a notification.

The macOS app shares philosophy with the web demo but integrates deeply with the system to correct any text field the user focuses on.

### Implementation Notes

- Start by wiring up `MenuBarController.swift` with an `NSStatusItem` and connect its toggle to a simple `enabled` boolean.
- Link the Rust static library (`libmindtype.a`) and call its FFI functions for `PauseTimer`, `FragmentExtractor`, `MergeEngine`.
- Wrap the Accessibility APIs in `MacInjector` and unit test injection in a sandboxed sample app before integrating system wide.
- A 5-kB stub `grammar_stub.mlmodelc` is bundled for development; CI replaces it with the full quantised model during the release build.
