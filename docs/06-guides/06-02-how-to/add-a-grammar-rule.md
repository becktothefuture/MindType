<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  H O W - T O  —  G R A M M A R   R U L E  ░░░░░░  ║
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
    • WHAT ▸ Add a safe GrammarWorker rule
    • WHY  ▸ Improve fluency without changing voice
    • HOW  ▸ Implement in `crates/core-rs/src/workers/noise.rs`
-->

Checklist

- Never cross CARET; operate ≤ 80 chars behind it.
- Confidence gate; return null if unsure.
- Add unit tests in `tests/noiseTransformer.spec.ts`.
