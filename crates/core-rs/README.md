<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  C O R E - R S   ( R U S T   C O R E )      ░░░░░  ║
  ║                                                      ║
  ║  Rust core crate: diffusion scheduler, tapestry,     ║
  ║  confidence gating, FFI and WASM bindings.           ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ On‑device core with dual surfaces (FFI, WASM)
    • WHY  ▸ v0.2 direction: Rust‑centric core, cross‑platform
    • HOW  ▸ Build via cargo/cbindgen/wasm-bindgen; see commands below
-->

### Build (native + FFI)

- Generate C header:

```bash
cbindgen --config cbindgen.toml --crate core-rs --output core_rs.h
```

### Build (wasm)

- Build for wasm32:

```bash
rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
```

- Or via wasm-pack for npm packaging:

```bash
wasm-pack build --target web --out-dir bindings/wasm/pkg --release
```

### FFI Notes

- Strings returned via `MTString` must be freed by the host:

```c
void mind_type_core_free_string(struct MTString s);
```

### Documentation

- See `docs/guide/reference/core-rust-details.md` and `docs/guide/reference/rust-merge.md` for design and API details.
