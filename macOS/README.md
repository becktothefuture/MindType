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

- This is scaffolding only. Prefer using XcodeGen for a lightweight template.
- Option A — XcodeGen (recommended):
  1. Install XcodeGen: `brew install xcodegen`
  2. Run `xcodegen generate --spec macOS/Template/project.yml` from repo root
  3. Open the generated `.xcodeproj` and build/run
- Option B — Manual Xcode project: create a new macOS App project and add the Swift files under `macOS/App` and `bindings/swift`.
- FFI bridge is a placeholder for connecting to a Rust core (via cbindgen or UniFFI).
