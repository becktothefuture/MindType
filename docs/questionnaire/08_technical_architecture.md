# Technical Architecture & Performance Requirements

_MindTyper Deep-Dive Questionnaire — Section 8 of 13_

**Progress: 15/15 questions (100%)**

This section defines the core technical architecture, performance constraints, and implementation requirements for MindTyper.

---

**141. Core Technology Stack Selection?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- macOS app: Swift (AppKit for always-on menubar/daemon bits; SwiftUI for settings & the Caps‑Lock modal).
- On‑device ML: Core ML as the primary runtime, targeting Apple Neural Engine first; fall back to CPU/GPU via Core ML automatically. Use Metal Performance Shaders only for bespoke kernels if profiling shows wins.
- Typing/engine core: Rust library for all performance‑critical text processing (tokenization, context window management, caches, heuristics). Expose a C ABI via cbindgen (or UniFFI) and call from Swift.
- Data & storage: SQLite (via GRDB or Core Data) for local preferences/dictionaries; UserDefaults for simple flags.
- Interop/build: SwiftPM for app modules; Cargo for Rust crates; reproducible builds pinned via lockfiles.
- Web demo: Lightweight vanilla JS + Vite (no framework) to keep the “aha” demo simple and fast; optional TypeScript later if we grow the demo.
- Testing: XCTest for app, cargo test for Rust, golden‑corpus tests for the engine, and UI tests for the Caps‑Lock modal.
- CI/CD: GitHub Actions (macOS runners) for build, unit tests, performance regression checks, and notarized releases.

Note on cross‑platform: the Rust engine is the shared core (tokenization, heuristics, caches, scoring) compiled per‑platform and exposed via a stable FFI (C ABI / UniFFI). That enables reuse across macOS now, and Windows/Linux/iOS later with native UIs.

---

**142. Performance Benchmarks & SLAs?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Latency (local, on-device):
  - Keystroke→suggestion compute: p95 ≤ 15 ms, p99 ≤ 25 ms (M‑series baseline); Intel fallback p95 ≤ 30 ms.
  - UI paint/commit: p95 ≤ 8 ms (no frame drops at 60 Hz).
  - Cold start (daemon ready): ≤ 500 ms; model cold‑load: M‑series ≤ 200 ms, Intel ≤ 500 ms.
- Resource budgets:
  - RAM: Typical ≤ 150 MB, hard cap ≤ 200 MB (auto‑evict caches under pressure).
  - CPU: foreground typing avg ≤ 5%, spikes p95 ≤ 15% of one performance core.
  - Disk: app + core model ≤ 300 MB; each optional language pack 50–200 MB.
- Battery & thermals:
  - On battery/Low Power Mode: compute reduced to meet ≤ 1.5 W incremental draw (target), no sustained fan spin‑ups on Intel.
- Accuracy & quality:
  - Correction accuracy (golden corpus): ≥ 95% precision, ≥ 92% recall overall; homophone/phonetic subset ≥ 90% F1.
  - Suggestion acceptance rate (real‑world): baseline ≥ 25% in week 1; ≥ 35% by week 4 with personalization.
  - False‑positive corrections (user undo within 2 s): ≤ 0.5% of edits.
- Stability & reliability:
  - Crash‑free sessions: ≥ 99.8% daily; daemon restarts invisible to user.
  - Data integrity: zero loss of user dictionaries/preferences (auto‑save every 30 s).
- Cloud (licensing/sync only):
  - Service availability: ≥ 99.9% monthly.
  - Sync round‑trip: p95 ≤ 400 ms (small payloads), fully async so typing is never blocked.
  - Offline‑first: 100% core functionality without network.
- Monitoring & verification:
  - Automated perf suite runs on each build (M1/M2 + representative Intel).
  - Ship with lightweight, privacy‑safe telemetry for counters/latency (opt‑in where required).
  - Regressions > 5% on any p95 metric block release.

---

**143. On-Device ML Model Architecture?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Goal: Compact, fast noise‑to‑intent correction—not a giant LLM. Optimized for Apple Neural Engine first, with seamless CPU/GPU fallback via Core ML.
- Backbone: Small Transformer encoder (not decoder‑heavy LM). Baseline: 12 layers, d_model 384, 6 heads, GELU. Trained on subword BPE (~16k vocab) with a light character‑level front end (CNN) to capture typos/adjacent‑key noise.
- Multi‑task heads:
  - Next‑token / next‑char suggestion
  - Edit‑tagging (keep/replace/insert/delete) for inline correction
  - Confidence head for suppression/underline logic
