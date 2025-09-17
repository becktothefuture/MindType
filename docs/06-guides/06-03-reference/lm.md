<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  L M   ( B E H A V I O R  +  W O R K E R )  ░░░░░  ║
  ║                                                      ║
  ║   Single source of truth: span selection, prompting, ║
  ║   streaming, worker runtime, and safe merging.       ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ How LM integrates with the core pipeline
    • WHY  ▸ Correct semantics while staying caret‑safe and fast
    • HOW  ▸ Core‑owned policy + Web Worker runner + gated merges
-->

## Overview (v0.6+)

**Revolutionary Context**: LM integration supports the **Correction Marker** system and **Seven Scenarios** through device-tier optimization.

- Core orchestrates LM usage inside the Context stage. UI is thin.
- We select a short span behind the caret, build a context‑aware prompt,
  stream tokens, then merge only within the active region. Never at/after caret.
- Dual‑context windowing is used: Close (2–5 nearby sentences, active excluded) and Wide (document‑level) for coherence validation.
- In the web demo, Transformers.js runs in a Web Worker for smooth UI.

## Contract (adapter)

```ts
export interface LMStreamParams {
  text: string;
  caret: number;
  active_region: { start: number; end: number };
  settings?: Record<string, unknown> & {
    prompt?: string;
    maxNewTokens?: number;
  };
}
```

Invariants:

- Caret safety (REQ‑IME‑CARETSAFE): never emit/merge edits at/after the caret.
- Active-region-bounded merges only; no cross‑region writes.

## Behavior policy (selection → prompt → post‑process)

- Span selection via `selectSpanAndPrompt(text, caret, cfg)` with safeguards:
  - Ends on a boundary; min/max characters; token cap.
  - Context window is sentence‑based: include N previous sentences (N∈[2,5], default 3), active sentence excluded except prefix up to caret.
  - Dual‑context validation: proposals from Close context are checked for coherence against the Wide context before commit.
- Prompt template is minimal: “return corrected Span only.”
- Post‑process trims artifacts, rejects oversized or off‑region outputs.

References: `core/lm/policy.ts`, `core/activeRegionPolicy.ts`,
`config/defaultThresholds.ts`.

## Worker runtime (web)

- Transformers.js runs in a module Worker to keep the main thread responsive.
- Protocol:
  - `init({ localOnly, wasmPaths, localModelPath })`
  - `generate({ prompt, maxNewTokens, requestId })` → emits `chunk`
  - `abortAll()`
- Host responsibilities:
  - Single‑flight per caret; abort stale on new keystroke.
  - Warm‑up once per session; then respect cooldowns by backend.
  - Configure ONNX Runtime WASM paths for CDN when not local‑only (see `core/lm/transformersRunner.ts`).

References: `web-demo/src/worker/lmWorker.ts`, `core/lm/workerAdapter.ts`,
`core/lm/transformersRunner.ts`.

## Backends and assets

- Backends: WebGPU → WASM → CPU (auto).
- ORT WASM binaries via CDN when `localOnly=false`:
  set `env.backends.onnx.wasm.wasmPaths` (CDN) or `/wasm/` (local).

## Confidence & gating

- `τ_input` → try Context; `τ_commit` → apply; `τ_tone` → tone apply; `τ_discard`.
- Scores combine input fidelity, transform quality, coherence, decay.
  References: `core/confidenceGate.ts`, `core/stagingBuffer.ts`.

## Accessibility & safety

- Secure fields and IME composition pause/disable LM.
- Unicode‑safe merges; caret protection in `utils/diff.ts`.

## Quick start (web demo)

1. Enable LM in UI; worker starts automatically.
2. Use presets in LM Lab (`/#/lab`) to validate corrections; observe Close/Wide context panels.
3. Adjust sentence context window slider (2–5) in the demo; persists to localStorage.

## Sources

- Intl.Segmenter (sentence): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter
- Transformers.js (browser): https://huggingface.co/docs/transformers.js/index
- ONNX Runtime Web (WASM paths): https://onnxruntime.ai/docs/execution-providers/JavaScript-API.html#webassembly-ep

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
