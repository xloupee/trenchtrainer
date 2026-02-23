#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WAGER_DIR="${WAGER_DIR:-${REPO_ROOT}/solana/wager-escrow}"

RPC_HOST="${RPC_HOST:-127.0.0.1}"
RPC_PORT="${RPC_PORT:-8899}"
FAUCET_PORT="${FAUCET_PORT:-9900}"
RPC_URL="${RPC_URL:-http://${RPC_HOST}:${RPC_PORT}}"

LEDGER_DIR="${LEDGER_DIR:-${WAGER_DIR}/test-ledger}"
VALIDATOR_LOG="${VALIDATOR_LOG:-/tmp/wager-solana-test-validator.log}"
DEFAULT_GLOBAL_WALLET="$HOME/.config/solana/id.json"
LOCAL_TEST_WALLET="${WAGER_DIR}/.keys/test-wallet.json"

if [[ -n "${ANCHOR_WALLET:-}" ]]; then
  ANCHOR_WALLET="$ANCHOR_WALLET"
elif [[ -f "$DEFAULT_GLOBAL_WALLET" ]]; then
  ANCHOR_WALLET="$DEFAULT_GLOBAL_WALLET"
else
  ANCHOR_WALLET="$LOCAL_TEST_WALLET"
fi

STARTED_VALIDATOR=0
VALIDATOR_PID=""
TMP_WALLET=""

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd"
    exit 1
  fi
}

cleanup() {
  if [[ "$STARTED_VALIDATOR" -eq 1 && -n "$VALIDATOR_PID" ]]; then
    kill "$VALIDATOR_PID" >/dev/null 2>&1 || true
    wait "$VALIDATOR_PID" 2>/dev/null || true
  fi
  if [[ -n "$TMP_WALLET" && -f "$TMP_WALLET" ]]; then
    rm -f "$TMP_WALLET" || true
  fi
}
trap cleanup EXIT

# shellcheck disable=SC1090
source "$HOME/.cargo/env" 2>/dev/null || true

require_cmd solana
require_cmd solana-keygen
require_cmd solana-test-validator
require_cmd anchor
require_cmd node

if [[ ! -f "$ANCHOR_WALLET" ]]; then
  echo "Creating local test wallet: $ANCHOR_WALLET"
  mkdir -p "$(dirname "$ANCHOR_WALLET")"
  solana-keygen new --no-bip39-passphrase -o "$ANCHOR_WALLET" >/dev/null
fi

DEPLOY_WALLET="$ANCHOR_WALLET"
if [[ "$ANCHOR_WALLET" =~ [[:space:]] ]]; then
  TMP_WALLET="/tmp/wager-test-wallet-${UID}.json"
  cp "$ANCHOR_WALLET" "$TMP_WALLET"
  chmod 600 "$TMP_WALLET"
  DEPLOY_WALLET="$TMP_WALLET"
fi

if ! solana cluster-version --url "$RPC_URL" >/dev/null 2>&1; then
  echo "Starting local validator at $RPC_URL ..."
  mkdir -p "$LEDGER_DIR"
  solana-test-validator \
    --reset \
    --ledger "$LEDGER_DIR" \
    --bind-address "$RPC_HOST" \
    --rpc-port "$RPC_PORT" \
    --faucet-port "$FAUCET_PORT" \
    >"$VALIDATOR_LOG" 2>&1 &
  VALIDATOR_PID="$!"
  STARTED_VALIDATOR=1

  for _ in $(seq 1 80); do
    if solana cluster-version --url "$RPC_URL" >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done
fi

if ! solana cluster-version --url "$RPC_URL" >/dev/null 2>&1; then
  echo "Local validator failed to start. Log: $VALIDATOR_LOG"
  exit 1
fi

echo "Using local validator: $RPC_URL"

export ANCHOR_PROVIDER_URL="$RPC_URL"
export ANCHOR_WALLET="$DEPLOY_WALLET"
export CARGO_REGISTRIES_CRATES_IO_PROTOCOL="${CARGO_REGISTRIES_CRATES_IO_PROTOCOL:-sparse}"

cd "$WAGER_DIR"

anchor build

WALLET_PUBKEY="$(solana-keygen pubkey "$DEPLOY_WALLET")"
solana airdrop 5 "$WALLET_PUBKEY" --url "$RPC_URL" >/dev/null 2>&1 || true

anchor deploy --provider.cluster "$RPC_URL" --provider.wallet "$DEPLOY_WALLET"

node tests/wager-escrow.js
