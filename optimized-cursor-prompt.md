# 🧠 MindType Cursor AI Development Prompt

## PROJECT CONTEXT

- **Repo**: `/Users/alexanderbeck/Coding Folder /MindType`
- **Source of Truth**: `docs/implementation.md` (ordered checklist of 1500+ tasks)
- **Goal**: Reach flawless LM typing corrections in browser-based MVP
- **Definition of MVP**: Web demo at `http://localhost:5173` that captures keystrokes, runs local LM corrections (Qwen2.5-0.5B-Instruct), shows live corrected text with per-keystroke latency, retains caret position, and passes all E2E tests

## CONSTRAINTS

- **No large rewrites**. Ship in small, reversible steps following our established patterns
- **Each step must**: (1) plan using Todo2 workflow, (2) implement, (3) add/update tests, (4) run quality gates, (5) commit with scoped message
- **Never skip quality gates**: `pnpm ci` must pass (typecheck + lint + format + test + doc:check)
- **If task unclear**: Propose smallest sensible assumption, label it ASSUMPTION, and proceed
- **Follow Swiss-grid comment headers**: Use our established comment style guide
- **Documentation-first**: Update docs before code changes; run `pnpm doc:sync` after

## LOOP CONTROLLER

You will iterate over `docs/implementation.md` top-to-bottom:

1. **READ** the next unchecked task from implementation.md
2. **CREATE TODO** using our Todo2 workflow (assess complexity, create appropriate task count)
3. **RESEARCH** local codebase + internet for 2025 information (mandatory)
4. **EXECUTE** edits/commands following our patterns
5. **TEST**: Run `pnpm ci` (typecheck + lint + format + test + doc:check)
6. **VERIFY** acceptance criteria for that task
7. **COMMIT** on green. If red, fix or revert
8. **MARK** task as done in implementation.md with checkbox
9. **REFINE** todos based on completion learnings

Repeat until browser MVP Definition of Done is met.

## WEB PLAN (MVP SCOPE)

- **Location**: `web-demo/` (Vite + React + TypeScript)
- **Modules**:
  - `core/` - Three-stage pipeline (Noise → Context → Tone) with confidence gating
  - `engines/` - Transformers (noiseTransformer, contextTransformer, toneTransformer)
  - `core/lm/` - LM integration with streaming, device tiers, and fallback
  - `ui/` - Visual feedback with mechanical swap and reduced-motion support
- **Flags**: `MT_LM_AVAILABLE=local|remote` for model strategy
- **Tests**: Vitest unit tests + Playwright E2E tests
- **Commands**:
  - `pnpm ci` - Full quality gate (typecheck + lint + format + test + doc:check)
  - `pnpm test` - Unit tests with coverage
  - `pnpm -w -r test` - Workspace tests
  - `cd e2e && pnpm test` - E2E tests
  - `pnpm doc:sync` - Sync documentation headers
  - `pnpm doc:check` - Verify documentation consistency

## ACCEPTANCE CRITERIA (WEB MVP)

- **Typing demo** runs at `http://localhost:5173`
- **Live LM corrections** ≤30ms median latency on WebGPU, ≤100ms on WASM
- **Caret safety** maintained during all corrections (never edit at/after caret)
- **Workbench metrics** show LM runs > 0, backend detection, and performance stats
- **E2E tests pass**: All Playwright tests in `e2e/tests/` pass consistently
- **Quality gates green**: `pnpm ci` passes with ≥90% test coverage
- **Documentation updated**: All changes reflected in docs with proper traceability

## CURRENT ARCHITECTURE (v0.4)

- **Core Pipeline**: `core/diffusionController.ts` orchestrates three-stage flow
- **LM Integration**: `core/lm/transformersClient.ts` with streaming and device tiers
- **Confidence Gating**: `core/confidenceGate.ts` with mathematical scoring
- **Staging Buffer**: `core/stagingBuffer.ts` with state machine
- **Visual Feedback**: `ui/swapRenderer.ts` with mechanical swap animations
- **Web Demo**: `web-demo/src/App.tsx` with LM Lab and workbench
- **Testing**: Comprehensive test suite with 95%+ coverage

## QUALITY GATES (MANDATORY)

- **Lint**: ESLint v9 flat config passes
- **Typecheck**: TypeScript strict mode passes
- **Format**: Prettier formatting consistent
- **Tests**: Vitest unit tests + Playwright E2E tests pass
- **Coverage**: ≥90% overall, 100% for `utils/**`
- **Documentation**: `pnpm doc:check` passes
- **Accessibility**: WCAG 2.2 AA compliance
- **Performance**: No memory leaks, latency targets met

## SYSTEM INSTRUCTIONS FOR CURSOR

- **Use Todo2 workflow**: Create todos for every user request, assess complexity appropriately
- **Research first**: Always search local codebase + internet before implementation
- **Show exact files**: List files you will create/change before writing
- **Follow patterns**: Use established Swiss-grid headers, naming conventions, and architecture
- **Update implementation.md**: Mark tasks complete with checkboxes as you finish
- **Commit messages**: Use conventional format `feat(core): add LM streaming reliability`
- **Documentation sync**: Run `pnpm doc:sync` after doc changes

## CURRENT PRIORITY TASKS (from implementation.md)

Based on our analysis, focus on these high-priority items:

1. **LM-501**: Debug LM streaming reliability using enhanced diagnostic logging
2. **LM-501A**: Validate corrections work end-to-end in browser dev tools
3. **LM-501B**: Test health monitoring indicators in workbench LM tab
4. **FT-318A**: Demo applies corrections into textarea (cross-browser)
5. **FT-231G**: Logging gates and resource cleanup

## FALLBACK STRATEGIES

- **LM fails**: Graceful degradation to rules-only mode
- **Tests fail**: Fix or revert, never commit red builds
- **Documentation out of sync**: Run `pnpm doc:sync` and fix conflicts
- **Performance issues**: Check device tier detection and adaptive policies
- **Browser compatibility**: Test in Chrome, Safari, and Firefox

## START

1. **Parse** `docs/implementation.md` and identify next unchecked task
2. **Create todo** using Todo2 workflow with appropriate complexity assessment
3. **Research** local codebase + internet for current best practices
4. **Plan** minimal step to advance MVP
5. **Execute** following our established patterns
6. **Verify** with quality gates
7. **Commit** and mark task complete
8. **Refine** todos based on learnings

## SUCCESS METRICS

- **LM runs > 0**: Visible corrections in browser demo
- **E2E tests pass**: All Playwright scenarios pass consistently
- **Quality gates green**: `pnpm ci` passes with high coverage
- **Documentation current**: All changes reflected in docs
- **Performance targets**: Latency and memory constraints met
- **User experience**: Smooth typing with invisible corrections

---

**Remember**: This is a sophisticated TypeScript project with extensive testing, documentation, and quality gates. Follow our established patterns, maintain high standards, and build incrementally toward flawless LM typing corrections.
