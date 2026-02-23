#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This installer is intended for macOS."
  exit 1
fi

ANCHOR_VERSION="${ANCHOR_VERSION:-0.32.1}"
SOLANA_INSTALL_URL="${SOLANA_INSTALL_URL:-https://release.anza.xyz/stable/install}"
AUTO_UPGRADE_SOLANA="${AUTO_UPGRADE_SOLANA:-1}"

if ! command -v rustc >/dev/null 2>&1; then
  echo "Installing Rust toolchain..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi

# shellcheck disable=SC1090
source "$HOME/.cargo/env"

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo not found after rustup install."
  exit 1
fi

if ! command -v avm >/dev/null 2>&1; then
  echo "Installing Anchor Version Manager (avm)..."
  cargo install --git https://github.com/coral-xyz/anchor avm --locked
fi

if command -v solana >/dev/null 2>&1; then
  SOLANA_MAJOR="$(solana --version 2>/dev/null | sed -E 's/.*solana-cli ([0-9]+)\..*/\1/' || true)"
else
  SOLANA_MAJOR=""
fi

if [[ "$AUTO_UPGRADE_SOLANA" == "1" ]] && { [[ -z "$SOLANA_MAJOR" ]] || [[ "$SOLANA_MAJOR" -lt 2 ]]; }; then
  echo "Installing/upgrading Solana CLI from: $SOLANA_INSTALL_URL"
  sh -c "$(curl -sSfL "$SOLANA_INSTALL_URL")"
  export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi

echo "Installing/switching Anchor to ${ANCHOR_VERSION} via avm..."
avm install "$ANCHOR_VERSION" >/dev/null 2>&1 || true
avm use "$ANCHOR_VERSION"

echo ""
echo "Installed versions:"
rustc --version || true
cargo --version || true
anchor --version || true
solana --version || true

echo ""
echo "Done. If your current shell still can't find anchor, run:"
echo "  source \"$HOME/.cargo/env\""
