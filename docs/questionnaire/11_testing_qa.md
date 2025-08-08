# Testing & Quality Assurance Strategy

_MindTyper Deep-Dive Questionnaire — Section 11 of 13_

**Progress: 12/12 questions (100%)**

This section defines MindTyper's testing strategy, quality assurance processes, and reliability requirements.

---

**178. Testing Strategy Framework?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Test pyramid (automation‑first): ~65% unit, ~25% integration, ~10% end‑to‑end (E2E). Manual UX reviews supplement, not replace, automation.
- Unit tests
  - Rust engine: tokenization, context windowing, heuristics, diff/undo, caches; property‑based tests and Unicode fuzz harness.
  - Swift app: pure logic, actors/state machines, settings, storage, entitlement guards.
  - ML components: deterministic layer/shape checks, fixed‑seed inference on micro‑fixtures.
- Integration tests
  - FFI contract (Swift ⇄ Rust): type/ABI stability, memory ownership, error mapping.
  - Data: DB migrations round‑trip, WAL/rollback behavior, dictionary import/export.
  - Model lifecycle: model load → inference → confidence gate → action routing.
  - Accessibility: simulated text field interactions (secure/IME/RTL cases) without real user text.
- E2E tests
  - XCUITest scenarios for setup, permissions, first suggestion, per‑app scopes, pause/quiet‑hours.
  - Keystroke harness feeds synthetic streams (typos, Unicode, IME, rapid bursts) and asserts latency/accuracy budgets.
- CI & cadence (macOS runners)
  - On PR: unit + integration on M‑series; E2E smoke; block merge unless green.
  - Nightly: full E2E matrix (M1/M2 + one Intel), performance suite, memory‑leak scan (leaks/valgrind), fuzzing budget.
  - Release: notarized build verification, codesign checks, delta update install test, rollback exercise.
- Test data & privacy
  - No real user text. Use synthetic corpora + licensed, de‑identified samples. Golden corpus encrypted at rest; never exfiltrate content.
  - Telemetry disabled in tests by default; when enabled, counters/timings only (content‑free).
- Environments & flags
  - Feature‑flagged risky heuristics; dev/beta/release channels with identical core settings.
  - Deterministic seeds for reproducibility; flake quarantine with 7‑day fix SLA.
- Definition of Done (DoD)
  - Coverage: ≥ 80% Rust core, ≥ 70% Swift core modules.
  - Performance: meets Section 8 p95/p99 budgets on test devices.
  - Quality: 0 open P0/P1; accessibility checklist pass; security scan pass.

---

**179. ML Model Testing & Validation?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Golden corpus: 10K–50K anonymized/synthetic sequences stratified by noise type (adjacent‑key, transposition, omission), language, layout (US/UK/DE), IME/RTL cases.
- Metrics: precision/recall/F1 overall and by bucket; acceptance targets (≥ 95% precision, ≥ 92% recall; homophone subset ≥ 90% F1).
- Gates: model updates must meet/beat prior F1 on p50/p95 latency budgets; block release on > 1% F1 drop or > 5% latency regression.
- Calibration: confidence head reliability diagrams; expected calibration error ≤ 0.05; adjust thresholds accordingly.
- Robustness: adversarial typo sets, Unicode confusables, long‑sequence drift, mixed‑language windows.
- Personalization: evaluate LoRA adapters on per‑user holdouts; ensure no catastrophic forgetting of base behaviors.
- Reproducibility: fixed random seeds; dataset versioning; model artifacts hashed and signed; test runs produce immutable reports.
- Privacy: no raw user keystrokes; only synthetic/licensed data; local evaluation pipelines.

---

**180. Performance Testing Requirements?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Latency: keystroke→suggestion p50/p95/p99 measured under synthetic streams (60–140 WPM) with bursts; targets per Section 8.
- Devices: M1/M2 baseline + representative Intel Mac; test both ANE and CPU/GPU fallback paths.
- Cold start: daemon ready ≤ 500 ms; model cold‑load ≤ 200 ms (M‑series), ≤ 500 ms (Intel).
- Memory: steady‑state typical ≤ 150 MB; hard cap ≤ 200 MB; leak tests with long‑run (≥ 2h) typing simulations.
- CPU/battery: foreground typing avg ≤ 5% of a performance core; Low Power Mode tests; thermal throttling scenarios.
- Stress: 1,000+ WPM synthetic spike to exercise backpressure and cancellation; ensure no UI jank.
- Regression: perf suite runs on PR and nightly; fail build on > 5% regression; dashboards track trends.

