<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  M I S A L I G N M E N T   A N A L Y S I S  ░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
    • WHAT ▸ Compare PDF requirements with current implementation
    • WHY  ▸ Identify gaps and prioritise realignment tasks
    • HOW  ▸ Matrix: Requirement → Current → Gap → Priority → Remedy
-->

# Misalignment Matrix (PDF ↔ Codebase)

| Requirement (PDF) | Current Implementation | Gap | Priority | Proposed Remedy |
| --- | --- | --- | --- | --- |
| Deterministic-first under load: Noise always runs; higher stages degrade | v0.6 Noise is LM-only; `noiseTransformSync` returns null; streaming tick validates only | No deterministic noise fallback during typing; under load noise can be off | Critical | Implement deterministic Noise fallback (typo/spacing/casing) in TS core for streaming tick; keep LM path for wave; gate by caret safety |
| Single undo per sweep | Undo grouping moved external; verify `ui/rollbackHandler.ts` groups cross-stage | Possible multi-edit grouping gaps | High | Ensure sweep commit groups all stage diffs; expose rollback API; add tests (atomic undo) |
| Caret organism states & timings (Listening/Thinking/Cleaning) | No dedicated web demo showing organism states; playground partial | Missing clear state machine demo | High | Implement organism state renderer in `web-lab-v0.6` with timing (base, 1.5×, 2.5×) and stop-at-caret rule |
| Latency fallback policy (tier-aware) | Tiered debounce exists; window shrink/skip rules not formalised | Missing codified thresholds | High | Add device-tier policy: shrink Active Area and skip Context/Tone under latency pressure; surface in config |
| Active Area ~2–3 sentences | Policy uses word count (default 20 words) | Sentence-based window not explicit | Medium | Map 2–3 sentences to dynamic words via `Intl.Segmenter`; or compute sentence bounds per side |
| Pause trigger 500–700 ms | `SHORT_PAUSE_MS = 600` | Aligned | — | Keep; expose per-tier adjustments |
| Accessibility: reduced-motion instant swap; one SR announcement per batch | Modules exist (`ui/motion.ts`, `ui/liveRegion.ts`) | Need verification/tests | Medium | Add e2e/Playwright checks; ensure batch announcement only |
| Privacy: secure fields/IME excluded | Guards in `core/security.ts` | Likely aligned | Low | Add explicit tests; log drops for diagnostics |
| Confidence gating for Context/Tone | Implemented via `confidenceGate.ts` | Tuning may be needed | Medium | Tune τ thresholds; expose UI in lab |
| On-device by default with optional remote | Current web demo uses local adapters; optional remote not wired | Not required for MVP | Low | Document policy; keep local-only in lab |

---

## Notes
- Thresholds presently: `SHORT_PAUSE_MS=600`, Active Region ≈ 20 words (configurable). PDF specifies 2–3 sentences; we’ll translate this to sentence-bound windows or an adaptive word count.
- The most significant drift vs PDF is deterministic-first behaviour: we must restore a rule-based Noise during streaming ticks so the “always-on cleanup” holds even without LM.


