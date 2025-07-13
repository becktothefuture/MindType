# MindType – Unified Engineering Specification (v2.0)

> This document replaces the previous `specs.md`.  All subsidiary docs under `docs/` cross-reference this master spec.

────────────────────────────────────────
0 • Guiding Principles
────────────────────────────────────────
1. **Single-source core** – One canonical implementation in **Rust** (`crates/core-rs`).  Shipped to:
   • Web via WASM + TypeScript bindings (`@mindtype/core`).
   • macOS via static library + Swift module.
2. **One pipeline** – `pause-detect → extract-fragment → stream LLM → diff/merge → inject` (unchanged, see §2).
3. **Non-intrusive UX** – No shortcut stealing; single undo; low CPU.
4. **Zero-trust data policy** – Minimal fragment (≤250 chars + context) encrypted in transit *and at rest*; default retention 14 days.
5. **Performance first** – ≤2 ms per keystroke, ≤180 ms idle→first-token (cloud).

────────────────────────────────────────
1 • Folder & Project Layout
────────────────────────────────────────
```
mindtype/
├─ crates/
│  └─ core-rs/           # shared Rust lib (no platform code)
├─ bindings/
│  ├─ wasm/              # pkg from wasm-bindgen (npm publish)
│  └─ swift/             # C header + module map via cbindgen
├─ web-demo/             # React (imports @mindtype/core)
├─ mac/                  # Xcode proj, links libmindtype.a
├─ shared-tests/         # golden JSON vectors & corpora
└─ docs/                 # architecture_overview.md, …
```
All diagrams & API contracts live in `docs/` and reference sections below.

────────────────────────────────────────
2 • Shared Algorithm (Rust canonical)  ↗ `docs/core_rust_details.md`
────────────────────────────────────────
Stage | Detail | Source File
---|---|---
Pause detection | `PauseTimer` (configurable idle_ms) | `src/pause_timer.rs`
Fragment extraction | Unicode-aware (`.?!。
` + *Sentence_Terminal* class); bidi-safe | `src/fragment.rs`
LLM call | Streaming GPT-3.5 or local Core ML via FFI | `src/llm.rs`
Diff & merge | Incremental diff every ≤4 tokens; idempotent batches | `src/merge.rs`
Injection | Platform-specific (bindings layer) | —

The Rust unit-test corpus in `shared-tests/` is executed by TS & Swift harnesses for parity.

────────────────────────────────────────
3 • Browser Demo  ↗ `docs/web_demo_details.md`
────────────────────────────────────────
• Uses WASM build of core.  Text insertion via `InputEvent` (`beforeinput`) + `Selection.modify` (no `execCommand`).
• PauseTimer falls back to `setTimeout` inside a dedicated Worker when `document.hidden`.
• Secure-field guard: skip `<input type=password>` and elements with `autocomplete="off"`.

────────────────────────────────────────
4 • macOS Menu-Bar App  ↗ `docs/mac_app_details.md`
────────────────────────────────────────
• Links static `libmindtype.a`; calls Rust functions via generated Swift module.
• Two build flavours:
  – *Cloud-Only* (≈15 MB DMG).
  – *Local-Model* downloadable asset (≤120 MB) fetched post-install via Sparkle delta feed.
• AX write coalescer batches patches ≤40 ms apart.

────────────────────────────────────────
5 • Performance Targets
────────────────────────────────────────
Metric | Target
---|---
Typing overhead | <2 ms/key (web & mac)
Idle → first token | ≤180 ms (cloud); ≤120 ms (local)
Memory (mac) | <80 MB w/o model; <200 MB with local model
CPU idle | <5 % on Apple Silicon

────────────────────────────────────────
6 • Security & Privacy
────────────────────────────────────────
1. TLS 1.3 for all outbound requests.
2. Encrypted fragment storage (AES-GCM) in SQLite; auto-purge after 14 days (configurable 0-180).
3. Demo server protected by express-rate-limit + Turnstile CAPTCHA.
4. macOS binary hardened & sandboxed; entitlements limited to AX + network.
5. Opt-in telemetry only; users can export & delete data via UI.

────────────────────────────────────────
7 • Testing & Quality Assurance Plan  🔹
────────────────────────────────────────
| Layer / Goal                 | Tooling & Location                                           | CI Frequency |
| ---------------------------- | ------------------------------------------------------------ | ------------ |
| **Unit Tests** – verify a single function or class | • Rust: `cargo test` + `proptest` (property-based) in `crates/core-rs/tests/`  <br/>• TypeScript: `vitest` in `web-demo/`  <br/>• Swift: `XCTest` in `mac/Tests/` | every push |
| **Integration Tests** – modules talking together | • Rust WASM ↔ JS glue via `wasm-bindgen-test`  <br/>• Swift ↔ Rust FFI tests under `mac/IntegrationTests/`  <br/>• Mock OpenAI server using `wiremock-rs` | every push |
| **End-to-End (E2E) / Functional** | • Playwright suite located at `e2e/` spins up web demo + stub backend <br/>• macOS UI automation with XCUITest for menu-bar toggling & AX injection | nightly & pre-release |
| **Smoke Tests** – post-deploy sanity | `just smoke` script runs against staging URL; checks status 200, DB write, local model load. | on deploy |
| **Regression Suite** | Entire test matrix rerun on every merge to `main`; fails if a previously tagged issue re-appears. | every merge |
| **Performance / Load** | • Rust micro-benchmarks via `criterion`  <br/>• Web demo load via `locust` scripts in `perf/`  | nightly |
| **Security / Vulnerability** | • Dependency scan with `cargo audit`, `npm audit`, `Snyk`  <br/>• OWASP ZAP baseline scan against staging demo | weekly & on release |
| **Linting & Static Analysis** | `cargo clippy -D warnings`, `eslint --max-warnings 0`, `swiftlint`, `sonarlint` | every push |
| **Code Coverage Metrics** | • Rust: `cargo tarpaulin`  <br/>• TS: `nyc`  <br/>• Swift: Xcode coverage → `xcresultparser` | PR gate ≥ 85 % |
| **Peer Review** | PR template enforces checklist; at least one approving review required. | every PR |
| **Continuous Integration** | GitHub Actions workflow `ci.yml` orchestrates all jobs in parallel; artifacts (HTML coverage, Playwright video) uploaded. | every push |

