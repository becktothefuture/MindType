Mind::Type Technical Architecture & Integration Guide (v1)

Introduction

This document outlines the system architecture and implementation guidelines for Mind::Type, focusing on a cross‑platform approach centred on a Rust core library. It covers how the core should be structured, how it interfaces with different front‑ends (macOS, iOS, Windows, and web), and best practices to ensure performance, safety, and maintainability.

Architectural Overview

At a high level, Mind::Type is composed of three layers: 1. Core diffusion engine (Rust) – Implements the text tapestry logic, language model integration, confidence gating, scheduler, and undo grouping. This library exposes a stable C ABI for platform bindings and can be compiled to WebAssembly. 2. Platform interface layers – Thin wrappers in Swift/Objective‑C (macOS, iOS), C#/.NET or C++ (Windows), and JavaScript/TypeScript (web) that handle OS‑specific APIs: capturing text input events, retrieving context around the caret, and applying edits/animations. These layers interface with the Rust core through FFI or WebAssembly. 3. User interface & visual feedback – Platform‑native UI that renders the active region, animated dots/braille symbol, and optional controls (formality slider, confidence dial). Each platform uses its native UI toolkit (AppKit/SwiftUI for macOS, UIKit/SwiftUI for iOS, WinUI/WPF for Windows, and HTML/CSS for the web).

High‑Level Flow 1. When a user focuses a text field, the platform layer informs the Rust core of the field content and current caret position. 2. As the user types, the platform layer streams keystrokes and real‑time context slices (near‑field) to the core. 3. The core schedules diffusion passes based on typing rate, computes corrections using the on‑device language model, and returns a sequence of edits with associated confidence scores. 4. The platform layer applies edits behind the caret and triggers the appropriate animations (e.g. animated dots) and UI updates. 5. Undo commands operate only on the user’s keystrokes; a separate safety net allows stepping back through time‑grouped edits emitted by the core.

Rust Core Design

Crate Structure
mind_type_core/
├── Cargo.toml
├── src/
│ ├── lib.rs (public API, FFI bindings)
│ ├── engine.rs (tapestry engine and scheduler)
│ ├── lm.rs (language model integration and inference)
│ ├── context.rs (context window management, near‑field extraction)
│ ├── confidence.rs (confidence gating logic and adaptive thresholds)
│ ├── undo.rs (time‑grouped undo safety net)
│ ├── ffi.rs (C ABI wrappers and type conversions)
│ └── utils.rs (helper types, logging, error handling)
└── bindings/ (generated headers / TypeScript bindings)

    lib.rs defines the high‑level Rust API and re‑exports for internal modules.  It is also the entry point for WebAssembly compilation via wasm32-unknown-unknown.
    •	ffi.rs uses the cbindgen or uniffi crate to generate C‑compatible functions and data types.  This allows Swift/Obj‑C, C#, and C++ to call into Rust easily.

Concurrency & Asynchronous Processing
• Use Rust’s async/await and an executor (e.g. tokio or async-std) to manage asynchronous tasks for LM inference and diffusion scheduling.
• Avoid blocking the calling thread; return futures to the platform layer so it can await results or process callbacks.
• For WebAssembly, prefer wasm-bindgen-futures to integrate with JavaScript promises.

Memory Safety & FFI
• Use #[repr(C)] structs and simple u32/usize indexes to pass data across FFI boundaries; avoid passing references or complex generics.
• Allocate and free memory within Rust; expose functions like mind*type_core_free_string to allow the host to release memory.
• Use Arc<Mutex<*>> or RwLock to share mutable state safely across threads when necessary.

Language Model Integration
• Load the quantised model parameters at initialisation. Consider a plug‑in architecture to swap models or quantisation strategies.
• The lm.rs module should expose an async API that receives a text segment and returns a list of candidate corrections with confidence scores.
• Cache intermediate embeddings for the near‑field context to minimise repeated computation.

Scheduler & Diffusion Engine
• In engine.rs, implement a scheduler that monitors typing rate (keystrokes/sec) and decides when to run micro‑refinements versus pause sweeps.
• Maintain a “tapestry” data structure representing validated spans, unvalidated spans, and the currently animated region. Each span stores the original text, corrected text, confidence, and applied timestamp.
• Group successive edits into time buckets (e.g. 100–200 ms windows) for the undo safety net.

Confidence Gating
• The confidence.rs module should compute a threshold based on distance from the caret, edit type (typo vs semantic fix), and user‑set sensitivity.
• Adapt thresholds over time by analysing undo events: if the user repeatedly undoes a class of edit, raise the threshold for that class.

