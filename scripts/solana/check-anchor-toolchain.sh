#!/usr/bin/env bash
set -euo pipefail

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

print_path() {
  local cmd="$1"
  if have_cmd "$cmd"; then
    echo "      path: $(command -v "$cmd")"
  fi
}

check() {
  local name="$1"
  local cmd="$2"
  if have_cmd "$cmd"; then
    echo "[ok] $name: $("$cmd" --version 2>/dev/null | head -n 1 || true)"
    print_path "$cmd"
  else
    echo "[missing] $name ($cmd)"
  fi
}

check "Solana CLI" "solana"
check "Solana Test Validator" "solana-test-validator"
check "Anchor CLI" "anchor"
check "Rust compiler" "rustc"
check "Cargo" "cargo"

solana_major=""
anchor_minor=""

if have_cmd solana; then
  solana_major="$(solana --version 2>/dev/null | sed -E 's/.*solana-cli ([0-9]+)\..*/\1/' || true)"
  echo ""
  echo "Current Solana config:"
  solana config get || true
fi

if have_cmd anchor; then
  anchor_minor="$(anchor --version 2>/dev/null | sed -E 's/.* ([0-9]+)\.([0-9]+)\..*/\2/' || true)"
fi

if [[ -n "$solana_major" && -n "$anchor_minor" ]]; then
  if [[ "$solana_major" -lt 2 && "$anchor_minor" -ge 32 ]]; then
    cat <<'MSG'

[warn] Detected potentially incompatible stack:
       - Solana CLI is < 2.x
       - Anchor CLI is >= 0.32.x

This combo often fails in SBF builds with newer crate metadata/editions.
Recommended:
  1) Upgrade Solana CLI to 2.x
  2) Keep Anchor CLI + anchor-lang aligned at 0.32.1
MSG
  fi
fi

# Optional local workspace checks (run from repo root or wager workspace).
workspace_anchor_toml=""
workspace_program_cargo=""
if [[ -f "solana/wager-escrow/Anchor.toml" ]]; then
  workspace_anchor_toml="solana/wager-escrow/Anchor.toml"
  workspace_program_cargo="solana/wager-escrow/programs/wager_escrow/Cargo.toml"
elif [[ -f "Anchor.toml" && -f "programs/wager_escrow/Cargo.toml" ]]; then
  workspace_anchor_toml="Anchor.toml"
  workspace_program_cargo="programs/wager_escrow/Cargo.toml"
fi

if [[ -n "$workspace_anchor_toml" ]]; then
  anchor_cfg_version="$(sed -nE 's/^[[:space:]]*anchor_version[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' "$workspace_anchor_toml" | head -n 1)"
  anchor_lang_version="$(sed -nE 's/^[[:space:]]*anchor-lang[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' "$workspace_program_cargo" | head -n 1)"
  if [[ -n "$anchor_cfg_version" && -n "$anchor_lang_version" && "$anchor_cfg_version" != "$anchor_lang_version" ]]; then
    echo ""
    echo "[warn] Workspace mismatch:"
    echo "       Anchor.toml anchor_version = $anchor_cfg_version"
    echo "       program anchor-lang        = $anchor_lang_version"
  fi
fi
