<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  W A S M   B I N D I N G S   ( P A C K A G E ) ░░  ║
  ║                                                      ║
  ║  Built artifacts for the web demo (wasm-bindgen /    ║
  ║  wasm-pack). TypeScript types included.               ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ NPM-ready package for browser usage
    • WHY  ▸ v0.2 web path for Rust core
    • HOW  ▸ Build via wasm-pack; import in web-demo
-->

### Build

```bash
wasm-pack build crates/core-rs --target web \
  --out-dir bindings/wasm/pkg --release
```

### Usage

```ts
import init, { init_logger, WasmPauseTimer } from "./pkg/core_rs.js";

await init();
init_logger();
const t = new WasmPauseTimer(500);
```

- See also: `docs/guide/reference/core-rust-details.md`.
