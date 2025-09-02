/_══════════════════════════════════════════════════════════════
░ M A C O S P L A T F O R M F O U N D A T I O N ( v0.4 ) ░
• WHAT ▸ Swift scaffolding for menu bar app + Accessibility bridge
• WHY ▸ FT-504: establish structure for native integration
• HOW ▸ Status bar app, AX monitor, FFI bridge to core
_/

Structure

- App/
  - StatusBarApp.swift — NSStatusItem-based minimal app shell
  - AccessibilityBridge.swift — reads focused text via AX API (scaffold)
- bindings/swift/
  - FFIBridge.swift — placeholder FFI to shared core (to be wired)

Notes

- This is scaffolding only (no build system included). Integrate with an Xcode project and add the Swift files.
- FFI bridge is a placeholder for connecting to a Rust core (via cbindgen or UniFFI).
