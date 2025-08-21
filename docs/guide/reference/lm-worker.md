<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  L M   W O R K E R   ( R U N T I M E )  ░░░░░░░░  ║
  ║                                                      ║
  ║   Offload Transformers.js to a Worker with            ║
  ║   memory guard and graceful degradation.             ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ Worker protocol for prompts and stream chunks
    • WHY  ▸ Keep UI thread smooth; enforce memory budgets
    • HOW  ▸ Message API + abort + auto‑degrade to rules
-->

## Protocol

- `init({ localOnly, localModelPath, wasmPaths })`
- `generate({ prompt, maxNewTokens, requestId })` → emits `chunk` messages
- `abort({ requestId })`
- `status` → backend + memory snapshot

## Memory Guard

- Poll memory usage (best‑effort); if >150 MB typical, unload model and notify host to fall back to rules.

## Host Responsibilities

- Single‑flight generation; abort stale requests; respect cooldowns.

See: `core/lm/transformersRunner.ts`, `docs/guide/reference/lm-behavior.md`.
