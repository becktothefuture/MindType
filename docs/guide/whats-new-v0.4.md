<!--══════════════════════════════════════════════════════════
  ╔════════════════════════════════════════════════════════════╗
  ║  ░  W H A T ' S   N E W   I N   v 0 . 4  ░░░░░░░░░░░░░░░░░  ║
  ║                                                            ║
  ║   Three-stage pipeline, confidence system, tone controls.  ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
    • WHAT ▸ Highlights of the v0.4 release
    • WHY  ▸ Quick overview for developers and users
    • HOW  ▸ Linked to guides and references
-->

# What’s New in v0.4

- Three-stage pipeline: Noise → Context → Tone, each gated and caret-safe.
- Confidence system with weighted scoring (τ_input, τ_commit, τ_tone, τ_discard).
- English-only gating for Context/Tone; Noise runs for all languages.
- Web demo: Tone enable toggle, target selection (None/Casual/Professional), and confidence sliders with persistence.
- Visual feedback: Mechanical swap renderer with optional Braille markers and batched screen reader announcements; reduced-motion respected.
- Staging buffer + system undo isolation: groups engine edits in 100–200ms buckets and supports rollback on caret entry.

See also:

- docs/guide/reference/three-stage-pipeline.md
- docs/guide/reference/confidence-system.md
- docs/guide/how-to/web-demo-details.md
