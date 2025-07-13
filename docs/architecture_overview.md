# MindType Architecture Overview

This document expands on the engineering spec and explains how the parts of the tool fit together. It is designed to provide a mental picture of the final system before implementation begins.

## High-Level Pipeline

1. **Keystroke Handling** – Every printable key resets the pause timer. This keeps the system passive until the user naturally pauses.
2. **Fragment Extraction** – Once idle time elapses, the extractor looks back for a sentence boundary within 250 characters. This fragment plus ~100 characters of context is packaged for correction.
3. **LLM Correction** – A streaming call is made to the language model. The initial version uses GPT‑3.5 via HTTPS; the long‑term goal is an on‑device Core ML model. Prompting focuses purely on grammar and spelling fixes.
4. **Incremental Diff and Merge** – The output stream is patched into the existing buffer using diff‑match‑patch. Patches are small and applied incrementally so the user sees text update as tokens arrive.
5. **Injection** – The corrected fragment replaces the original text in place, preserving formatting, undo stack integrity and cursor position.

```
key press → [PauseTimer] → idle
           ↓                    ↘
    [FragmentExtractor]   [Abort stream if new key]
           ↓                    ↘
    [LLMClient] → token stream → [MergeEngine] → patches → [Injector]
```

The arrows illustrate how a typing pause triggers the fragment extractor. Streaming can be aborted if a new key arrives mid-flight. This diagram mirrors both the browser and macOS implementations.

This pipeline is the same for both the web demo and the macOS app. The shared core is written in TypeScript and transpiled or ported to Swift for the macOS layer.

## Module Breakdown

### packages/core-ts
Shared algorithm logic, including the pause timer, fragment extractor and merge engine. This is the reference implementation for other platforms.

### web-demo
React components wrap the core logic and provide a simple typing playground. It demonstrates streaming corrections in real time and captures emails for the beta list.

### mac/
Native macOS layer written in Swift/SwiftUI. It ties into Accessibility APIs to read and modify the focused text field. The same algorithm from `packages/core-ts` is reimplemented in Swift for performance and sandboxing reasons.

## Rationale

- **One Pipeline** – By designing a single language‑agnostic algorithm we avoid divergence between platforms and ensure consistent user experience.
- **Streaming** – Token streaming keeps latency perceptibly low and makes the tool feel alive. This also reduces the risk of large diff conflicts.
- **Local Model Path** – Shipping an on‑device model guarantees privacy and offline usage. The spec outlines the conversion of a small BART model into Core ML as a first milestone.

Further details on specific components can be found in the accompanying documents.

## Next Steps

1. Finalise the shared TypeScript reference implementation and publish as an npm package.
2. Flesh out the Swift ports and confirm parity with unit tests.
3. Evaluate smaller transformer models for on-device use and prototype Core ML conversion.

This overview aims to answer **why** each component exists before diving into code. The shared pipeline enforces consistent behaviour, while individual modules stay small enough to be unit tested in isolation. Developers should be able to run the core on its own (node-based tests) or through the demo/mac front-ends without rewriting logic.

The additional documents referenced in the main spec – including [core_details.md](core_details.md), [web_demo_details.md](web_demo_details.md) and [mac_app_details.md](mac_app_details.md) – provide step-by-step guidance on implementation choices.
