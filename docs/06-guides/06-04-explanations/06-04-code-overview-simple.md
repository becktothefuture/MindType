<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  C O D E  O V E R V I E W ( P L A I N - E N G L I S H )  ░  ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
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

- **Are we using an LLM?** In v0.4, the shared LM stack (`core/lm/*`) provides local on‑device inference (Transformers.js) with single‑flight, abort, cooldown, and device‑tiered fallbacks, feeding Context/Tone transforms strictly behind the caret.

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
3. **Engine/LM** – Orchestrates span selection, confidence gating, and (later) workerized LM streaming to produce caret‑safe diffs.
4. **MergeEngine** – Figures out the tiny diff between old and new text so we can patch word-by-word without crossing the cursor.
5. **Public API / FFI** – A handful of C-style functions the outside world (WASM or Swift) can call.

## 2. Web Layer – `web-demo/`

_Language: TypeScript + React + WASM_

1. **`@mindtype/core` WASM package** – Compiled Rust brain that runs in the browser.
2. **Editable.tsx** – A `<div contentEditable>` that acts like a giant text box.
3. **Hooks**
   - `usePauseTimer` – Wraps PauseTimer and triggers typing ticks + pause catch-up.
   - `useMindType` – Connects diffusion → LLM → word-by-word merge.
   - `DiffusionController` – Advances validation frontier; renders shimmer in active region.
4. **Debug Panel** – React portal opened with ⌥⇧⌘L; lets you tweak settings live.

### How the layers talk (ASCII map)

```
   [Your typing]
        |
        v
   InputMonitor (Rust) -- emits {text, caret, atMs}
        |
        v         TYPING_TICK_MS (streaming) + SHORT_PAUSE_MS (catch-up)
   CorrectionScheduler (Rust) ──── DiffusionController ──── Noise → Context → Tone
        |                           |
        v                           v
    LM (local)                 Active Region (20 words, shimmer)
Apply diff (caret‑safe) → Visual → Announce
```
