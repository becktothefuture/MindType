# Developer Task Breakdown

This document lists concrete tasks for building the first working version of MindType. It turns the high-level architecture into actionable steps for contributors.

## Shared Core (`packages/core-ts`)
- **PauseTimer.ts** – expose `start`, `stop` and `onIdle` callbacks. Use `requestAnimationFrame` to measure idle time with millisecond precision.
- **FragmentExtractor.ts** – given a text buffer and cursor position, return the last sentence plus ~100 characters of context. Unit-test edge cases like multiple punctuation marks or very short fragments.
- **MergeEngine.ts** – wrap `diff-match-patch` to compute incremental patches. Provide an API that accepts streaming tokens and yields patch objects.

## Web Demo (`web-demo`)
- **Editable.tsx** – handle selection preservation, call `usePauseTimer`, and inject patches via `document.execCommand('insertText')`.
- **LLMClient.ts** – implement an SSE client for OpenAI. Stream tokens and pass them to `MergeEngine`.
- **Telemetry.ts** – log latency and token counts to a simple endpoint. Make this optional via a toggle.

## macOS App (`mac`)
- **MenuBarController.swift** – create an `NSStatusItem` with a pencil icon. Clicking it should enable or disable MindType. No microphone access is required.
- **EventTap.swift** – listen for printable keys and ignore command-modified events. Forward keystrokes to the Swift version of `PauseTimer`.
- **AXWatcher.swift** – monitor the focused text field and reset state when focus changes.
- **LLMClient.swift** – use `URLSession` with HTTP/2 and convert the response into an `AsyncSequence<String>` of tokens.
- **MacInjector.swift** – apply patches via Accessibility APIs; implement a clipboard fallback for non-standard fields.

This list is intentionally granular to help new developers jump in quickly. Each task corresponds to a specific file or small group of files. As pieces come together, integration tests should ensure that both the web demo and macOS app share the same behaviour.
