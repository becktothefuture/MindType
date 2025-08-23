<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  A C T I V E   R E G I O N   D E S I G N  ░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Visual design tokens and behaviors for the active region
    • WHY  ▸ Ensure consistent, accessible feedback across hosts
    • HOW  ▸ CSS tokens, reduced‑motion variants, event timing
-->

## Tokens (web demo)

- color.activeRegion.bg: linear-gradient(90deg, rgba(0,200,120,.18), rgba(0,200,120,.32), rgba(0,200,120,.18))
- color.activeRegion.outline: rgba(0,200,120,.35)
- motion.activeRegion.shimmer.duration: 1800ms
- motion.activeRegion.shimmer.timing: linear
- motion.activeRegion.highlight.duration: 800ms
- shape.activeRegion.radius: 2px

## Reduced‑motion

- Replace shimmer with static gradient; respect `prefers-reduced-motion`.
- Keep highlight flash ≤ 800ms; use fade only (no scale).

## Event model

- `mindtyper:activeRegion {start,end}` updates overlay span.
- `mindtyper:highlight {start,end,text}` applies caret‑safe diff and brief flash.
- In reduced‑motion, skip shimmer and shorten flash by ~30%.

## macOS mapping

- Draw underline/overlay in focused field using overlay window; color tokens map to NSColor.
- Respect NSWorkspace reduced‑motion; provide high‑contrast variant.

## Testing

- Visual snapshots in reduced/non‑reduced motion.
- E2E asserts overlay/flash appear and clear; caret unchanged.
