#!/usr/bin/env bash
# bootstrap toolchains for MindType in one command
set -euo pipefail

# Rust toolchain
if ! command -v rustup &>/dev/null; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi
rustup target add wasm32-unknown-unknown
rustup component add clippy rustfmt

# wasm-pack
if ! command -v wasm-pack &>/dev/null; then
  cargo install wasm-pack
fi

# Node + pnpm (uses corepack if available)
if ! command -v pnpm &>/dev/null; then
  corepack enable || true
  corepack prepare pnpm@latest --activate
fi

# SwiftLint (mac only)
if [[ "$(uname)" == "Darwin" ]]; then
  brew install swiftlint || true
fi

echo "✅ Dev environment ready" 