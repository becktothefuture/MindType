<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  L M   S T R E A M   P R O T O C O L  ░░░░░░░░░░░  ║
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
    • WHAT ▸ JSONL event protocol for two‑pass LM (context → tone)
    • WHY  ▸ Stream small, typed events for debuggability and speed
    • HOW  ▸ Event types: meta, rules, stage, diff, commit, log, done
-->

### Overview

This document defines a minimal JSON Lines (JSONL) streaming protocol for a two‑pass LM pipeline: a first pass that performs ContextWorker within an active region, and a second pass that applies ToneWorker to the corrected output. The protocol prioritizes small, typed events that are easy to parse and monitor in real time.

### Event Model

- meta: session/model metadata
- rules: parameters the LM should honor (active region, thresholds, tone target)
- stage: indicates stage transitions (context or tone) with start/end
- diff: in‑region replacement for a span {start,end} in region‑local coordinates
- commit: finalizes the stage with full region text (and optional confidence)
- log: optional debug or rationale info
- done: end of the transcript

All events are newline‑delimited JSON objects. Consumers may update UI incrementally on diff and reset internal buffers on commit.

### JSON Schema (informal)

```json
{
  "type": "meta" | "rules" | "stage" | "diff" | "commit" | "log" | "done",
  "session": "s-...",          // meta
  "model": "qwen2.5-0.5B",     // meta
  "version": "0.4",            // meta

  "active_region": { "start": 120, "end": 160 },      // rules/diff/commit
  "confidence": { "tau_input": 0.6, "tau_commit": 0.8, "tau_tone": 0.7 },
  "toneTarget": "None" | "Casual" | "Professional",   // rules/commit

  "id": "context" | "tone",    // stage
  "state": "start" | "end",     // stage

  "stage": "context" | "tone",  // diff/commit association
  "span": { "start": 5, "end": 8 },          // region-local span
  "text": "replacement text",                  // diff/commit body

  "level": "info" | "debug" | "warn", // log
  "message": "..."
}
```

### Example Transcript

```jsonl
{"type":"meta","session":"s-123","model":"qwen2.5-0.5B","version":"0.4"}
{"type":"rules","active_region":{"start":120,"end":160},"confidence":{"tau_input":0.6,"tau_commit":0.8,"tau_tone":0.7},"toneTarget":"Professional"}
{"type":"stage","id":"context","state":"start"}
{"type":"diff","stage":"context","active_region":{"start":120,"end":160},"span":{"start":5,"end":8},"text":"the","confidence":0.72}
{"type":"commit","stage":"context","active_region":{"start":120,"end":160},"text":"...final corrected region text...","confidence":0.86}
{"type":"stage","id":"tone","state":"start","tone":"Professional"}
{"type":"diff","stage":"tone","active_region":{"start":120,"end":160},"span":{"start":0,"end":12},"text":"Consequently,"}
{"type":"commit","stage":"tone","active_region":{"start":120,"end":160},"tone":"Professional","confidence":0.9}
{"type":"done"}
```

### Application Semantics

- Diffs apply to a working region buffer. Convert region‑local span to absolute by offsetting active_region.start when applying to the host document.
- UI should throttle render updates to sensible word/punctuation boundaries for performance.
- commit replaces the entire region buffer with the provided text and resets transient diff state for the next stage.

### Error Handling

- Events may be ignored if malformed. A commit without prior diff is valid and replaces the region content.
- Overlapping diffs are last‑write‑wins within the stage. Stages are sequential: tone operates on the committed context output.

<!-- SPEC:CONTRACT
id: CONTRACT-LM-STREAM
title: JSONL LM stream protocol (context → tone)
status: active
modules:
  - core/lm/types.ts
  - core/lm/mockStreamAdapter.ts
  - web-demo/src/lab/LMLab.tsx
acceptance:
  - tests/lm_stream.spec.ts#SCEN-LM-STREAM-001
  - e2e/tests/lm_lab.spec.ts#SCEN-LM-LAB-002
invariants:
  - Events are JSON objects per line with required type
  - Tone stage runs only after context commit
-->

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
