<!--══════════════════════════════════════════════════════════
  ╔════════════════════════════════════════════════════════════╗
  ║  ░  T H R E E ‑ S T A G E   P I P E L I N E   ( v 0 . 4 ) ░  ║
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
    • WHAT ▸ Noise → Context → Tone stages, confidence-gated
    • WHY  ▸ Improve text in layers without breaking flow
    • HOW  ▸ See diffusionController, sweepScheduler; UI exposes tone controls
-->

# Three-Stage Pipeline (v0.4)

- Noise: fast local cleanup of keystrokes (typos, spacing). Always behind the caret.
- Context: sentence-level fixes using ±2 sentences (S−1=1.0, S−2=0.5). Runs on pause when input fidelity ≥ τ_input.
- Tone: gentle rephrasing to match the selected tone (None/Casual/Professional). Applies only when τ_tone and τ_commit are met.

Safety: Edits never touch or cross the caret. Tone stage does not rollback on caret move but still never edits at/after the caret.

Scheduling: The scheduler streams Noise while typing. On a ≥500ms pause, it schedules Context; upon commit, Tone may run if language gating allows.
