# Solana Wager Duels: Devnet Start Guide

This is the first execution step for wagered duels: verify transaction flow on Devnet,
then scaffold and validate the wager escrow program.

## Current status in this repo

- `solana-cli` is installed.
- Anchor workspace scaffold exists at `solana/wager-escrow/`.
- Program build command is wired and currently passing.

## Why builds were failing before

The previous failure was a toolchain mismatch:

- Solana 1.17 SBF build tooling is too old for some newer crate metadata/editions.
- Newer Anchor + dependency graph can pull crates that require newer Cargo behavior.
- Result: `anchor build` fails during dependency resolution/parsing.

The fix is to keep the stack aligned:

- Solana CLI: 2.x
- Anchor CLI: 0.32.1
- `anchor-lang` crate: 0.32.1

## 1) Run a real Devnet transaction now

Use the smoke script to verify keypair creation, airdrops, transfer, and tx confirmation:

```bash
npm run solana:smoke
```

What it does:

- creates local test keypairs in `.solana-smoke/`
- requests Devnet SOL airdrops
- transfers `0.01 SOL` host -> guest
- confirms transaction and prints Explorer URL

If Devnet faucet is rate-limited, run the same flow on localnet (no faucet limits):

```bash
npm run solana:smoke:local
```

This auto-starts `solana-test-validator`, runs airdrop + transfer, then exits.

## 2) Install Rust + Anchor toolchain

Run:

```bash
npm run solana:anchor:check
```

On macOS, you can install everything with:

```bash
npm run solana:anchor:install:mac
```

If missing, install:

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Anchor CLI (via avm)
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.32.1
avm use 0.32.1

# Solana 2.x (if needed)
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
```

## 3) Build the escrow program scaffold

Program scaffold is under:

- `solana/wager-escrow/`

After installing toolchain:

```bash
cd solana/wager-escrow
npm run solana:anchor:check
npm run build
```

If you see a Cargo.lock version mismatch, use the repo script (recommended):

```bash
cd solana/wager-escrow
npm run build
```

## 4) Run the wager escrow integration test (local validator)

From repo root:

```bash
npm run solana:wager:test
```

Or from the workspace:

```bash
cd solana/wager-escrow
npm run test
```

This flow now:

- starts local `solana-test-validator` if needed
- auto-creates a local wallet if no global Solana wallet exists
- runs `anchor build`
- deploys `wager_escrow` to local validator
- executes `tests/wager-escrow.js` (initialize/fund/join/settle happy-path)

## 5) Next implementation step

Implement and test these instructions end-to-end:

- `initialize_match`
- `fund_host`
- `join_and_fund`
- `settle_winner`
- `refund_both`

Then wire the duel referee backend to call settlement after match finalization.