---

- Clarifier 11.3.a — CI Performance Budgets per Job
  - Unit tests: ≤ 8 minutes.
  - Integration tests: ≤ 12 minutes.
  - Performance suite: ≤ 15 minutes per device class.
  - E2E smoke: ≤ 6 minutes.
  - Policy: fail fast on budget overrun; auto‑quarantine flaky suites and open triage ticket.

**181. Cross-Platform Testing Strategy?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- macOS versions: current and current‑2 majors; test Intel + Apple Silicon.
- Keyboards/layouts: US/UK/DE at minimum; IME coverage (JP/CN) sanity checks; RTL text flows.
- Secure fields/IME: ensure no reads/writes where disallowed; unit tests for guardrails.
- Language packs: per‑pack validation runs and accuracy smoketests.
- Shared core: Rust engine suite runs identically across targets; future Windows shell reuses the same test corpus.

---

**182. User Experience Testing?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Usability: weekly 5‑user sessions (writers/knowledge workers); tasks: install, first suggestion, per‑app scopes, undo.
- Accessibility: VoiceOver, keyboard navigation, color contrast checks; respects reduced motion/Transparency settings.
- Journey tests: first‑run, permissions flow, pause/quiet hours, export/reset dictionary; record friction points.
- Feedback: in‑app prompt after first hour of use; optional and privacy‑respecting.

---

**183. Security Testing Implementation?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- SAST/secret scans in CI; dependency CVE scanning (Swift/Rust).
- DAST for minimal cloud endpoints (licensing/updates) with TLS pinning checks; no input content tested/transmitted.
- Pen test cadence: annual external on update/licensing services; internal quarterly review of signing/update pipeline.
- Fuzzing: tokenizer, diff/merge, and dictionary import; crashers land as tests.
- Hardening checks: codesign/notarization verification; sandbox entitlements audit per release.

---

**184. Regression Testing Framework?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Suite: unit/integration/E2E plus golden‑corpus ML validation on each PR; change‑impact selection speeds runs.
- Snapshots: UI snapshot tests for key states; visual diffs gated.
- Rollback: verify delta update apply/rollback; last‑known‑good model auto‑restore.
- Flake control: quarantine flaky tests, track, and fix within 7 days.

---

**185. Beta Testing & User Feedback?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Size: private beta 100–300 active; public beta 1–2K with invite caps.
- Selection: writers/knowledge workers on macOS; include Intel and M‑series.
- Mechanisms: in‑app feedback, short surveys, optional testimonials; maintain content‑free logs only.
- Cadence: 2‑week cycles; publish release notes; close the loop on top feedback.

---

**186. Quality Gates & Release Criteria?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Tests: green CI; coverage ≥ 80% Rust core, ≥ 70% Swift core.
- Performance: meets Section 8 latency/memory budgets on test devices; no perf regressions > 5%.
- Security: scans clean; codesign/notarization pass; dependency audit OK.
- Reliability: 0 open P0/P1; crash‑free rate ≥ 99.8% in beta channel over 7 days.
- Approvals: engineering + product + design sign‑off.

---

**187. Bug Tracking & Resolution?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Severity & SLA: P0 (crash/data loss) 24h hotfix; P1 (core broken) 3 days; P2 (major) next minor; P3 (minor) backlog.
- Triage: repro steps, device class, logs (content‑free); label by area; assign owner.
- RCA: required for P0/P1; add regression tests.
- User comms: clear release notes; notify affected beta users when fixed.

---

**188. Continuous Quality Improvement?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Monthly QA review: flakes, escapes, perf regressions; action items with owners.
- Retros: quarterly testing/process retro; adjust tools and thresholds.
- Tooling: periodic eval of fuzzers, snapshot tools, simulators; keep maintenance cost low.
- Training: security/testing refreshers; playbooks for new contributors.

---

**189. Production Monitoring & Quality?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Privacy‑first telemetry (opt‑in): latency histograms, CPU/RAM envelopes, crash reports; no content.
- Dashboards: release health by channel; alert when p95 latency or crash‑free % breaches thresholds.
- Sampling: keep overhead < 0.3% CPU, < 1 MB RAM; backoff on battery/Low Power Mode.
- Feedback loop: in‑app “something felt off?” link; bug reports pre‑filled with device class only.

---

**Navigation:**
[← Business Strategy](10_business_strategy.md) | [Design System & Guidelines →](12_design_system.md)
