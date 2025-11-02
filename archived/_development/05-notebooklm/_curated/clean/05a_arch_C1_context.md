MindTyper sits between user keystrokes and apps via macOS Accessibility
APIs. It processes text locally using a Rust/WASM core and optional
on‑device ML (Core ML). No input content leaves device.

Externals: Host Apps (Docs, Mail, Editors), macOS Accessibility, Core ML,
Keychain/SQLite (local settings), optional licensing/sync (no content).
