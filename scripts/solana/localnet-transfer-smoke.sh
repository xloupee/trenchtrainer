#!/usr/bin/env bash
set -euo pipefail

if ! command -v solana-test-validator >/dev/null 2>&1; then
  echo "solana-test-validator is required (installed with Solana CLI)."
  exit 1
fi

RPC_URL="${RPC_URL:-http://127.0.0.1:8899}"
RPC_PORT="${RPC_PORT:-8899}"
FAUCET_PORT="${FAUCET_PORT:-9900}"
LEDGER_DIR="${LEDGER_DIR:-.solana-smoke-local/test-ledger}"
WORKDIR="${WORKDIR:-.solana-smoke-local}"
LOG_FILE="${LOG_FILE:-/tmp/solana-test-validator.log}"
STARTED_BY_SCRIPT=0
VALIDATOR_PID=""

cleanup() {
  if [ "$STARTED_BY_SCRIPT" -eq 1 ] && [ -n "$VALIDATOR_PID" ]; then
    kill "$VALIDATOR_PID" >/dev/null 2>&1 || true
    wait "$VALIDATOR_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if ! solana cluster-version --url "$RPC_URL" >/dev/null 2>&1; then
  echo "Starting local validator on $RPC_URL ..."
  mkdir -p "$(dirname "$LEDGER_DIR")"
  solana-test-validator \
    --reset \
    --ledger "$LEDGER_DIR" \
    --bind-address 127.0.0.1 \
    --rpc-port "$RPC_PORT" \
    --faucet-port "$FAUCET_PORT" \
    >"$LOG_FILE" 2>&1 &
  VALIDATOR_PID="$!"
  STARTED_BY_SCRIPT=1

  for _ in $(seq 1 40); do
    if solana cluster-version --url "$RPC_URL" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
fi

if ! solana cluster-version --url "$RPC_URL" >/dev/null 2>&1; then
  echo "Local validator did not start. Check logs: $LOG_FILE"
  exit 1
fi

echo "Using local cluster: $RPC_URL"

CLUSTER="$RPC_URL" \
WORKDIR="$WORKDIR" \
AIRDROP_SOL="${AIRDROP_SOL:-2}" \
MAX_AIRDROP_RETRIES="${MAX_AIRDROP_RETRIES:-3}" \
bash scripts/solana/devnet-transfer-smoke.sh