All CI logic lives in `.github/workflows/ci.yml`; local `just test-all` runs an equivalent superset to catch failures before pushing.

────────────────────────────────────────
8 • Roadmap
────────────────────────────────────────
Version | Features
---|---
v0.1 | Rust core, web demo, cloud LLM
v0.2 | macOS shell (cloud-only), shared tests
v0.3 | Downloadable local Core ML model
v0.4 | Personal dictionary + multi-language
v1.0 | Hardened notarised release, auto-update, marketing launch

────────────────────────────────────────
9 • Quick-Start for Contributors
────────────────────────────────────────
1. `pnpm i && pnpm run bootstrap` – builds WASM + installs web demo.
2. `cargo test` – run Rust unit+property tests.
3. `npm run test:shared` – executes golden vectors in TS harness.
4. `open mac/MindType.xcodeproj` – run mac app (requires AX perms). 

────────────────────────────────────────
10 • Configuration & Feature Flags
────────────────────────────────────────
• Global JSON5 file `~/.mindtype/config.json5` (hot-reloaded; project-local override `./mindtype.config.json5`).
• Environment variables with `MINDTYPE_` prefix override any key.

Example default:
```json5
{
  idleMs: 500,
  backend: "cloud",              // cloud | local | auto
  cloudEndpoint: "https://api.openai.com/v1/chat/completions",
  apiKeyEnv: "OPENAI_API_KEY",
  localModelPath: "~/Library/MindType/grammar.mlmodelc",
  temperature: 0.0,
  diffTokens: 4,
  minConfidence: 0.85,
  telemetry: true,
  retentionDays: 14,
  logLevel: "info",
  flags: {
    disableSecureFields: true,
    showDebugPanel: false
  }
}
```
Compile-time Cargo features: `cloud`, `local-ml`, `ffi`, `wasm`, `dev-panel`.

────────────────────────────────────────
11 • Live Debug / Tuning Panel
────────────────────────────────────────
Shortcut ⌥⇧⌘L (both web & macOS)
Tabs:
1. Metrics – latency graph, token counts, memory use.
2. Settings – live sliders for `idleMs`, `temperature`, `diffTokens`, backend toggle.
3. Inspector – current fragment, raw tokens, generated patches.
4. Logs – real-time structured logs (filter by level).

Implementation: React portal (web) / SwiftUI window (mac) reading & writing the
shared config ⇒ hot effect without restart.

────────────────────────────────────────
12 • Text-Replacement Enhancements
────────────────────────────────────────
1. Confidence gate – LLM must return `{text, confidence}`; if `confidence <
   minConfidence` render dotted-underline suggestion instead of auto-patch.
2. Revert-in-one-key – last patch snapshot cached 5 s; Esc or ⌘Z reverts without
   touching global undo stack.
3. Adaptive idle timer – sustained >120 wpm → idleMs ramps 500→300 ms; resets
   when pace slows.
4. Patch hysteresis – min 2 tokens *or* 50 ms between visible updates to avoid
   flicker.
5. Cursor/selection guard – compare logical caret + native selection; on mismatch
   fall back to clipboard-swap injection.

────────────────────────────────────────
13 • LLM Backend & Public API
────────────────────────────────────────
Rust trait `TokenStream` with impls: `OpenAIStream`, `CoreMLStream`, `StubStream`.
Local model: int8-quantised *distilbart-grammar* (~110 MB, ~65 ms per 250-char
sentence on M1). Downloaded on first switch to `local`; Sparkle handles delta
updates.

FFI-safe API:
```rust
extern "C" {
  fn mt_touch_key(handle: MTHandle, code_point: u32);
  fn mt_cancel(handle: MTHandle);
  fn mt_request_correction(handle: MTHandle,
                           buffer_utf8: *const u8,
                           len: usize,
                           caret: usize) -> MTRequestId;
}
```
Shared error enum: `Ok`, `ConfigInvalid`, `LLMError`, `Timeout`,
`InjectionFailed`, `PermissionDenied`.

────────────────────────────────────────
14 • Build, CI & Release
────────────────────────────────────────
• `just` tasks: `just build-web`, `just build-mac`, `just test`, `just lint`.
• GitHub Actions matrix: ubuntu-latest (Rust + wasm-pack), macos-12 (Xcode,
  notarisation dry-run).
• Pre-merge gate: `cargo clippy --all-targets -- -D warnings`, `eslint`,
  `swiftlint`, unit & property tests, Playwright e2e.
• Release: tag → build → notarise → GitHub → Sparkle feed.
• Size budgets: WASM ≤ 400 kB gz; cloud-only DMG ≤ 15 MB.

────────────────────────────────────────
15 • Pre-Flight Checklists
────────────────────────────────────────
✓ Undo/redo single step in Gmail, Notion, Slack.
✓ No plaintext leaves process when `telemetry = false`.
✓ AX injection OK on Intel & Apple Silicon.
✓ 30-min typing run increases RSS by < 20 MB.
✓ All bullets in §12 function as documented. 