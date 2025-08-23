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
- **How**: A shared brain (Rust) + thin shells (web/macOS). We stream small, caret‑safe fixes inside an “active region”.
- **Why**: Keep your flow. Low friction, low latency, local privacy.
- More detail: see `docs/PRD.md` and `docs/architecture/README.md`.

## The Mental Model (fast map)

- **Keystrokes → Events**: `TypingMonitor` emits `{ text, caret, atMs }`. See `core/typingMonitor.ts`.
- **Scheduler**: `SweepScheduler` paces streaming ticks (~60–90 ms) and catch‑up after ~500 ms idle. See `core/sweepScheduler.ts`.
- **Diffusion**: `DiffusionController` moves a frontier toward the caret, validating word‑by‑word in a trailing band (3–8 words). See `core/diffusionController.ts` and `docs/guide/reference/band-policy.md`.
- **Engines**: Rules (`engines/tidySweep.ts`) and (optional) LM stream. Rules fix structure (typos, spaces). LM fixes semantics. See `docs/guide/reference/lm-behavior.md`.
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
- **LM**: semantic upgrades (agreement, clarity) with strict policy: span‑only prompts, short outputs, abort on input. Files: `core/lm/policy.ts`, v0.2 orchestrator in `crates/core-rs/src/*`.
- **Priority**: On conflicts, rules win for structure; LM wins for semantics when safe. Details in `docs/guide/reference/lm-behavior.md`.

## Safety Nets (non‑negotiables)

- Never edit at/after the caret. TS `replaceRange`; Rust `apply_span` (target). See ADR‑0002 in `docs/adr/0002-caret-safe-diff.md`.
- Unicode‑safe boundaries (no surrogate pair splits).
- Secure fields and IME composition disable corrections. See `core/security.ts`.
- Reduced‑motion visuals. See `ui/motion.ts`, `ui/highlighter.ts`.

## Local‑Only by Default (privacy)

- On device only. Demo defaults to local models when LM is enabled; if memory is tight, we fall back to rules. See `docs/guide/reference/lm-worker.md` and `docs/PRD.md`.

## macOS vs Web (same brain, different hands)

- Web demo: `web-demo/` renders band and highlights; rules run today. Soon, LM merges are driven by the core (not the React component).
- macOS: Swift app connects to Rust core via FFI and injects text via AX APIs. See `docs/guide/how-to/mac-app-details.md`.

## How a character becomes correct (fast path)

1. You press a key → `TypingMonitor` emits an event → `SweepScheduler` schedules a streaming tick.
2. `DiffusionController` advances one word → rules apply a tiny diff (if safe).
3. After a pause, controller catches up to the caret. If LM is on: it selects a short span, prompts, streams, merges safely.
4. UI shows a subtle band and highlight. Caret never moves. Undo is one step.  
   See: `core/sweepScheduler.ts`, `core/diffusionController.ts`, `engines/tidySweep.ts`, `docs/guide/reference/lm-behavior.md`.

## Deep‑dive links (pick your lane)

- Product constraints: `docs/PRD.md`, `docs/adr/0003-architecture-constraints.md`
- Architecture: `docs/architecture/README.md`, `docs/architecture/C1-context.md`, `C2-containers.md`, `C3-components.md`
- Core engines: `engines/tidySweep.ts`, `engines/backfillConsistency.ts`
- Diffusion & Band: `core/diffusionController.ts`, `docs/guide/reference/band-policy.md`
- LM behavior: `docs/guide/reference/lm-behavior.md`, `core/lm/policy.ts`, `docs/guide/reference/lm-worker.md`, `crates/core-rs/src/*`
- Merge safety: `utils/diff.ts`, `docs/guide/reference/rust-merge.md`, ADR‑0002
- A11y & UI: `ui/highlighter.ts`, `ui/liveRegion.ts`, `ui/motion.ts`, `docs/a11y/wcag-checklist.md`
- macOS app: `docs/guide/how-to/mac-app-details.md`

## FAQ (rapid fire)

- “Can it rewrite whole sentences?” Yes, but we discourage long spans; we prefer tiny, safe diffs that feel instant. See `docs/guide/reference/lm-behavior.md`.
- “Why not just do it in React?” We keep hot logic outside React to avoid jank; React only displays.
- “Why a band?” It’s a human‑visible bound and a safety window. It’s also predictable for tests.
- “What if the LM suggests garbage?” Confidence gating + rollback + rules precedence.

