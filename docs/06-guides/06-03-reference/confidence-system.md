<!--══════════════════════════════════════════════════════════
  ╔════════════════════════════════════════════════════════════╗
  ║  ░  C O N F I D E N C E   S Y S T E M   ( v 0 . 4 )  ░░░░░  ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
    • WHAT ▸ Weighted scoring across input fidelity, transform quality, context coherence, temporal decay
    • WHY  ▸ Gate proposals to HOLD/COMMIT/DISCARD; Tone requires τ_tone and τ_commit
    • HOW  ▸ See core/confidenceGate.ts; staging buffer applies decisions
-->

# Confidence System (v0.6+)

**Revolutionary Context**: Confidence gating enables **Correction Marker** decision-making and **Burst-Pause-Correct** timing.

- Plainly: We score each proposal in four ways (was the input clear? was the change good? does it fit nearby text? is it fresh?). We mix those into one number and compare to thresholds. If it’s not strong enough, we hold. If it’s great, we commit. If it’s very weak, we discard.
- The Tone stage needs extra confidence: it must pass both τ_tone and τ_commit so we don’t rephrase text without being sure.
- This is fast math, not a heavy model — it adds under ~5ms.

## Thresholds

- τ_input = 0.65: below this, we avoid deep context work.
- τ_commit = 0.90: commit only when combined score is strong.
- τ_tone = 0.85: tone-specific quality bar.
- τ_discard = 0.30: drop very weak proposals quickly.

## Developer Notes

- All functions are in `core/confidenceGate.ts`.
- The staging buffer (`core/stagingBuffer.ts`) tracks proposal states and applies the decisions.
- Keep caret safety in mind: proposals must never touch or cross the caret.

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
