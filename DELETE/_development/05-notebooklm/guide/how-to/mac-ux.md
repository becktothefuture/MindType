<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  M A C O S   U X   G U I D E  ░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ macOS UX flows: onboarding, permissions, overlays, prefs
    • WHY  ▸ Keep experience coherent and accessible across apps
    • HOW  ▸ Status item, AX flows, preferences, visuals
-->

## Status item

- Idle / Processing / Disabled icons
- Menu: Enable/Disable • Preferences… • About • Quit

## Onboarding & permissions

- First‑run sheet: privacy, caret‑safe contract, local‑only
- Request Accessibility permission; show retry/help if denied
- Verify AX enabled before attempting overlay/injection

## Preferences

- Confidence dial (0..1), formality slider, active region style
- Reduced‑motion and high‑contrast compliance
- Persist with `UserDefaults`; forward changes via FFI setters

## Overlays & visuals

- Active region underline/overlay behind caret; subtle; no jitter
- Reduced‑motion: static underline; high‑contrast palette
- Optional screen‑reader cue: “Text cleaned” (respect verbosity)

## Error states

- No permission: show inline banner in status menu
- Low resources: auto degrade to rules‑only, surface a hint

## Testing

- Snapshot: light/dark/high‑contrast; reduced‑motion on/off
- Accessibility: VoiceOver phrases; keyboard‑only flows