Undo Safety Net
• Expose functions to push applied edits into a time bucket and revert the most recent bucket without affecting user keystrokes.
• The platform layer can present this as an optional “Revert last refinement” menu action rather than tying it to Cmd+Z.

Platform Interface Layers

macOS (AppKit / Swift)
• Use a macOS input monitoring extension (e.g. InputMethodKit or event taps) to capture keystrokes and caret position in text fields.
• Implement a Swift wrapper around the Rust core via FFI. Use cbindgen to generate a bridging header and SwiftPackageManager to include the Rust static/dynamic library.
• When the core emits edits, apply them to the NSTextInputClient using setMarkedText:selectionRange:replacementRange: to avoid interfering with other IMEs.
• Use SwiftUI or AppKit to overlay the animated dots behind the caret. Honour NSWorkspace.shared.accessibilityDisplayShouldReduceMotion for reduced‑motion users.
• Expose user settings via a pane in System Settings or a menu bar extra.

iOS (UIKit / SwiftUI)
• Use the custom input accessory or a text field delegate to capture typing events. Avoid implementing your own keyboard; instead, extend existing UITextInput implementations.
• The FFI integration is similar to macOS; compile the Rust core to a .a or .framework and expose C functions to Swift.
• On iOS, ensure that secure text entry fields (isSecureTextEntry) bypass Mind::Type.
• Because of battery and resource constraints, consider dynamically reducing model precision or turning off deeper sweeps when in low‑power mode.

Windows (Win32 / .NET / C#)
• Use the Text Services Framework (TSF) or hooking mechanisms to intercept text input in Win32 and UWP applications. Ensure high‑dpi scaling support for overlays.
• Bind to the Rust core using C# P/Invoke or C++/CLI. Use a C wrapper around the Rust library to simplify P/Invoke signatures.
• Integrate with WinUI/WPF for visual cues. Follow Microsoft’s accessibility guidelines (UI Automation, high‑contrast modes).
• Provide a system tray control for settings and status; avoid writing a full IME unless necessary.

Web (Browser / TypeScript)
• Compile the Rust core to WebAssembly (wasm32-unknown-unknown) and generate TypeScript bindings with wasm-bindgen. Use web-sys and js-sys crates for interacting with the DOM.
• Intercept input and selectionchange events on <textarea>, <input>, or contenteditable elements. Pass the current content and caret index to the WebAssembly core.
• Apply returned edits via DOM operations, ensuring not to disrupt the user’s selection. Use CSS animations for the braille/dots indicator.
• Because browsers have strict execution budgets, run the model in a Web Worker to avoid blocking the UI thread.

User Interface & Visual Feedback Guidelines
• Animated symbol: Use a three‑dot motif inspired by Braille that animates in place of text being processed. The dots can cycle or fade, indicating that the text is being cleaned. The animation should progress backwards from the caret.
• Active region: Draw a subtle band beneath the validated region. On reduced‑motion settings, use a static underline or colour wash.
• Settings: Provide a formality slider (friendly ↔ formal ↔ neutral) and a confidence sensitivity dial. These controls should sync across devices via user preferences.
• Accessibility: Support screen readers by announcing when text has been updated behind the caret (“Text cleaned”). Provide sufficient contrast for visual indicators and respect OS‑level preferences for reduced motion and high contrast.

Build & Packaging
• Use cargo build --release to compile the Rust core. Generate C headers with cbindgen and package the library as .a or .dll for desktop, .framework for iOS/macOS, and .wasm + glue for web.
• For Node integration (web front‑ends), use wasm-pack to produce an npm package with TypeScript declarations.
• Provide pre‑built binaries for common architectures (x86_64, arm64) and support dynamic linking on macOS to satisfy App Store restrictions.
• Use semantic versioning for the core and ensure backward‑compatible C API changes.

Testing & QA
• Unit tests: Cover LM inference, confidence gating, scheduler, and undo logic within Rust using cargo test.
• Fuzzing: Use cargo-fuzz to stress test text processing and FFI boundaries.
• Integration tests: For each platform, create automated tests to simulate typing sessions, verify that caret safety holds, and ensure that edits apply correctly under various speeds and contexts.
• Performance benchmarks: Use criterion.rs to measure latency and memory usage; run on representative hardware.

Summary

This guide lays out a modular, cross‑platform architecture for Mind::Type. By centralising the core logic in a safe, performant Rust crate and exposing it through clear platform bindings, we ensure that behaviour remains consistent across macOS, iOS, Windows, and the web. Adhering to Rust’s safety guarantees and platform‑native UI patterns will deliver the seamless, caret‑safe experience envisioned in the product requirements.
