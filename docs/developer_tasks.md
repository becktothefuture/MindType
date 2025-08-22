# Developer Task Breakdown

This document lists concrete tasks for building the first working version of MindType. It turns the high-level architecture into actionable steps for contributors.

## Shared Core (`crates/core-rs`)

_Language: Rust_

- **pause_timer.rs** – idle-detection state machine, property-based tests with `proptest`.
- **fragment.rs** – Unicode-aware extractor; golden-vector tests live in `shared-tests/`.
- **merge.rs** – incremental diff wrapper; fuzz with random token streams.
- **llm.rs** – trait + OpenAI/Core-ML back-ends; mock generator for tests.
- **ffi/mod.rs** – `extern "C"` layer + `wasm_bindgen` exports.

## Web Demo (`web-demo`)

- **Editable.tsx** – maintain cursor, use `beforeinput` + `InputEvent` with `Selection.modify` (no deprecated `execCommand`).
- **Core bindings** – call Rust orchestrator via WASM; TS-side LM scheduling removed; rules-only path remains until orchestrator merges land.
- **DebugPanel.tsx** – UI opened with ⌥⇧⌘L; binds to hot-reloaded config.

## macOS App (`mac`)

_All Swift files now call the Rust core via FFI; no separate Swift port required._

- **MenuBarController.swift** – pencil icon toggle, opens Debug window.
- **EventTapMonitor.swift** – forwards printable key codes to `mt_touch_key` FFI.
- **AXWatcher.swift** – resets state on focus change.
- **MacInjector.swift** – injects diff via AX APIs; clipboard fallback for stubborn apps.
- **LLMClient.swift** – thin wrapper around `CoreMLStream` or `OpenAIStream` FFI.

This list is intentionally granular to help new developers jump in quickly. Each task corresponds to a specific file or small group of files. As pieces come together, integration tests should ensure that both the web demo and macOS app share the same behaviour.
