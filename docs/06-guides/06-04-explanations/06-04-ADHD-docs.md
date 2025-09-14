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

### What is Mind::Type (in one breath)

- **Core idea**: While you type, we clean up text behind your cursor, safely. No cloud. No clunky UI.
- **How**: A shared brain (Rust) + thin shells (web/macOS). We stream small, caret‑safe fixes inside an “active region”.
- **Why**: Keep your flow. Low friction, low latency, local privacy.
- More detail: see `docs/01-prd/01-PRD.md` and `docs/04-architecture/README.md`.

## The Mental Model (fast map)

- **Keystrokes → Events**: `InputMonitor` emits `{ text, caret, atMs }`. See `crates/core-rs/src/monitor.rs`.
- **Scheduler**: `CorrectionScheduler` paces streaming ticks (~60–90 ms) and catch‑up after ~500 ms idle. See `crates/core-rs/src/scheduler.rs`.
- **Diffusion**: `DiffusionController` moves a frontier toward the caret, validating word‑by‑word in a trailing active region (20 words). See `crates/core-rs/src/diffusion.rs` and `docs/06-guides/06-03-reference/active-region-policy.md`.
- **Engines**: Rules (`crates/core-rs/src/workers/noise.rs`) and LM stream. Rules fix structure (typos, spaces). LM fixes semantics via the Context worker (`crates/core-rs/src/workers/context.rs`) with dual-context windows; Tone worker (`crates/core-rs/src/workers/tone.rs`) is in progress. See `docs/06-guides/06-03-reference/lm.md`.
- **Merge**: Apply tiny diffs, never at/after the caret; Unicode‑safe. Rust: `crates/core-rs/src/diff.rs`. See `docs/06-guides/06-03-reference/rust-merge.md`.
- **Host Injection**: Web updates a textarea; macOS uses Accessibility APIs. Contract in `docs/06-guides/06-03-reference/injector.md`.

## Active region (the trailing “safe zone”)

- Think: a highlight a few words behind your cursor. Corrections happen inside it.
- Size: tunable (defaults 20 words), moves as you type. See `config/defaultThresholds.ts`. For LM context, we use sentences: N previous sentences (2–5, default 3), active sentence excluded except prefix to caret.
- Two uses:
  - **Render range**: What you see as the active region.
  - **Context range**: What the LM reads around the span. See `docs/06-guides/06-03-reference/active-region-policy.md`.

## Rules vs LM (who fixes what)

- **Rules**: cheap, instant, deterministic. Good for typos, punctuation, capitalisation. File: `crates/core-rs/src/workers/noise.rs`.
- **LM**: semantic upgrades (agreement, clarity) with strict policy: span‑only prompts, short outputs, abort on input. Files: `crates/core-rs/src/lm/policy.rs`; worker runtime: Rust core LM modules. See `docs/06-guides/06-03-reference/lm.md`.
- **Priority**: On conflicts, rules win for structure; LM wins for semantics when safe. Details in `docs/06-guides/06-03-reference/lm-behavior.md`.

## Safety Nets (non‑negotiables)

- Never edit at/after the caret. TS `replaceRange`; Rust `apply_span` (target). See ADR‑0002 in `docs/adr/0002-caret-safe-diff.md`.
- Unicode‑safe boundaries (no surrogate pair splits).
- Secure fields and IME composition disable corrections. See Rust core security module.
- Reduced‑motion visuals. See platform UI motion components.

## Local‑Only by Default (privacy)

- On device only. Demo runs LM in a Worker and can fetch WASM via CDN when not local‑only; if memory is tight, we fall back to rules. See `docs/06-guides/06-03-reference/lm.md` and `docs/01-prd/01-PRD.md`.

## macOS vs Web (same brain, different hands)

- Web demo: `web-demo/` renders active region and highlights; LM runs in Rust core; merges are driven by the core (UI is thin).
- macOS: Swift app connects to Rust core via FFI and injects text via AX APIs. See `docs/06-guides/06-02-how-to/mac-app-details.md`.

## How a character becomes correct (fast path)

1. You press a key → `InputMonitor` emits an event → `CorrectionScheduler` schedules a streaming tick.
2. `DiffusionController` advances one word → rules apply a tiny diff (if safe).
3. After a pause, controller catches up to the caret. If LM is on: it selects a short span, prompts, streams, merges safely.
4. UI shows a subtle active region and highlight. Caret never moves. Undo is one step.  
   See: `crates/core-rs/src/scheduler.rs`, `crates/core-rs/src/diffusion.rs`, `crates/core-rs/src/workers/noise.rs`, `docs/06-guides/06-03-reference/lm.md`.

