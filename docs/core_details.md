# Shared Core Details

This document zooms in on the TypeScript reference implementation found in `packages/core-ts`. It explains how each module collaborates and outlines key interfaces.

## Overview

The core library provides the pause timer, fragment extraction, merge engine and helper utilities. It is designed to be framework agnostic so that both the web demo and the macOS app can reuse the same logic with minimal glue code.

The primary entry point is `useMindType` in the web demo and a small Swift wrapper in the macOS app. Both call into the same TypeScript classes for consistent behaviour.

## Module Summaries

### PauseTimer.ts
- **Purpose**: Detect a typing pause of configurable length.
- **Interface**:
  ```ts
  export class PauseTimer {
      constructor(idleMs: number, onIdle: () => void);
      touch(): void;    // call on every printable key
      cancel(): void;   // stop pending idle callbacks
  }
  ```
- **Notes**: Uses `requestAnimationFrame` under the hood to keep timing accurate even when the tab is not focused.

### FragmentExtractor.ts
- **Purpose**: Determine the sentence fragment to correct.
- **Interface**:
  ```ts
  export function extractFragment(text: string, caret: number): {
      fragment: string;
      range: [number, number]; // start and end offsets
      context: string; // ~100 chars surrounding text
  };
  ```
- **Notes**: Looks back to the previous `.`, `?`, `!` or newline within the last 250 characters. If none are found, the fragment starts at position 0.

### MergeEngine.ts
- **Purpose**: Apply streaming LLM output to the original text buffer.
- **Interface**:
  ```ts
  export class MergeEngine {
      constructor(original: string, range: [number, number]);
      pushToken(token: string): Patch[]; // compute diff for each chunk
  }
  ```
- **Notes**: Wraps the `diff-match-patch` library. Patches are small operations describing insertions and deletions. The consumer is responsible for applying them.

### LLMClient.ts
- **Purpose**: Stream tokens from the API.
- **Interface**:
  ```ts
  export async function* requestCorrections(
      fragment: string,
      context: string,
      abort: AbortSignal
  ): AsyncGenerator<string>;
  ```
- **Notes**: Uses the OpenAI SSE endpoint. Retries network failures with exponential backoff. Supports local stubs during development.

## Example Flow

1. `PauseTimer` triggers after idle time.
2. The consumer calls `extractFragment` to get the target text and context.
3. A request is made using `requestCorrections`.
4. Tokens are fed into a `MergeEngine` instance which yields patches.
5. The patches are applied to the DOM (web) or via Accessibility APIs (macOS).

Having these clear boundaries makes the core portable and easy to unit test. Each module can be mocked when writing UI tests.