- Personalization: On‑device, privacy‑safe adapters (LoRA r=4) + user lexicon boosts; per‑user delta ~2–5 MB; no raw keystrokes stored beyond a short rolling buffer in RAM.
- Quantization & size: INT8 per‑channel by default (Core ML), INT4 variant for battery‑saver/older Intel.
- Base EN pack: ≤ 80 MB on disk (fits our RAM budget). Slim pack: ≤ 30 MB for Low Power Mode / older hardware.
- Language packs: Shared backbone + language‑specific heads/lexicons; packs ship 50–200 MB each depending on script/coverage.
- Inference constraints (to meet 8.2): p95 ≤ 15 ms keystroke→suggestion on M‑series; beam size ≤ 4, top‑k/top‑p capped for determinism; context window ≤ 256 tokens (sliding window with locality bias).
- Updates: Delta model updates only; integrity‑checked, resumable; instant rollback path.
- Fallbacks: If ANE unavailable, use Metal Performance Shaders kernels > CPU; if model fails to load, fall back to rule‑based spellcheck.
- Privacy: All inference on‑device; rolling context buffer ephemeral (RAM only), never written to disk.

---

**144. Data Flow & Processing Pipeline?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Single‑pass, low‑latency pipeline: Keystroke → Context Buffer (RAM) → Rust Engine (tokenize + noise features) → Core ML Inference (ANE‑first) → Confidence Gate → Action (apply/queue/ignore) → UI Commit.
- Context buffer: rolling window ≤ 256 tokens; never written to disk.
- Batching: none for per‑keystroke; micro‑batch only for background model updates.
- Confidence gate: apply instantly when high‑confidence and caret‑safe; otherwise queue as a click‑to‑apply suggestion.
- Fallbacks: if ML fails or exceeds 25 ms p99, degrade to rule‑based spellcheck until health recovers.
- Telemetry (opt‑in): aggregate counters/latency only; no content.

---

**145. Memory Management Strategy?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Budgets: hard cap ≤ 200 MB, typical ≤ 150 MB.
- Lazy/pooled loads: load base model on first use; unload language packs not used in 30 min (LRU).
- Caches: LRU context/features cache ≤ 10 MB; purge on memory pressure notifications.
- Storage: SQLite for preferences/dictionaries; VACUUM quarterly; WAL mode with size guard.
- Rust: arena allocators for hot paths; periodic trim; leak detection in CI with valgrind/leaks on macOS.
- Swift: use autoreleasepool {} around heavy ops; monitor with signposts; respond to NSProcessInfo.thermalState and memory warnings.

---

**146. Threading & Concurrency Model?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- UI: main thread only (SwiftUI/AppKit).
- Inference: dedicated inference worker (one concurrent op; coalesces rapid keystrokes).
- I/O & sync: background queues (QoS utility).
- State: Swift actors guard shared state; Rust uses message‑passing channels; cross‑boundary calls via FFI are synchronous and short.
- Debounce: 8–12 ms debounce for keystrokes to avoid stampedes; immediate on pause.
- Typing tick: 60–90 ms cadence to advance a diffusion frontier that validates/corrects word‑by‑word behind the caret.
- Cancellation: every job cancellable; newest keystroke supersedes older tasks.

---

**147. API Design & Integration Points?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- macOS Accessibility API for text access/editing; Core Graphics/Quartz only for minimal visuals.
- Public surface: no third‑party app plugins at v1; stable internal FFI (Swift ⇄ Rust) kept versioned.
- Future hooks: optional sync REST for settings/profile deltas; no content APIs.
- Permissions: request only what’s required for accessibility editing and network (if sync/licensing enabled).

---

- Clarifier 8.6.a — FFI Error Domains & Codes

  |       Domain | Code Range | Examples                                                       |
  | -----------: | :--------: | -------------------------------------------------------------- |
  | FFI_BOUNDARY |    100x    | 100: NullPointer, 101: InvalidUTF8, 102: BufferTooSmall        |
  |   MODEL_LOAD |    200x    | 200: NotFound, 201: SignatureMismatch, 202: UnsupportedVersion |
  |    INFERENCE |    300x    | 300: Timeout, 301: OutOfMemory, 302: InternalKernelError       |
  |  ENTITLEMENT |    400x    | 400: NotSignedIn, 401: TokenExpired, 402: DeviceLimitReached   |
  |         DATA |    500x    | 500: CorruptDB, 501: MigrationFailed, 502: WriteDenied         |

- Clarifier 8.7.a — Keystroke Processing Sequence

  ```mermaid
  sequenceDiagram
    participant HostApp as Host App
    participant Swift as Swift App
    participant Rust as Rust Core
    participant CoreML as Core ML
    HostApp->>Swift: Keystroke event
    Swift->>Rust: Tokenize + noise features
    Rust->>CoreML: Inference (ANE-first)
    CoreML-->>Rust: Edits + confidence
    Rust-->>Swift: Action (apply / queue / ignore)
    Swift-->>HostApp: Commit via Accessibility API
    Note over Swift,Rust: New keystroke cancels in-flight work
    Swift-->>HostApp: Rollback to last-known-good on failure
  ```