## Deep‑dive links (pick your lane)

- Product constraints: `docs/01-prd/01-PRD.md`, `docs/adr/0003-architecture-constraints.md`
- Architecture: `docs/04-architecture/README.md`, `docs/04-architecture/C1-context.md`, `C2-containers.md`, `C3-components.md`
- Core engines: `engines/noiseTransformer.ts`, `engines/backfillConsistency.ts`
- Diffusion & Active Region: `crates/core-rs/src/diffusion.rs`, `docs/06-guides/06-03-reference/active-region-policy.md`
- LM reference: `docs/06-guides/06-03-reference/lm.md`, `core/lm/policy.ts`, `crates/core-rs/src/*`
- Merge safety: `crates/core-rs/src/diff.rs`, `docs/06-guides/06-03-reference/rust-merge.md`, ADR‑0002
- A11y & UI: `ui/highlighter.ts`, `ui/liveRegion.ts`, `ui/motion.ts`, `docs/a11y/wcag-checklist.md`
- macOS app: `docs/06-guides/06-02-how-to/mac-app-details.md`

## FAQ (rapid fire)

- “Can it rewrite whole sentences?” Yes, but we discourage long spans; we prefer tiny, safe diffs that feel instant. See `docs/06-guides/06-03-reference/lm.md`.
- “Why not just do it in React?” We keep hot logic outside React to avoid jank; React only displays.
- "Why an active region?" It's a human‑visible bound and a safety window. It's also predictable for tests.
- “What if the LM suggests garbage?” Confidence gating + rollback + rules precedence.

## Read next (suggested path)

1. `docs/04-architecture/README.md` (big picture)
2. `docs/06-guides/06-03-reference/lm.md` (span + worker + merge rules)
3. `docs/06-guides/06-03-reference/active-region-policy.md` (render vs context)
4. `docs/06-guides/06-03-reference/injector.md` (how hosts apply diffs)
5. `docs/06-guides/06-03-reference/rust-merge.md` (low‑level merge safety)

---

## Zoom in: Why “diffusion” instead of “big apply”

- **Diffusion**: validate/apply one word at a time in a trailing active region.
  - **Why**: micro‑edits feel instant, are safer, and match undo semantics.
  - **Feels like**: video streaming – you get a usable picture early, it
    sharpens as data arrives.
- **Big apply**: compute whole‑sentence rewrite and slam it in.
  - **Risk**: caret jumps, multi‑undo spam, visible snap, conflict on resume.
- **Outcome**: small patches keep flow, reduce conflict, and are much easier
  to abort/rollback when the user keeps typing.

## Active region: design choices that matter

- **Human‑visible bound**: shows where we are “sure” right now.
- **Word‑bounded**: never ends mid‑word; optimizes both UX and model prompts.
- **Size**: 20 words maximum provides comprehensive context. Tunable.
- **Line‑aware**: render range avoids crossing fresh newlines for stability.
  See `docs/06-guides/06-03-reference/active-region-policy.md`.

## Caret safety: the core invariant

- **Rule**: never touch at/after the caret. This is enforced centrally.
- **TS implementation**:

```17:33:utils/diff.ts
export function replaceRange(
  original: string,
  start: number,
  end: number,
  text: string,
  caret: number,
): string {
  if (start < 0 || end < start || end > original.length) {
    throw new Error('Invalid range');
  }
  // ⟢ Guard: never allow edits that reach or cross the caret
  if (end > caret) {
    throw new Error('Range crosses caret');
  }
```

- **Unicode safety**: also guards surrogate pairs so we never split emoji or
  compound graphemes.
- **Rust parity**: `apply_span` will mirror these checks and be the canonical
  engine for hosts. See `docs/06-guides/06-03-reference/rust-merge.md`.

## LM policy: tight prompts, small outputs, strict merges

- **Span selection**: pick a short span near the caret, end on a boundary.

```60:67:core/lm/policy.ts
export function selectSpanAndPrompt(
  text: string,
  caret: number,
  cfg: LMBehaviorConfig = defaultLMBehaviorConfig,
): SpanAndPrompt {
  const activeRegion = computeSimpleActiveRegion(text, caret);
  if (!activeRegion) return { activeRegion: null, prompt: null, span: null, maxNewTokens: 0 };
  const span = text.slice(activeRegion.start, activeRegion.end);
  if (span.length < cfg.minSpanChars)
    return { activeRegion: null, prompt: null, span: null, maxNewTokens: 0 };
```

