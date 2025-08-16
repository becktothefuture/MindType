<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  IMPLEMENTATION PLAN (AUTO)  ░░░░░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Auto-inserted live plan header per house rules
    • WHY  ▸ Keep plan visible, structured, and traceable
    • HOW  ▸ Updated by agent in PLAN_ONLY/EXECUTE modes
-->

# Implementation Plan (live)

> Plan (auto) — 2025-08-09 (Updated for Local LM Integration)
>
> Core milestones in sequence:
>
> 1. Foundation (Dev Environment + Core Utils) ✅
> 2. Core Engine Implementation (Rules + LM Integration)
> 3. UI/UX Integration (Streaming Visuals + Demo)
> 4. Performance Optimization
> 5. Extended Features

> Current status (beginner-friendly)
>
> - We have the streaming foundation complete:
>   - ✅ TypeScript streaming pipeline: TypingMonitor → SweepScheduler → DiffusionController → TidySweep
>   - ✅ Word-by-word diffusion with Unicode segmentation and validation band (3-8 words)
>   - ✅ Caret safety enforced at all levels; comprehensive tests (23 passing)
>   - ✅ Basic rule engine with 5 common typo corrections
>   - ✅ Integration tests proving end-to-end functionality
> - What's not done yet:
>   - **Pipeline Integration:** `index.ts` wiring TODO; web demo uses WASM not TS pipeline
>   - **Contextual Rules:** Only simple word substitutions; need transpositions, punctuation, capitalization
>   - **Local LM:** No on-device model integration yet for semantic/grammatical corrections
>   - **Visual Feedback:** `renderValidationBand()` is stub; no actual DOM shimmer/highlight
>   - **Demo Integration:** Web demo needs connection to TS pipeline for live testing

> **How Cursor uses this file**
>
> - Picks the **first unchecked** task from the highest active Stage.
> - **PLAN_ONLY** may append tasks using the Task Schema; **EXECUTE** fulfils them.
> - Keep tasks atomic; prefer many small boxes over one vague one.

## Quality Gates & Definition of Done (RULE)

For every task (especially P1), the following must be true before marking complete:

- Tests: Unit tests for new logic; at least one integration or acceptance test if user-observable behaviour changes.
- Gates: `pnpm typecheck && pnpm lint && pnpm run -s format:check && pnpm test` all pass locally and in CI; coverage guard remains green.
- Coverage: Maintain overall ≥90% and preserve 100% branches for `utils/**`; new surfaces aim for ≥90% branches unless justified.
- A11y/Perf (when applicable): Reduced‑motion branches tested; p95 latency and memory constraints not regressed.
- Docs: Update this plan and PRD traceability; note any toggles/flags.

Task checklist template (copy into PR description):

- [ ] Unit tests added/updated
- [ ] Integration/acceptance test mapped to `docs/qa/acceptance/*` (if applicable)
- [ ] Typecheck, lint, format:check green
- [ ] Coverage thresholds satisfied
- [ ] Accessibility/performance checks (if applicable)
- [ ] `docs/implementation.md` + PRD traceability updated

## Stage 1 — Foundation & Setup ✅

### Architecture Constraints (P1) ✅