---

**148. Error Handling & Recovery?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Degradation ladder: ML inference → rule‑based spellcheck → no‑op (never corrupt text).
- Auto‑save: dictionaries/preferences every 30 s; integrity checked on boot.
- Retries: network/licensing with exponential backoff and jitter; offline always allowed.
- Corruption: verify model/dictionary signatures; auto‑rollback to last good version.
- User communication: one‑line human message + undo available; no stack traces.

---

**149. Scalability & Performance Optimization?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- On‑device: guardrails (p95/p99 alerts) from perf tests; feature flags to ship small and iterate.
- Model pipeline: quantization‑aware training; per‑release profiling on M‑series + Intel; automatic regression gates.
- Cloud (lightweight): stateless licensing/sync can scale horizontally; CDN for model deltas.
- A/B: gate risky heuristics; collect opt‑in aggregate metrics only; roll back on > 5% regression.

---

**150. Security Architecture?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Data boundaries: keystroke content never leaves device; ephemeral RAM buffers only.
- At rest: SQLite + preferences encrypted (FileVault user space + keychain‑stored keys for any app secrets).
- In transit (if enabled): TLS 1.3; per‑device keys; signed model/dictionary updates; replay protection.
- Hardening: code signing + notarization; secure bootstrapping; sandbox entitlements minimum.
- Supply chain: pinned dependencies; reproducible builds; SBOM; signature checks on load.

---

**151. Deployment & Update Strategy?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Release cadence: monthly minors; quarterly majors.
- Rollout: staged 1% → 10% → 100% with health gates (crash‑free %, latency p95, undo spikes).
- Updates: differential/delta updates for models & packs; atomic swap; instant rollback.
- Communications: human‑readable changelog; in‑app “What’s new” after major changes.
- Compatibility: forward‑compatible settings schema with migration tests.

---

**152. Monitoring & Observability?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Privacy‑first telemetry (opt‑in): counters, timings, device class; no content capture.
- Crash reporting: symbolicated, scrubbed of PII; rate‑limited upload.
- Dashboards: latency (p50/95/99), CPU/RAM, crash‑free %, false‑positive rate (proxied by undos).
- Alerts: on SLA breach (e.g., p95 > 15 ms), crash‑free < 99.8%, memory > 180 MB typical.
- Sampling: keep overhead < 0.3% CPU, < 1 MB RAM.

---

**153. Development & Testing Infrastructure?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Repo & CI: GitHub + Actions (macOS runners) building SwiftPM + Cargo; signed/notarized artifacts.
- Test pyramid: unit (Swift/XCTest + Rust), integration (FFI), E2E (UI), golden‑corpus ML tests.
- Performance gates: automated latency/RAM tests; fail build on > 5% regression.
- Environments: dev, beta, release channels via feature flags.
- Code quality: mandatory reviews; static analysis (SwiftLint, Clippy); dependency audit in CI.

---

**154. Data Architecture & Storage?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Local‑first: SQLite (dictionaries, personalization deltas, settings), UserDefaults for trivial flags.
- Schema: versioned migrations (idempotent, reversible).
- Sync (optional): settings/profile deltas only; small JSON docs; end‑to‑end encrypted.
- Backups: rely on OS backups; our DB is safe to snapshot; provide export/import of user dictionary.
- Retention: rolling cleanup of stale personalization; never store raw text content.

- Clarifier 8.14.a — Personalization Storage Caps & Compaction
  - Cap: per‑user personalization deltas capped at 5 MB on disk.
  - Compaction: weekly job merges and trims; SQLite VACUUM quarterly.
  - Eviction: LRU removes oldest deltas when cap exceeded; keep high‑impact, recent data.
  - Controls: expose "Compact now" and "Reset personalization" in app settings.

---

**155. Cross-Platform Compatibility?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Shared core: Rust engine + model artifacts are identical across platforms, exposed via stable C ABI/UniFFI.
- Platform UIs: native shells (SwiftUI/AppKit on macOS; WinUI/WPF on Windows later; UIKit on iOS) that call the same core.
- Behavioral parity: same correction rules, thresholds, and test corpus across platforms.
- Packaging: per‑platform model containers; unified dictionary format (JSON) and migrations.
- Compatibility targets: macOS (current‑2 major versions), Intel fallback supported; roadmap for Windows uses the same Rust core.

---

**Navigation:**
[← Model Adaptation & Personalization](07_model_adaptation_personalization.md) | [Security & Privacy Implementation →](09_security_privacy.md)
