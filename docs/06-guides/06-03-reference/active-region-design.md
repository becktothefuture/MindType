<!-- SPEC:CONTRACT
id: CONTRACT-ACTIVE-REGION
title: Active region policy (render vs context ranges)
invariants:
  - Context can extend beyond render region but never crosses secure fields
  - Render range must not include caret position (REQ-IME-CARETSAFE)
modules:
  - crates/core-rs/src/active_region.rs
-->

#### In simple terms

- **Active region**: The small part of text we consider “live” for corrections.
- **Two ranges**: A visual render range and a larger context range for the model.
- **Safety**: We never touch the caret or secure fields.
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

- `mindtype:activeRegion {start,end}` updates overlay span.
- `mindtype:highlight {start,end,text}` applies caret‑safe diff and brief flash.
- In reduced‑motion, skip shimmer and shorten flash by ~30%.

## macOS mapping

- Draw underline/overlay in focused field using overlay window; color tokens map to NSColor.
- Respect NSWorkspace reduced‑motion; provide high‑contrast variant.

## Testing

- Visual snapshots in reduced/non‑reduced motion.
- E2E asserts overlay/flash appear and clear; caret unchanged.

## Live region (ARIA) specifics

### Core ARIA Implementation

```html
<div role="status" aria-live="polite" aria-atomic="false" class="sr-only">
  <!-- Dynamic announcement text -->
</div>
```

### Announcement Strategy

- **Politeness Level**: `aria-live="polite"` by default; never use `assertive` for corrections
- **Batching Window**: 150–250ms to group multiple corrections into single announcement
- **Atomic Updates**: `aria-atomic="false"` to allow incremental announcements
- **Queue Management**: Cancel pending announcements on new input; maximum 1 queued message

### Timing Requirements

- **Debounce Period**: 200ms minimum between announcements
- **Batch Collection**: Collect corrections within 250ms window
- **Cancellation**: Immediate cancellation on caret movement or new typing
- **Cooldown**: 500ms cooldown after announcement before next batch

### Message Content Guidelines

- **Standard Messages**:
  - Single correction: "Text corrected"
  - Multiple corrections: "Text updated behind cursor"
  - Error state: "Correction unavailable"
- **Message Length**: Maximum 50 characters for screen reader efficiency
- **Localization**: Support for multiple languages with culturally appropriate phrasing
- **Verbosity Levels**: User-configurable (minimal, standard, detailed)

### Screen Reader Compatibility

- **VoiceOver (macOS/iOS)**: Tested with announcement timing and interruption behavior
- **NVDA (Windows)**: Verified politeness level respect and message clarity
- **JAWS (Windows)**: Validated with virtual cursor and browse mode
- **TalkBack (Android)**: Future compatibility for mobile versions

### Reduced Motion Compliance

- **Visual Independence**: Announcements occur regardless of visual animation state
- **Timing Consistency**: Same announcement timing whether motion is enabled or disabled
- **Content Preservation**: No reduction in announcement detail for reduced motion users

### Testing Requirements

- **Automated Testing**: Verify ARIA attributes are correctly applied
- **Screen Reader Testing**: Manual validation with major screen readers
- **Timing Validation**: Automated tests for batching and cancellation behavior
- **Content Testing**: Verify message clarity and appropriateness

### Implementation Notes

- **DOM Updates**: Use `textContent` updates, not `innerHTML` for security
- **Memory Management**: Clear old announcements to prevent memory leaks
- **Performance**: Minimal DOM manipulation for announcement updates
- **Fallback**: Graceful degradation if ARIA support is unavailable