- [x] (P1) [FT-105] Document architecture constraints  
       **AC:** - Document on-device processing requirement - List prohibited features (cloud processing, heavy UI) - Create architecture decision record (ADR)
      **Owner:** @alex  
       **DependsOn:** None  
       **Source:** PRD → Goals (MUST/WON'T)

### Development Environment (P1) ✅

- [x] (P1) [FT-110] Initialize project structure  
       **AC:** Directory structure matches PRD; README updated  
      **Owner:** @alex  
       **DependsOn:** None  
       **Source:** Project Structure Doc

- [x] (P1) [FT-111] Setup TypeScript configuration  
       **AC:** `tsconfig.json` with strict mode; ES2024 target  
      **Owner:** @alex  
       **DependsOn:** FT-110  
       **Source:** README.md → Development

- [x] (P1) [FT-112] Configure ESLint v9 flat config  
       **AC:** TypeScript + Prettier integration; documented rules  
      **Owner:** @alex  
       **DependsOn:** FT-111  
       **Source:** README.md → Development

- [x] (P1) [FT-113] Setup Vitest with coverage  
       **AC:** Unit tests run; coverage reports generated  
      **Owner:** @alex  
       **DependsOn:** FT-111  
       **Source:** PRD → Quality Gates

- [x] (P1) [FT-114] Configure Prettier and add format gates  
       **AC:** `pnpm format` and `pnpm format:check` scripts exist; `.prettierrc` checked in; repo runs format check in CI  
      **Owner:** @alex  
       **DependsOn:** FT-111  
       **Source:** README.md → Development Workflow

- [x] (P1) [FT-117] Add CI pipeline (GitHub Actions) for quality gates  
       **AC:** CI runs `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`; caches pnpm; uploads coverage artifact  
      **Owner:** @alex  
       **DependsOn:** FT-112, FT-113, FT-114  
       **Source:** PRD → Quality Gates

- [x] (P1) [FT-118] Enforce coverage thresholds  
       **AC:** Vitest config enforces ≥90% lines/statements overall; `utils/**` at 100% branches; CI fails below thresholds  
      **Owner:** @alex  
       **DependsOn:** FT-113, FT-117  
       **Source:** PRD → Testing & QA

### Security & Privacy Implementation (P1)

- [x] (P1) [FT-115] Implement secure field detection  
        **AC:** - Detect password/secure input fields - Disable corrections automatically - Test coverage for all field types
       **Owner:** @alex  
        **DependsOn:** FT-113  
        **Source:** PRD REQ-SECURE-FIELDS

- [x] (P1) [FT-116] Add IME composition handling  
       **AC:** - Detect active IME composition - Disable corrections during composition - Support major IME systems
      **Owner:** @alex  
       **DependsOn:** FT-115  
       **Source:** PRD REQ-SECURE-FIELDS

### Core Utils Implementation (P1) ✅

- [x] (P1) [FT-120] Implement caret-safe diff core  
       **AC:** - `utils/diff.ts` with `replaceRange` function - Never crosses caret position - Handles UTF-16 surrogate pairs - 100% test coverage
      **Owner:** @alex  
       **DependsOn:** FT-113  
       **Source:** PRD REQ-IME-CARETSAFE

- [x] (P1) [FT-121] Create typing monitor  
       **AC:** - `core/typingMonitor.ts` emits timestamped events - Event shape: `{text, caret, atMs}` - Unit tests for event emission
      **Owner:** @alex  
       **DependsOn:** FT-120  
       **Source:** Manifesto → Performance

- [x] (P1) [FT-122] Implement pause detection  
       **AC:** - Detect SHORT_PAUSE_MS (500ms) and LONG_PAUSE_MS (2000ms) - Cancellable timer implementation - Unit tests for timing accuracy
      **Owner:** @alex  
       **DependsOn:** FT-121  
       **Source:** PRD → Performance

- [ ] (P1) [FT-123] Add basic logging and error paths  
       **AC:** Minimal logger util with levels; logs timing and rule decisions behind a debug flag; unit tests verify no output when disabled  
       **Owner:** @alex  
       **DependsOn:** FT-121  
       **Source:** PRD → Observability

- [x] (P1) [FT-124] Parameterize thresholds in `config/defaultThresholds.ts`  
       **AC:** Expose `SHORT_PAUSE_MS`, `LONG_PAUSE_MS`, `MAX_SWEEP_WINDOW`, `TYPING_TICK_MS`, `MIN_VALIDATION_WORDS`, `MAX_VALIDATION_WORDS`; add unit tests asserting invariants and ranges; docs link to PRD  
       **Owner:** @alex  
       **DependsOn:** FT-122  
       **Source:** PRD → Constraints / Performance

- [x] (P1) [FT-125] Implement DiffusionController  
       **AC:** `core/diffusionController.ts` with Unicode word segmentation; advances frontier word-by-word; integrates with validation band renderer; catch-up on pause  
       **Owner:** @alex  
       **DependsOn:** FT-124  
       **Source:** REQ-STREAMED-DIFFUSION, REQ-VALIDATION-BAND

### Rust Core Setup (P1)

- [ ] (P1) [FT-130] Setup Rust crate structure  
       **AC:** - `crates/core-rs` initialized - WASM target configured - Basic FFI bindings
      **Owner:** @alex  
       **DependsOn:** FT-110  
       **Source:** Core Rust Details

- [ ] (P1) [FT-131] Implement fragment extraction  
       **AC:** - Unicode-aware sentence segmentation - Handles bidirectional text - Performance benchmarks
      **Owner:** @alex  
       **DependsOn:** FT-130  
       **Source:** Core Rust Details

## Stage 2 — Core Engines & Integration

### Pipeline Integration (P1) **← PRIORITY**

- [x] (P1) [FT-201] Wire main pipeline in index.ts  
       **AC:** Connect TypingMonitor → SweepScheduler → DiffusionController signals; start event loop; export unified API for host apps; unit tests verify signal flow; add minimal `LMAdapter` stub to keep API stable  
       **Owner:** @alex  
       **DependsOn:** FT-125  
       **Source:** index.ts TODO comment

- [x] (P1) [FT-202] Create integration test harness  
       **AC:** End-to-end test simulating user typing → corrections applied; verify caret safety, timing, and band progression; performance baseline  
       **Owner:** @alex  
       **DependsOn:** FT-201  
       **Source:** Integration requirements

### Tidy Sweep Implementation (P1)

- [x] (P1) [FT-210] Create tidy sweep engine scaffold  
       **AC:** - Basic engine structure in `engines/tidySweep.ts` - Rule interface defined - Test infrastructure
      **Owner:** @alex  
       **DependsOn:** FT-120  
       **Source:** PRD REQ-TIDY-SWEEP

- [x] (P1) [FT-211] Implement transposition detection  
       **AC:** - Detect common character swaps ("nto"→"not", "precsson"→"precision") - Stay within 80-char window - Return null when uncertain - Handle contextual transpositions
      **Owner:** @alex  
       **DependsOn:** FT-210  
       **Source:** User example: "mindtypr is nto a tooll" → "MindTyper is not a tool"

- [x] (P1) [FT-212] Add punctuation normalization  
       **AC:** - Fix spacing around punctuation ("page — a sweep" formatting) - Handle quotes, apostrophes, emdashes - Language-aware rules - Sentence boundaries
      **Owner:** @alex  
       **DependsOn:** FT-211  
       **Source:** User example: punctuation spacing issues

- [x] (P1) [FT-213] Implement confidence gating and null-return conditions  
       **AC:** Define confidence thresholds per rule; return `null` below threshold; unit tests cover low-confidence cases; never apply uncertain fixes  
       **Owner:** @alex  
       **DependsOn:** FT-210  
       **Source:** PRD REQ-TIDY-SWEEP (return null when unsure)

- [x] (P1) [FT-214] Add whitespace normalization rules  
       **AC:** Collapse multiple spaces ("mov it lstens" → "move it listens"); normalize trailing spaces in window; never cross caret; unit tests for boundary cases  
       **Owner:** @alex  
       **DependsOn:** FT-210  
       **Source:** User example: missing spaces between words

- [x] (P1) [FT-216] Add capitalization rules  
       **AC:** Sentence-start capitalization; "I" pronoun fixes; proper noun detection; context-aware confidence scoring  
       **Owner:** @alex  
       **DependsOn:** FT-212  
       **Source:** User example: "mindtypr" → "MindTyper", sentence starts

- [ ] (P2) [FT-215] Establish rule priority and conflict resolution  
       **AC:** Document rule ordering; deterministic application; tests for conflicting suggestions  
       **Owner:** @alex  
       **DependsOn:** FT-211, FT-212, FT-214, FT-216  
       **Source:** Manifesto → Safety guarantees

### Local LM Integration (P1) **← NEW SECTION**

- [ ] (P1) [FT-230] Design LM adapter interface  
       **AC:** Define `LMAdapter` interface for streaming corrections; support band-bounded context; fallback to rules when LM unavailable; caret-safe constraints  
       **Owner:** @alex  
       **DependsOn:** FT-213  
       **Source:** User example: "raw → corrected" transformation quality

- [ ] (P1) [FT-231] Implement local model bootstrap  
       **AC:** Transformers.js integration with Qwen2.5-0.5B-Instruct (q4 quantized ~150MB); WebGPU acceleration; streaming token interface; grammar/style correction focus  
       **Owner:** @alex  
       **DependsOn:** FT-230  
       **Source:** Transformers.js research + on-device processing

- [ ] (P1) [FT-232] Add LM streaming merge policy  
       **AC:** Stream tokens into validation band only; merge with rule-based fixes; confidence weighting; rollback on user input; extensive caret safety tests  
       **Owner:** @alex  
       **DependsOn:** FT-231  
       **Source:** REQ-STREAMED-DIFFUSION + LM quality

- [ ] (P2) [FT-233] Implement LM fallback and settings  
       **AC:** Graceful degradation to rules-only mode; user toggle for LM vs rules; performance monitoring; A/B testing framework  
       **Owner:** @alex  
       **DependsOn:** FT-232  
       **Source:** Reliability requirements

### Backfill Implementation (P2)

- [ ] (P2) [FT-220] Create backfill consistency engine  
       **AC:** - Engine structure in `engines/backfillConsistency.ts` - Stable zone detection - Test framework
      **Owner:** @alex  
       **DependsOn:** FT-210  
       **Source:** Manifesto → Features

- [ ] (P2) [FT-221] Implement name consistency  
       **AC:** - Track name variants - Propose normalizations - Context-aware confidence
      **Owner:** @alex  
       **DependsOn:** FT-220  
       **Source:** PRD → Consistency

- [ ] (P2) [FT-222] Add punctuation/capitalization normalization (stable zone)  
       **AC:** Normalize double spaces, terminal punctuation, sentence case only in stable zone; unit tests verify zone boundaries  
       **Owner:** @alex  
       **DependsOn:** FT-220  
       **Source:** PRD → Consistency

- [ ] (P2) [FT-223] Enforce stable-zone boundaries  
       **AC:** No edits at/after caret; clamp edits ≥ MAX_SWEEP_WINDOW behind caret; unit tests for off-by-one bounds  
       **Owner:** @alex  
       **DependsOn:** FT-220, FT-124  
       **Source:** PRD → Constraints

## Stage 3 — UI & Live Demo Integration

### Visual Feedback (P1)

- [x] (P1) [FT-310] Implement highlighter core  
       **AC:** - Validation band (3–8 words) trailing behind caret with DOM manipulation - Subtle shimmer animation; fade/static when reduced‑motion - Applied correction highlights - Minimal, non-intrusive UI
      **Owner:** @alex  
       **DependsOn:** FT-201  
       **Source:** PRD REQ-A11Y-MOTION + REQ-VALIDATION-BAND

- [ ] (P1) [FT-311] Add ARIA announcements  
       **AC:** - Screen reader notifications for corrections - Configurable verbosity - WCAG 2.2 AA compliant
      **Owner:** @alex  
       **DependsOn:** FT-310  
       **Source:** PRD → Accessibility

- [ ] (P1) [FT-312] Run accessibility audit and reduced-motion tests  
       **AC:** Add axe checks for color/aria; unit test for `prefers-reduced-motion`; document SR announcement copy  
       **Owner:** @alex  
       **DependsOn:** FT-311  
       **Source:** PRD REQ-A11Y-MOTION

### Live Demo Integration (P1) **← PRIORITY**

- [x] (P1) [FT-315] Wire TypeScript pipeline to web demo  
       **AC:** Replace WASM usage with TS streaming pipeline; connect textarea events to TypingMonitor; render validation band and corrections in real-time; add parameter controls (tick, band size)  
       **Owner:** @alex  
       **DependsOn:** FT-310, FT-201  
       **Source:** Web demo needs live testing capability
  - [x] (P1) [FT-315A] Add typing cadence control (slider)  
         **AC:** UI slider mapped to `TYPING_TICK_MS` (30–150 ms); live update without reload; persisted to `localStorage`; reduced‑motion toggle respects slower defaults  
         **Owner:** @alex  
         **DependsOn:** FT-315  
         **Source:** Flow tuning / visual playground

  - [x] (P1) [FT-315B] Add validation band size controls (sliders)  
         **AC:** Two sliders mapped to `MIN_VALIDATION_WORDS` (1–5) and `MAX_VALIDATION_WORDS` (3–12); enforce `min ≤ max`; live update; persisted to `localStorage`  
         **Owner:** @alex  
         **DependsOn:** FT-315  
         **Source:** Flow tuning / visual playground

- [ ] (P1) [FT-316] Add demo controls and settings  
       **AC:** Toggle for rules vs LM mode; band size adjustment; timing controls; performance display; reset functionality; export/import presets  
       **Owner:** @alex  
       **DependsOn:** FT-315  
       **Source:** Demo usability for testing different configurations

- [ ] (P1) [FT-317] Create demo scenarios  
       **AC:** Pre-loaded text samples showing "raw → corrected" transformations; step-through mode; before/after comparisons; performance metrics  
       **Owner:** @alex  
       **DependsOn:** FT-316  
       **Source:** User example transformations for validation

### Undo Integration (P2)

- [ ] (P2) [FT-320] Implement undo grouping  
       **AC:** - Group changes per sweep - Single undo step - Preserve caret position
      **Owner:** @alex  
       **DependsOn:** FT-310  
       **Source:** Manifesto → Features

- [ ] (P2) [FT-321] Expose test hooks for UI timing and selection  
       **AC:** Deterministic timers for tests; data-testids for highlight; unit tests assert caret unchanged  
       **Owner:** @alex  
       **DependsOn:** FT-320  
       **Source:** BDD → Validation band scenarios

- [ ] (P2) [FT-322] Add Playwright e2e for BDD scenarios  
       **AC:** Tests for caret safety and streaming diffusion mapped to `docs/qa/acceptance/*.feature`; CI job runs on PR  
       **Owner:** @alex  
       **DependsOn:** FT-321  
       **Source:** PRD → Scenarios (BDD)

- [ ] (P2) [FT-323] Add screen-reader announcement tests (jsdom)  
       **AC:** Verify aria-live updates and politeness; snapshot SR copy  
       **Owner:** @alex  
       **DependsOn:** FT-311  
       **Source:** PRD → Accessibility

## Stage 4 — Performance Optimization

### Profiling & Monitoring (P2)

- [ ] (P2) [FT-410] Setup performance monitoring  
       **AC:** - Track p95 latency (≤15ms target) - Memory usage monitoring - Telemetry infrastructure
      **Owner:** @alex  
       **DependsOn:** FT-320  
       **Source:** PRD → Performance

- [ ] (P2) [FT-411] Implement Rust benchmarks  
       **AC:** - Criterion benchmarks for core operations - Performance regression testing - Documentation
      **Owner:** @alex  
       **DependsOn:** FT-131  
       **Source:** Core Rust Details

- [ ] (P2) [FT-412] Add latency test harness  
       **AC:** Harness records keystroke→correction latency; reports p95; failing test if > targets; docs capture results  
       **Owner:** @alex  
       **DependsOn:** FT-410  
       **Source:** PRD → Success Metrics (Latency)

### Memory Optimization (P2)

- [ ] (P2) [FT-420] Optimize memory usage  
       **AC:** - Stay under 150MB typical - Memory leak detection - Garbage collection tuning
      **Owner:** @alex  
       **DependsOn:** FT-410  
       **Source:** PRD → Performance

- [ ] (P2) [FT-421] Instrument undo-rate metric  
       **AC:** Capture total edits vs. user undos; compute % and report; goal ≤0.5%; CI prints current baseline  
       **Owner:** @alex  
       **DependsOn:** FT-320, FT-410  
       **Source:** PRD → Success Metrics (Undo rate)

- [ ] (P2) [FT-422] Add memory tracking harness  
       **AC:** Script captures Node/V8 heap during sweeps; alerts if typical >150MB or cap >200MB; docs include snapshot  
       **Owner:** @alex  
       **DependsOn:** FT-410  
       **Source:** PRD → Success Metrics (Memory)

## Stage 5 — Extended Features

### Advanced LM Features (P2) **← NEW SECTION**

- [ ] (P2) [FT-520] Context-aware semantic corrections  
       **AC:** Use broader context for semantic coherence; handle agreement, tense consistency; confidence scoring for semantic vs syntactic fixes  
       **Owner:** @alex  
       **DependsOn:** FT-232  
       **Source:** User example: advanced grammatical corrections

- [ ] (P2) [FT-521] Adaptive learning from user patterns  
       **AC:** Local learning from user corrections/undos; adapt correction confidence; personalized vocabulary; privacy-preserving local storage  
       **Owner:** @alex  
       **DependsOn:** FT-421  
       **Source:** Personalization without cloud data

### Production Features (P3)

- [ ] (P3) [FT-901] Plugin system for custom rules
- [ ] (P3) [FT-902] Language-specific rule sets
- [ ] (P3) [FT-903] Cloud sync infrastructure (if requested)
- [ ] (P3) [FT-904] macOS secure field enforcement (AX)
  - **AC:** Detect secure fields via AX; disable edits; unit test in sample app
  - **Source:** mac_app_details.md
- [ ] (P3) [FT-905] Demo signup server (email capture)
  - **AC:** Minimal Express server; opt-in telemetry; GDPR note
  - **Source:** web_demo_details.md → Implementation Notes
- [ ] (P3) [FT-906] Activation/NPS measurement plan
  - **AC:** Define measurement approach; optional prompts in demo; docs updated
  - **Source:** PRD → Success Metrics

## Traceability Matrix

### Core Requirements

1. REQ-SECURE-FIELDS
   - FT-115: Secure field detection
   - FT-116: IME composition handling

2. REQ-IME-CARETSAFE
   - FT-120: Caret-safe diff implementation
   - FT-210: Tidy sweep engine
   - FT-211: Transposition detection

3. REQ-TIDY-SWEEP
   - FT-210, FT-211, FT-212: Sweep engine and rules
   - FT-220: Backfill consistency

4. REQ-A11Y-MOTION
   - FT-310: Highlighter with motion preferences
   - FT-311: ARIA support

5. REQ-STREAMED-DIFFUSION ← NEW
   - FT-125: DiffusionController implementation
   - FT-201: Pipeline integration
   - FT-310: Validation band rendering

6. REQ-VALIDATION-BAND ← NEW
   - FT-310: Band visualization (3-8 words)
   - FT-315: Live demo integration

7. REQ-LOCAL-LM-INTEGRATION ← NEW
   - FT-230: LM adapter interface
   - FT-231: Local model bootstrap
   - FT-232: Streaming merge policy

### Architecture Requirements

- On-device Processing
  - FT-105: Architecture constraints
  - FT-130: Rust core setup (WASM-ready)
  - FT-231: Local LM (no cloud)

### Performance Requirements

- Latency (p95 ≤ 15ms)
  - FT-410: Performance monitoring
  - FT-411: Rust benchmarks

- Memory (≤ 150MB typical)
  - FT-420: Memory optimization
  - FT-422: Memory tracking harness
  - FT-231: LM memory constraints

### Success Metrics

- Undo rate ≤ 0.5%
  - FT-421: Undo-rate instrumentation

- Activation ≥ 70% (week 1), NPS ≥ 50
  - FT-906: Measurement plan (demo/backlog)

### Completion Criteria

Stage completion requires:

1. All tasks marked complete
2. Tests passing (100% coverage for core)
3. Performance targets met
4. Accessibility compliance verified
5. Documentation updated
