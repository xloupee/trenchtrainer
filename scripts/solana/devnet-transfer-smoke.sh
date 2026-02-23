#!/usr/bin/env bash
set -euo pipefail

if ! command -v solana >/dev/null 2>&1; then
  echo "solana CLI is required. Install Solana CLI first."
  exit 1
fi

WORKDIR="${WORKDIR:-.solana-smoke}"
HOST_KEYPAIR="${HOST_KEYPAIR:-$WORKDIR/host.json}"
GUEST_KEYPAIR="${GUEST_KEYPAIR:-$WORKDIR/guest.json}"
CLUSTER="${CLUSTER:-devnet}"
TRANSFER_SOL="${TRANSFER_SOL:-0.01}"
AIRDROP_SOL="${AIRDROP_SOL:-0.5}"
MAX_AIRDROP_RETRIES="${MAX_AIRDROP_RETRIES:-5}"

mkdir -p "$WORKDIR"

if [ ! -f "$HOST_KEYPAIR" ]; then
  solana-keygen new --no-bip39-passphrase -o "$HOST_KEYPAIR" >/dev/null
fi
if [ ! -f "$GUEST_KEYPAIR" ]; then
  solana-keygen new --no-bip39-passphrase -o "$GUEST_KEYPAIR" >/dev/null
fi

HOST_PUBKEY="$(solana-keygen pubkey "$HOST_KEYPAIR")"
GUEST_PUBKEY="$(solana-keygen pubkey "$GUEST_KEYPAIR")"

solana config set --url "$CLUSTER" >/dev/null

balance_lamports() {
  local pubkey="$1"
  solana balance "$pubkey" --url "$CLUSTER" --lamports | awk '{print $1}'
}

ensure_airdrop() {
  local pubkey="$1"
  local label="$2"
  local before after
  before="$(balance_lamports "$pubkey")"
  if [ "${before:-0}" -gt 0 ]; then
    echo "$label already funded (${before} lamports), skipping airdrop."
    return 0
  fi
  for i in $(seq 1 "$MAX_AIRDROP_RETRIES"); do
    echo "Airdrop attempt $i/$MAX_AIRDROP_RETRIES for $label..."
    if solana airdrop "$AIRDROP_SOL" "$pubkey" --url "$CLUSTER"; then
      after="$(balance_lamports "$pubkey")"
      if [ "${after:-0}" -gt 0 ]; then
        echo "$label funded (${after} lamports)."
        return 0
      fi
    fi
    sleep 2
  done
  cat <<MSG
Failed to airdrop funds for $label on $CLUSTER.
This is usually Devnet faucet rate limiting.
Try again in a few minutes, or run with:
  AIRDROP_SOL=0.1 MAX_AIRDROP_RETRIES=8 npm run solana:smoke
MSG
  return 1
}

echo "Cluster: $CLUSTER"
echo "Host:   $HOST_PUBKEY"
echo "Guest:  $GUEST_PUBKEY"

ensure_airdrop "$HOST_PUBKEY" "Host wallet"
ensure_airdrop "$GUEST_PUBKEY" "Guest wallet"

HOST_BEFORE="$(solana balance "$HOST_PUBKEY" --url "$CLUSTER")"
GUEST_BEFORE="$(solana balance "$GUEST_PUBKEY" --url "$CLUSTER")"

echo "Before -> host: $HOST_BEFORE | guest: $GUEST_BEFORE"

# Use yes to bypass transfer confirmation prompt.
SIG="$(yes | solana transfer "$GUEST_PUBKEY" "$TRANSFER_SOL" \
  --from "$HOST_KEYPAIR" \
  --fee-payer "$HOST_KEYPAIR" \
  --allow-unfunded-recipient \
  --url "$CLUSTER" \
  --keypair "$HOST_KEYPAIR" \
  --no-wait | awk '/Signature:/ {print $2}')"

if [ -z "$SIG" ]; then
  echo "Failed to capture transaction signature."
  exit 1
fi

solana confirm "$SIG" --url "$CLUSTER" >/dev/null

HOST_AFTER="$(solana balance "$HOST_PUBKEY" --url "$CLUSTER")"
GUEST_AFTER="$(solana balance "$GUEST_PUBKEY" --url "$CLUSTER")"

echo "After  -> host: $HOST_AFTER | guest: $GUEST_AFTER"
echo "Signature: $SIG"
if [[ "$CLUSTER" == "devnet" || "$CLUSTER" == "testnet" || "$CLUSTER" == "mainnet-beta" ]]; then
  echo "Explorer: https://explorer.solana.com/tx/$SIG?cluster=$CLUSTER"
else
  echo "Cluster URL: $CLUSTER"
fi
