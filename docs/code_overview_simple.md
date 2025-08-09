<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  CODE OVERVIEW (PLAIN-ENGLISH)  ░░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Friendly tour of the codebase
    • WHY  ▸ Help newcomers build a deep mental model
    • HOW  ▸ Gentle definitions, diagrams, and examples
-->

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

What those bold phrases mean (in simple terms):

- **Unit tests**: tiny, fast checks that run in seconds and prove each
  small piece works on its own. In this repo:
  - TypeScript unit tests (Vitest) live in `tests/**` and check things
    like “never cross the caret” and future engine rules.
  - Rust unit tests live next to the Rust code (e.g.,
    `crates/core-rs/src/*.rs`) and check fragment extraction, merging,
    and streaming stubs.

- **Playwright E2E tests**: End‑to‑end tests that click the UI like a
  human would. They spin up the web demo in a real browser, type, wait
  for an idle pause, and verify the visible outcome. These live in
  `e2e/` and help catch integration issues.

- **OS‑specific plumbing**: platform glue that only exists on macOS,
  such as:
  - Event taps (listen to keystrokes without interfering)
  - Accessibility (AX) APIs (to find the focused text field)
  - Applying the diff in a way that preserves one undo step
    None of this logic belongs in the core; we keep it in the Swift app.

- **Local Core ML model**: Apple’s on‑device machine‑learning runtime.
  We can package a small language model that runs entirely offline on a
  Mac (no network). When we say “Local Core ML model,” we mean using
  Core ML to stream tokens (words) for the corrected sentence without
  calling a cloud API.

- **Are we using an LLM?** Today, in the web demo, we use a stub token
  stream that pretends to be an LLM to exercise the pipeline. In the
  future, you can plug in:
  - A cloud LLM (e.g., OpenAI) with streaming responses, or
  - A local Core ML model for offline use.
    The model proposes “better” text; our rule‑based engines (Tidy/Backfill)
    keep edits small, safe, and caret‑aware.

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

1. **PauseTimer** – Watches your keystrokes; typing ticks stream corrections while you type; pause triggers catch-up.
2. **FragmentExtractor** – Looks back to the last sentence ending (`. ? !` etc.) and grabs just that bit.
3. **LLM Client** – Streams word-sized corrections to the AI (cloud or local) and gets fixes back one word at a time.
4. **MergeEngine** – Figures out the tiny diff between old and new text so we can patch word-by-word without crossing the cursor.
5. **Public API / FFI** – A handful of C-style functions the outside world (WASM or Swift) can call.

## 2. Web Layer – `web-demo/`

_Language: TypeScript + React + WASM_

1. **`@mindtype/core` WASM package** – Compiled Rust brain that runs in the browser.
2. **Editable.tsx** – A `<div contentEditable>` that acts like a giant text box.
3. **Hooks**
   - `usePauseTimer` – Wraps PauseTimer and triggers typing ticks + pause catch-up.
   - `useMindType` – Connects diffusion → LLM → word-by-word merge.
   - `DiffusionController` – Advances validation frontier; renders shimmer band.
4. **Debug Panel** – React portal opened with ⌥⇧⌘L; lets you tweak settings live.

### How the layers talk (ASCII map)

```
   [Your typing]
        |
        v
   TypingMonitor (TS) -- emits {text, caret, atMs}
        |
        v         TYPING_TICK_MS (streaming) + SHORT_PAUSE_MS (catch-up)
   SweepScheduler (TS) ──── DiffusionController ──── ticks → word-by-word
        |                           |
        v                           v
   Rust (WASM) core         Validation Band (3–8 words, shimmer)
   ┌───────────────────┐           |
   │ FragmentExtractor │           v
   │ StubTokenStream   │    Apply word (caret‑safe) → Flash → Logs
   │ Merger            │
   └───────────────────┘
```

## 3. macOS Layer – `mac/`

_Language: Swift + SwiftUI + Rust static lib_

1. **MenuBarController** – Pencil icon in menu bar, toggle on/off.
2. **EventTapMonitor** – Passively listens to keys, ignores ⌘ shortcuts.
3. **AXWatcher** – Knows which app/text field is focused.
4. **Rust Core** – Linked via `libmindtype.a`; same brain as web.
5. **MacInjector** – Uses Accessibility APIs (or clipboard fallback) to drop the diff into the field.
6. **Debug Window** – SwiftUI version of the web panel, talking to Rust over FFI.

### macOS vs Web (same brain, different shells)

```
              Shared Core Logic (Rust)
                    │
     ┌──────────────┴──────────────┐
     v                             v
  Web Demo (TS/React + WASM)   macOS App (Swift/SwiftUI + FFI)
     │                             │
  DOM, hooks, hot reload        AX APIs, event taps, menu bar
```

## 4. Backends

1. **OpenAI Cloud** – Default; simple HTTPS SSE request.
2. **Core ML Local Model** – Downloaded once, ~110 MB, runs completely offline.
3. **StubStream** – Fake generator spitting out canned tokens for unit tests.

Which backend creates the “clear text”?

- For simple clean‑ups, our rule‑based engines do the job (no ML).
- For richer rewrites (e.g., grammar/style), an LLM backend proposes a
  better sentence. We then apply it safely as tiny diffs behind the
  caret so it feels native and undo‑friendly.

## 5. Configuration

_Hot-reloaded JSON5 file_ → event bus → all layers pick up changes instantly. Env-vars always win.

## 6. Build & CI

- `just build-web` – Rust → WASM, Vite build.
- `just build-mac` – Xcode + static Rust link.
- GitHub Actions run lint + tests + Playwright e2e on every PR.

### Tests in this repo (quick guide)

- Unit (TS): `pnpm test` (Vitest). Fast, checks individual functions.
- Unit (Rust): `cargo test` in `crates/core-rs`. Fast, checks core ops.
- E2E (Web): `pnpm --prefix e2e test` (Playwright). Slower, full flow.

Think “pyramid of speed”: most tests are fast unit tests; a few are
browser‑level to ensure everything fits together.

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
