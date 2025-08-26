<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  P L A T F O R M   M A T R I X  ( V 0 . 3 )  ░░░░░░░░░░░  ║
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
    • WHAT ▸ Cross‑platform bindings surface for v0.3
    • WHY  ▸ Ensure parity and safety across hosts
    • HOW  ▸ Bindings paths, notes, and accessibility guards
-->

# Cross‑Platform Matrix (v0.3)

| Platform | Binding   | Path                              | Notes                                                    |
| -------- | --------- | --------------------------------- | -------------------------------------------------------- |
| macOS    | Swift FFI | `bindings/swift/**`               | AX focus watcher, preserve caret, SR cues, instant swap  |
| Windows  | TSF/.NET  | `bindings/windows/**`             | UIA integration, high‑contrast support, instant swap     |
| Web      | WASM + TS | `bindings/web/**` + `web-demo/**` | Reduced‑motion compliance, textarea injector, local‑only |
