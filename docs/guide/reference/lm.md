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

## Overview

- Core orchestrates LM usage inside the Context stage with dual-context architecture. UI is thin.
- **Click-to-Activate**: LM initializes on user focus/click with dual-context setup.
- **Dual-Context System**: Wide context (full document) for global awareness + close context (2-5 sentences) for focused corrections.
- We select a short span behind the caret, build a context‑aware prompt using both contexts,
  stream tokens, validate proposals, then merge only within the band. Never at/after caret.
- In the web demo, Transformers.js runs in a Web Worker for smooth UI.

## Contract (adapter)

```ts
export interface LMStreamParams {
  text: string;
  caret: number;
  band: { start: number; end: number };
  settings?: Record<string, unknown> & {
    prompt?: string;
    maxNewTokens?: number;
    wideContext?: string;      // Full document context (new)
    closeContext?: string;     // Focused sentence context (new)
  };
}

export interface LMContextManager {
  initialize(fullText: string, caretPosition: number): Promise<void>;
  isInitialized(): boolean;
  updateWideContext(fullText: string): void;
  updateCloseContext(fullText: string, caretPosition: number): void;
  getContextWindow(): LMContextWindow;
  validateProposal(originalText: string, spanStart: number, spanEnd: number, proposalText: string): boolean;
}

export interface LMContextWindow {
  wide: {
    text: string;
    lastUpdated: number;
    tokenCount: number;
  };
  close: {
    text: string;
    start: number;
    end: number;
    caretPosition: number;
    sentences: string[];
  };
}
```

Invariants:
- Caret safety (REQ‑IME‑CARETSAFE): never emit/merge edits at/after the caret.
- Band‑bounded merges only; no cross‑band writes.

## Behavior policy (dual-context → selection → prompt → validation → post‑process)

### Dual-Context Architecture

- **Wide Context**: Full document text with token estimation for global awareness
- **Close Context**: 2-5 sentences around caret (configurable via `getSentenceContextPerSide()`)
- **Context Updates**: Real-time updates as user types and moves caret
- **Click-to-Activate**: Initialize contexts on user focus/click events

### Span Selection and Prompting

- Span selection via `selectSpanAndPrompt(text, caret, cfg)` with safeguards:
  - Ends on a boundary; min/max characters; token cap.
  - Context window uses dual-context: wide context for coherence + close context for focus.
  - Active sentence excluded except prefix up to caret.
- Prompt template enhanced with dual-context: "return corrected Span only" + context awareness.
- Post‑process trims artifacts, rejects oversized or off‑band outputs.

### Proposal Validation

- **Context Validation**: Proposals validated against wide context for coherence
- **Length Validation**: Reject proposals with >50% length change from original
- **Content Validation**: Reject empty proposals for non-empty spans
- **Semantic Validation**: Future enhancement for semantic similarity checks

References: `core/lm/contextManager.ts`, `core/lm/policy.ts`, `engines/contextTransformer.ts`,
`config/defaultThresholds.ts`.

## Worker runtime (web)

- Transformers.js runs in a module Worker to keep the main thread responsive.
- **Enhanced Protocol** with dual-context support:
  - `init({ localOnly, wasmPaths, localModelPath })`
  - `generate({ prompt, maxNewTokens, requestId, wideContext?, closeContext? })` → emits `chunk`
  - `abortAll()`
- **Host responsibilities**:
  - Single‑flight per caret; abort stale on new keystroke.
  - Warm‑up once per session; then respect cooldowns by backend.
  - Configure ONNX Runtime WASM paths for CDN when not local‑only.
  - **Context Management**: Initialize and update dual-context via LMContextManager.
  - **Error Handling**: 30-second timeout, comprehensive error propagation.

### WorkerAdapter Integration

- **Error Recovery**: Handles worker creation failures, timeouts, and communication errors
- **Health Monitoring**: Tracks worker status and performance metrics
- **Context Integration**: Seamlessly integrates with LMContextManager for dual-context processing

References: `web-demo/src/worker/lmWorker.ts`, `core/lm/workerAdapter.ts`,
`core/lm/transformersRunner.ts`, `core/lm/contextManager.ts`.

## Backends and assets

- Backends: WebGPU → WASM → CPU (auto).
- ORT WASM binaries via CDN when `localOnly=false`:
  set `env.backends.onnx.wasm.wasmPaths`.

## Confidence & gating

- `τ_input` → try Context; `τ_commit` → apply; `τ_tone` → tone apply; `τ_discard`.
- Scores combine input fidelity, transform quality, coherence, decay.
References: `core/confidenceGate.ts`, `core/stagingBuffer.ts`.

## Accessibility & safety

- Secure fields and IME composition pause/disable LM.
- Unicode‑safe merges; caret protection in `utils/diff.ts`.

## Quick start (web demo)

1) **Click to Activate**: Click or focus on the text area to initialize dual-context LM system.
2) **Monitor Status**: Check workbench LM tab for context initialization and worker health.
3) **Test Corrections**: Use presets in LM Lab (`/#/lab`) to validate corrections with dual-context.
4) **Adjust Settings**: Configure context window (2–5 sentences) in demo; persists to localStorage.
5) **Debug Issues**: Use browser console and workbench logs for troubleshooting.

### Integration Example

```typescript
// Initialize context manager
const contextManager = createLMContextManager();
await contextManager.initialize(fullText, caretPosition);

// Create worker adapter
const adapter = createWorkerLMAdapter(() => new Worker(...));

// Use in context transformer
const contextWindow = contextManager.getContextWindow();
for await (const chunk of adapter.stream({
  text, caret, band,
  settings: {
    prompt: selection.prompt,
    maxNewTokens: selection.maxNewTokens,
    wideContext: contextWindow.wide.text.slice(0, 2000),
    closeContext: contextWindow.close.text
  }
})) {
  // Process streaming response
}

// Validate proposal
if (contextManager.validateProposal(originalText, spanStart, spanEnd, proposalText)) {
  // Apply correction
}
```

## Sources

- Intl.Segmenter (sentence): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter
- Transformers.js (browser): https://huggingface.co/docs/transformers.js/index
- ONNX Runtime Web (WASM paths): https://onnxruntime.ai/docs/execution-providers/JavaScript-API.html#webassembly-ep

