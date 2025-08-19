<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  M I N D T Y P E R   ( A D H D   G U I D E )  ░░░  ║
  ║                                                      ║
  ║   Deep but friendly. Short chunks. Clear links.      ║
  ║   Skimmable first, detailed when you want it.        ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ A long-form yet skimmable explanation of how it all works
    • WHY  ▸ Faster comprehension, fewer tabs, deeper understanding
    • HOW  ▸ Layered bullets, tiny sections, many cross-links
-->

### What is MindTyper (in one breath)

- **Core idea**: While you type, we clean up text behind your cursor, safely. No cloud. No clunky UI.
- **How**: A shared brain (Rust) + thin shells (web/macOS). We stream small, caret‑safe fixes inside a “validation band”.
- **Why**: Keep your flow. Low friction, low latency, local privacy.
- More detail: see `docs/PRD.md` and `docs/architecture_overview.md`.

## The Mental Model (fast map)

- **Keystrokes → Events**: `TypingMonitor` emits `{ text, caret, atMs }`. See `core/typingMonitor.ts`.
- **Scheduler**: `SweepScheduler` paces streaming ticks (~60–90 ms) and catch‑up after ~500 ms idle. See `core/sweepScheduler.ts`.
- **Diffusion**: `DiffusionController` moves a frontier toward the caret, validating word‑by‑word in a trailing band (3–8 words). See `core/diffusionController.ts` and `docs/guide/reference/band-policy.md`.
- **Engines**: Rules (`engines/tidySweep.ts`) and (optional) LM stream. Rules fix structure (typos, spaces). LM fixes semantics. See `docs/lm_behavior.md`.
- **Merge**: Apply tiny diffs, never at/after the caret; Unicode‑safe. TS: `utils/diff.ts`. Rust: `docs/guide/reference/rust-merge.md` (target).
- **Host Injection**: Web updates a textarea; macOS uses Accessibility APIs. Contract in `docs/guide/reference/injector.md`.

## Band (the trailing “safe zone”)

- Think: a highlight a few words behind your cursor. Corrections happen inside it.
- Size: tunable (defaults 3–8 words), moves as you type. See `config/defaultThresholds.ts`.
- Two uses:
  - **Render range**: What you see as the band.
  - **Context range**: What the LM reads around the span. See `docs/guide/reference/band-policy.md`.

## Rules vs LM (who fixes what)

- **Rules**: cheap, instant, deterministic. Good for typos, punctuation, capitalisation. File: `engines/tidySweep.ts`.
- **LM**: semantic upgrades (agreement, clarity) with strict policy: span‑only prompts, short outputs, abort on input. Files: `core/lm/policy.ts`, `core/lm/transformersRunner.ts`.
- **Priority**: On conflicts, rules win for structure; LM wins for semantics when safe. Details in `docs/lm_behavior.md`.

## Safety Nets (non‑negotiables)

- Never edit at/after the caret. TS `replaceRange`; Rust `apply_span` (target). See ADR‑0002 in `docs/adr/0002-caret-safe-diff.md`.
- Unicode‑safe boundaries (no surrogate pair splits).
- Secure fields and IME composition disable corrections. See `core/security.ts`.
- Reduced‑motion visuals. See `ui/motion.ts`, `ui/highlighter.ts`.

## Local‑Only by Default (privacy)

- On device only. Demo defaults to local models when LM is enabled; if memory is tight, we fall back to rules. See `docs/guide/reference/lm-worker.md` and `docs/PRD.md`.

## macOS vs Web (same brain, different hands)

- Web demo: `web-demo/` renders band and highlights; rules run today. Soon, LM merges are driven by the core (not the React component).
- macOS: Swift app connects to Rust core via FFI and injects text via AX APIs. See `docs/mac_app_details.md`.

## How a character becomes correct (fast path)

1. You press a key → `TypingMonitor` emits an event → `SweepScheduler` schedules a streaming tick.
2. `DiffusionController` advances one word → rules apply a tiny diff (if safe).
3. After a pause, controller catches up to the caret. If LM is on: it selects a short span, prompts, streams, merges safely.
4. UI shows a subtle band and highlight. Caret never moves. Undo is one step.  
   See: `core/sweepScheduler.ts`, `core/diffusionController.ts`, `engines/tidySweep.ts`, `docs/lm_behavior.md`.

## Deep‑dive links (pick your lane)

- Product constraints: `docs/PRD.md`, `docs/adr/0003-architecture-constraints.md`
- Architecture: `docs/architecture_overview.md`, `docs/architecture/C1-context.md`, `C2-containers.md`, `C3-components.md`
- Core engines: `engines/tidySweep.ts`, `engines/backfillConsistency.ts`
- Diffusion & Band: `core/diffusionController.ts`, `docs/guide/reference/band-policy.md`
- LM behavior: `docs/lm_behavior.md`, `core/lm/policy.ts`, `core/lm/transformersRunner.ts`, `docs/guide/reference/lm-worker.md`
- Merge safety: `utils/diff.ts`, `docs/guide/reference/rust-merge.md`, ADR‑0002
- A11y & UI: `ui/highlighter.ts`, `ui/liveRegion.ts`, `ui/motion.ts`, `docs/a11y/wcag-checklist.md`
- macOS app: `docs/mac_app_details.md`

## FAQ (rapid fire)

- “Can it rewrite whole sentences?” Yes, but we discourage long spans; we prefer tiny, safe diffs that feel instant. See `docs/lm_behavior.md`.
- “Why not just do it in React?” We keep hot logic outside React to avoid jank; React only displays.
- “Why a band?” It’s a human‑visible bound and a safety window. It’s also predictable for tests.
- “What if the LM suggests garbage?” Confidence gating + rollback + rules precedence.

## Read next (suggested path)

1. `docs/architecture_overview.md` (big picture)
2. `docs/lm_behavior.md` (span + merge rules)
3. `docs/guide/reference/band-policy.md` (render vs context)
4. `docs/guide/reference/injector.md` (how hosts apply diffs)
5. `docs/guide/reference/rust-merge.md` (low‑level merge safety)
