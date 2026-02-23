#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-build}"

if [[ "$MODE" != "build" && "$MODE" != "test" ]]; then
  echo "Usage: $0 [build|test]"
  exit 1
fi

# Ensure user-level rust/cargo are on PATH if installed.
# shellcheck disable=SC1090
source "$HOME/.cargo/env" 2>/dev/null || true

# Prefer sparse index to avoid git-index fetch path issues on constrained networks.
export CARGO_REGISTRIES_CRATES_IO_PROTOCOL="${CARGO_REGISTRIES_CRATES_IO_PROTOCOL:-sparse}"

if [[ "$MODE" == "build" ]]; then
  anchor build
else
  anchor test
fi