## Read next (suggested path)

1. `docs/architecture/README.md` (big picture)
2. `docs/guide/reference/lm-behavior.md` (span + merge rules)
3. `docs/guide/reference/band-policy.md` (render vs context)
4. `docs/guide/reference/injector.md` (how hosts apply diffs)
5. `docs/guide/reference/rust-merge.md` (low‑level merge safety)

---

## Zoom in: Why “diffusion” instead of “big apply”

- **Diffusion**: validate/apply one word at a time in a trailing band.
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
- **Size**: 3–8 words defaults hit a sweet spot (signal vs latency). Tunable.
- **Line‑aware**: render range avoids crossing fresh newlines for stability.
  See `docs/guide/reference/band-policy.md`.

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
  engine for hosts. See `docs/guide/reference/rust-merge.md`.

## LM policy: tight prompts, small outputs, strict merges

- **Span selection**: pick a short span near the caret, end on a boundary.

```41:56:core/lm/policy.ts
export function selectSpanAndPrompt(
  text: string,
  caret: number,
  cfg: LMBehaviorConfig = defaultLMBehaviorConfig,
): SpanAndPrompt {
  const band = computeSimpleBand(text, caret);
  if (!band) return { band: null, prompt: null, span: null, maxNewTokens: 0 };
  const span = text.slice(band.start, band.end);
  if (span.length < cfg.minSpanChars)
    return { band: null, prompt: null, span: null, maxNewTokens: 0 };
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

- **Streaming**: tokens are accumulated and then merged only within the band.
- **Abort/stale‑drop**: any new keystroke cancels the in‑flight generation.
- **Precedence**: structural fixes (rules) beat semantic rewrites (LM) when
  they collide, because structure changes alter tokenization.

## Events and visuals: what the host listens for

- **Active region**: consistent signal for UI and a11y.

```35:44:ui/highlighter.ts
export function emitActiveRegion(_range: { start: number; end: number }) {
  const g = globalThis as unknown as MinimalGlobal;
  if (g.dispatchEvent && g.CustomEvent) {
    const event = new g.CustomEvent('mindtyper:activeRegion', {
      detail: { start: _range.start, end: _range.end },
    });
    g.dispatchEvent(event);
  }
}
```

- **Highlight**: transient flash when a diff is applied – useful for learning
  and perf measurement.

## Timing: a feel‑good timeline (typical)

- 0 ms: keydown → `TypingMonitor.emit`
- ~0–4 ms: `SweepScheduler` ticks, `DiffusionController.tickOnce`
- ~4–10 ms: band recomputed; rules propose a tiny diff (or advance frontier)
- ~10–16 ms: `emitActiveRegion` dispatches; UI paints at next frame
- 500 ms idle: `catchUp()` finalizes the band up to the caret
- LM on idle: span prompt built, stream/merge happens strictly within band

## macOS injection (how text actually changes)

- **AX APIs**: insert text diff where supported.
- **Clipboard fallback**: copy replacement span + `Cmd‑V` if needed.
- **Undo**: group LM/rule edits so one `Cmd‑Z` reverts the sweep.
- See `docs/guide/how-to/mac-app-details.md` and `docs/guide/reference/injector.md`.

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
- **Band size**: start 3–8 words; enlarge only if LM is highly precise.
- **Cooldown**: 300–500 ms after a merge to avoid spam.

## How we know it works (tests you can trust)

- **Unit**: caret safety, surrogate pairs, policy guards, device detection.
- **Integration**: diffusion ticks, band trailing, catch‑up on pause.
- **BDD**: acceptance scenarios for streamed diffusion and local LM.
- **E2E**: web demo Playwright (soon) and macOS sample app.

## Common pitfalls (we fixed or prevented)

- Mid‑word edits: banned by policy; wait for a boundary.
- Large rewrites: token cap and span cap; stream only inside band.
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
- **Span**: the exact sub‑range we propose to replace (inside the band).
- **Caret‑safe**: no change at/after the caret, Unicode boundaries respected.
