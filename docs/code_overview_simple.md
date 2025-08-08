# MindType – Plain-English Code Map

Below is a friendly tour of what each piece of the codebase does. Think of it as the “I’m new here – point me in the right direction” guide.

## Why Rust?

Rust is a **systems language** that compiles to tiny, lightning-fast machine code like C/C++, _but_ with modern safety guarantees (no nulls, no data races). That makes it perfect for:
• Running the exact same core on the web (via WebAssembly) _and_ on macOS (via a static lib).  
• Keeping latency ultra-low so corrections feel instant.  
• Memory safety—no mysterious crashes while you type.

## Why multiple languages at all?

| Layer       | Language               | Why not something else?                                             |
| ----------- | ---------------------- | ------------------------------------------------------------------- |
| Core logic  | **Rust**               | Shared, high-performance, memory-safe, compiles to WASM and native. |
| Browser UI  | **TypeScript + React** | Fast dev loop, ecosystem for components & Playwright tests.         |
| macOS shell | **Swift / SwiftUI**    | First-class Apple APIs (menu-bar, Accessibility), expressive UI.    |

This blend means each piece speaks the native language of its environment while sharing one brain.

## Why this build order?

1. **Rust core first** → proves the algorithm & gives us unit tests.
2. **Web demo** → easiest UI, fast feedback, perfect for Playwright E2E tests.
3. **macOS shell** → reuses same core, focuses only on OS-specific plumbing.
4. **Local Core ML model** → swap in once everything else is stable.
5. **Personal dictionary & multi-lang** → incremental polish after MVP.

Building from core → thin UI → platform shell avoids rewriting logic and keeps bugs in one place.

## Clever Things We’re Doing

• **Confidence gate** – prevents embarrassing low-confidence fixes.  
• **Adaptive idle timer** – feels magical for fast typists but stays calm for everyone else.  
• **Streaming diff** – patches arrive as tokens stream, so first letters appear <200 ms.  
• **Cursor guard & clipboard fallback** – means even the weirdest Electron app still gets corrected.

## Traps We’re Avoiding

✗ Forking two separate cores (TS + Swift) – would double bugs.  
✗ Blocking network calls – everything streams or runs local.  
✗ Big undo stack spam – single patch + reversible snapshot.  
✗ Shipping huge app – cloud build is 15 MB; local model downloaded on-demand.

## 1. The Brain – `crates/core-rs`

_Language: Rust_

1. **PauseTimer** – Watches your keystrokes; when you stop for ~½ second it yells “Idle!”.
2. **FragmentExtractor** – Looks back to the last sentence ending (`. ? !` etc.) and grabs just that bit.
3. **LLM Client** – Streams the fragment to the AI (cloud or local) and gets corrected words back one token at a time.
4. **MergeEngine** – Figures out the tiny diff between old and new text so we can patch without moving the cursor.
5. **Public API / FFI** – A handful of C-style functions the outside world (WASM or Swift) can call.

## 2. Web Layer – `web-demo/`

_Language: TypeScript + React + WASM_

1. **`@mindtype/core` WASM package** – Compiled Rust brain that runs in the browser.
2. **Editable.tsx** – A `<div contentEditable>` that acts like a giant text box.
3. **Hooks**
   - `usePauseTimer` – Wraps PauseTimer and triggers when idle.
   - `useMindType` – Connects extractor → LLM → merge engine.
4. **Debug Panel** – React portal opened with ⌥⇧⌘L; lets you tweak settings live.

## 3. macOS Layer – `mac/`

_Language: Swift + SwiftUI + Rust static lib_

1. **MenuBarController** – Pencil icon in menu bar, toggle on/off.
2. **EventTapMonitor** – Passively listens to keys, ignores ⌘ shortcuts.
3. **AXWatcher** – Knows which app/text field is focused.
4. **Rust Core** – Linked via `libmindtype.a`; same brain as web.
5. **MacInjector** – Uses Accessibility APIs (or clipboard fallback) to drop the diff into the field.
6. **Debug Window** – SwiftUI version of the web panel, talking to Rust over FFI.

## 4. Backends

1. **OpenAI Cloud** – Default; simple HTTPS SSE request.
2. **Core ML Local Model** – Downloaded once, ~110 MB, runs completely offline.
3. **StubStream** – Fake generator spitting out canned tokens for unit tests.

## 5. Configuration

_Hot-reloaded JSON5 file_ → event bus → all layers pick up changes instantly. Env-vars always win.

## 6. Build & CI

- `just build-web` – Rust → WASM, Vite build.
- `just build-mac` – Xcode + static Rust link.
- GitHub Actions run lint + tests + Playwright e2e on every PR.

## 7. How a Character Becomes Correct

```
Key press   → PauseTimer.touch()
PauseTimer idle → FragmentExtractor(text, caret)
               → LLM Client (stream tokens)
               → MergeEngine(diff)
               → Injector (DOM or AX)
```

If a new key arrives mid-stream, everything cancels and restarts.

## 8. Safety Nets

• Nothing uploaded without encryption and confidence gate.  
• Secure fields skipped.  
• One undo step or Esc reverts the whole fix.  
• Clipboard restored if we ever fall back to copy-paste.

That’s the whole system in a nutshell – just enough to dive into any file and know what you’re looking at. Happy hacking!
