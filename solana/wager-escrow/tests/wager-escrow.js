const assert = require("node:assert/strict");
const anchor = require("@coral-xyz/anchor");

const { SystemProgram, Keypair, PublicKey, LAMPORTS_PER_SOL } = anchor.web3;

const stakeLamports = 100_000_000; // 0.1 SOL
const fundingSol = 2;

function stateName(enumValue) {
  if (typeof enumValue === "string") return enumValue;
  if (enumValue && typeof enumValue === "object") {
    const [key] = Object.keys(enumValue);
    return key || "unknown";
  }
  return String(enumValue);
}

async function airdrop(connection, pubkey, amountSol) {
  const sig = await connection.requestAirdrop(pubkey, amountSol * LAMPORTS_PER_SOL);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      signature: sig,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    },
    "confirmed",
  );
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WagerEscrow;
  assert(program, "Expected anchor.workspace.WagerEscrow to be available");

  const connection = provider.connection;
  const referee = provider.wallet.publicKey;

  const host = Keypair.generate();
  const guest = Keypair.generate();

  await airdrop(connection, host.publicKey, fundingSol);
  await airdrop(connection, guest.publicKey, fundingSol);

  const gameCode = `TEST${Date.now().toString().slice(-8)}`.slice(0, 16);
  const deadlineTs = Math.floor(Date.now() / 1000) + 3600;

  const [wagerMatch] = PublicKey.findProgramAddressSync(
    [Buffer.from("wager_match"), Buffer.from(gameCode)],
    program.programId,
  );

  console.log("[1/4] initialize_match");
  await program.methods
    .initializeMatch(gameCode, new anchor.BN(stakeLamports), new anchor.BN(deadlineTs), referee)
    .accounts({
      wagerMatch,
      host: host.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([host])
    .rpc();

  let match = await program.account.wagerMatch.fetch(wagerMatch);
  assert.equal(match.gameCode, gameCode);
  assert.equal(match.host.toBase58(), host.publicKey.toBase58());
  assert.equal(match.guest.toBase58(), PublicKey.default.toBase58());
  assert.equal(match.stakeLamports.toNumber(), stakeLamports);
  assert.equal(stateName(match.state), "init");
  assert.equal(match.hostFunded, false);
  assert.equal(match.guestFunded, false);

  console.log("[2/4] fund_host");
  await program.methods
    .fundHost()
    .accounts({
      wagerMatch,
      host: host.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([host])
    .rpc();

  match = await program.account.wagerMatch.fetch(wagerMatch);
  assert.equal(stateName(match.state), "hostFunded");
  assert.equal(match.hostFunded, true);
  assert.equal(match.guestFunded, false);

  console.log("[3/4] join_and_fund");
  await program.methods
    .joinAndFund()
    .accounts({
      wagerMatch,
      guest: guest.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([guest])
    .rpc();

  match = await program.account.wagerMatch.fetch(wagerMatch);
  assert.equal(stateName(match.state), "bothFunded");
  assert.equal(match.hostFunded, true);
  assert.equal(match.guestFunded, true);
  assert.equal(match.guest.toBase58(), guest.publicKey.toBase58());

  const winnerBefore = await connection.getBalance(host.publicKey, "confirmed");

  console.log("[4/4] settle_winner");
  await program.methods
    .settleWinner(host.publicKey)
    .accounts({
      wagerMatch,
      referee,
      winner: host.publicKey,
    })
    .rpc();

  match = await program.account.wagerMatch.fetch(wagerMatch);
  assert.equal(stateName(match.state), "settled");

  const winnerAfter = await connection.getBalance(host.publicKey, "confirmed");
  assert.equal(winnerAfter - winnerBefore, stakeLamports * 2);

  console.log("All wager escrow happy-path checks passed.");

  const host2 = Keypair.generate();
  await airdrop(connection, host2.publicKey, fundingSol);

  const refundGameCode = `RFND${Date.now().toString().slice(-8)}`.slice(0, 16);
  const refundDeadlineTs = Math.floor(Date.now() / 1000) + 2;
  const [refundMatch] = PublicKey.findProgramAddressSync(
    [Buffer.from("wager_match"), Buffer.from(refundGameCode)],
    program.programId,
  );

  console.log("[5/8] initialize_refund_match");
  await program.methods
    .initializeMatch(refundGameCode, new anchor.BN(stakeLamports), new anchor.BN(refundDeadlineTs), referee)
    .accounts({
      wagerMatch: refundMatch,
      host: host2.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([host2])
    .rpc();

  console.log("[6/8] fund_host_refund_match");
  await program.methods
    .fundHost()
    .accounts({
      wagerMatch: refundMatch,
      host: host2.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([host2])
    .rpc();

  console.log("[7/8] refund_fails_before_deadline");
  let sawDeadlineFailure = false;
  try {
    await program.methods
      .refundHostExpired()
      .accounts({
        wagerMatch: refundMatch,
        host: host2.publicKey,
      })
      .signers([host2])
      .rpc();
  } catch (e) {
    const msg = String(e?.message || e || "");
    sawDeadlineFailure = msg.includes("DeadlineNotReached") || msg.toLowerCase().includes("deadline not reached");
  }
  assert.equal(sawDeadlineFailure, true, "Expected refund to fail before deadline.");

  await new Promise((resolve) => setTimeout(resolve, 2500));
  const escrowBeforeRefund = await connection.getBalance(refundMatch, "confirmed");

  console.log("[8/8] refund_succeeds_after_deadline");
  await program.methods
    .refundHostExpired()
    .accounts({
      wagerMatch: refundMatch,
      host: host2.publicKey,
    })
    .signers([host2])
    .rpc();

  const refundState = await program.account.wagerMatch.fetch(refundMatch);
  assert.equal(stateName(refundState.state), "refunded");

  const escrowAfterRefund = await connection.getBalance(refundMatch, "confirmed");
  assert.equal(escrowBeforeRefund - escrowAfterRefund, stakeLamports);

  console.log("Refund path checks passed.");
}

main().catch((err) => {
  console.error("Wager escrow test failed:", err);
  process.exit(1);
});