- **Prompt template** (no stories, only the fix):

```60:67:core/lm/policy.ts
  const instruction =
    'Correct ONLY the Span. Do not add explanations or extra words. Return just the corrected Span.';
  const prompt = `${instruction}\nContext before: «${ctxBefore}»\nSpan: «${span}»\nContext after: «${ctxAfter}»`;
  const maxNewTokens = Math.min(
    Math.ceil(span.length * cfg.maxTokensFactor) + 6,
    cfg.maxTokensCap,
  );
```

- **Streaming**: tokens are accumulated and then merged only within the active region.
- **Abort/stale‑drop**: any new keystroke cancels the in‑flight generation.
- **Precedence**: structural fixes (rules) beat semantic rewrites (LM) when
  they collide, because structure changes alter tokenization.

## Events and visuals: what the host listens for

- **Active region**: consistent signal for UI and a11y.

```35:44:ui/highlighter.ts
export function emitActiveRegion(_range: { start: number; end: number }) {
  const g = globalThis as unknown as MinimalGlobal;
  if (g.dispatchEvent && g.CustomEvent) {
    const event = new g.CustomEvent('mindtype:activeRegion', {
      detail: { start: _range.start, end: _range.end },
    });
    g.dispatchEvent(event);
  }
}
```

- **Highlight**: transient flash when a diff is applied – useful for learning
  and perf measurement.

## Timing: a feel‑good timeline (typical)

- 0 ms: keydown → `InputMonitor.emit`
- ~0–4 ms: `CorrectionScheduler` ticks, `DiffusionController.tickOnce`
- ~4–10 ms: active region recomputed; rules propose a tiny diff (or advance frontier)
- ~10–16 ms: `emitActiveRegion` dispatches; UI paints at next frame
- 500 ms idle: `catchUp()` finalizes the active region up to the caret
- LM on idle: span prompt built, stream/merge happens strictly within active region

## macOS injection (how text actually changes)

- **AX APIs**: insert text diff where supported.
- **Clipboard fallback**: copy replacement span + `Cmd‑V` if needed.
- **Undo**: group LM/rule edits so one `Cmd‑Z` reverts the correction cycle.
- See `docs/06-guides/06-02-how-to/mac-app-details.md` and `docs/06-guides/06-03-reference/injector.md`.

## Security & IME (when to do nothing)

- **Secure fields**: password/credit‑card fields: engine is off.
- **IME composition**: while composing (Japanese, Chinese, etc.), engine waits.
- **Blur/Focus**: we abort streams on blur; resume on focus.

## Performance budgets (PRD‑level)

- **Latency**: p95 ≤ 15 ms on M‑series; ≤ 30 ms on Intel.
- **Memory**: typical ≤ 150 MB; LM worker unloads if approaching limit.
- **Jank**: LM runs in a Worker; UI thread stays smooth.

## Tuning playbook (what to tweak first)

- **Typing tick (ms)**: 60–90 ms feels lively; 120 ms for reduced‑motion.
- **Active region size**: up to 20 words maximum; optimize for precision and performance. The older term "tapestry" is now "active region".
- **Cooldown**: 300–500 ms after a merge to avoid spam.

## How we know it works (tests you can trust)

- **Unit**: caret safety, surrogate pairs, policy guards, device detection.
- **Integration**: diffusion ticks, active region trailing, catch‑up on pause.
- **BDD**: acceptance scenarios for streamed diffusion and local LM.
- **E2E**: web demo Playwright (soon) and macOS sample app.

## Common pitfalls (we fixed or prevented)

- Mid‑word edits: banned by policy; wait for a boundary.
- Large rewrites: token cap and span cap; stream only inside active region.
- Caret jumps: injector preserves caret; diffs never reach it.
- Over‑correction: confidence gating and rules‑first precedence.

## Roadmap (what’s next)

- FT‑234/235: LM‑in‑controller + Injector abstraction (host‑agnostic).
- FT‑238: LM Worker with memory guard and graceful degradation.
- FT‑134: Rust caret‑safe merge + FFI.
- FT‑400+ mac shell: menu bar toggle, AX injector, undo grouping.

## Glossary (first‑pass)

- **Active region**: trailing region where we are “confident now”.
- **Frontier**: leftmost index not yet validated – it chases the caret.
- **Span**: the exact sub‑range we propose to replace (inside the active region).
- **Caret‑safe**: no change at/after the caret, Unicode boundaries respected.
