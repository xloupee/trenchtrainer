import { NextResponse } from "next/server";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const DEFAULT_RPC_URL = process.env.NEXT_PUBLIC_WAGER_LOCAL_RPC || "http://127.0.0.1:8899";
const DEFAULT_PROGRAM_ID = process.env.NEXT_PUBLIC_WAGER_PROGRAM_ID || "JCRT7U9RoxcQ7xt5PkZ3EsrPkDswGQRfcKkc2qB9cx4m";
const DEV_ENABLED = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_WAGER_DEV_TESTS === "1";
const sessions = new Map();

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const asNum = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const stateName = (stateValue) => {
  if (!stateValue) return "unknown";
  if (typeof stateValue === "string") return stateValue;
  if (typeof stateValue === "object") {
    const [k] = Object.keys(stateValue);
    return k || "unknown";
  }
  return String(stateValue);
};
const idlPath = () => path.join(process.cwd(), "solana", "wager-escrow", "target", "idl", "wager_escrow.json");
const randomCode = () => `U${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
const genId = () => `wgr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const loadIdl = async () => {
  const raw = await fs.readFile(idlPath(), "utf8");
  return JSON.parse(raw);
};

const makeNodeWallet = (keypair) => ({
  publicKey: keypair.publicKey,
  signTransaction: async (tx) => {
    tx.partialSign(keypair);
    return tx;
  },
  signAllTransactions: async (txs) =>
    txs.map((tx) => {
      tx.partialSign(keypair);
      return tx;
    }),
});

const getClient = async (session) => {
  const connection = new Connection(DEFAULT_RPC_URL, "confirmed");
  const wallet = makeNodeWallet(session.referee);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const idl = await loadIdl();
  const program = new Program({ ...idl, address: DEFAULT_PROGRAM_ID }, provider);
  return { connection, program };
};

const confirmAirdrop = async (connection, pubkey, sol = 2) => {
  const sig = await connection.requestAirdrop(pubkey, Math.round(sol * LAMPORTS_PER_SOL));
  const latest = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    {
      signature: sig,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    },
    "confirmed",
  );
};

const ensureFunded = async (connection, keypair, minSol = 1.2) => {
  const minLamports = Math.round(minSol * LAMPORTS_PER_SOL);
  const bal = await connection.getBalance(keypair.publicKey, "confirmed");
  if (bal >= minLamports) return bal;
  await confirmAirdrop(connection, keypair.publicKey, 2);
  return connection.getBalance(keypair.publicKey, "confirmed");
};

const readMatch = async (program, wagerMatch) => {
  const match = await program.account.wagerMatch.fetchNullable(wagerMatch);
  if (!match) return null;
  return {
    gameCode: match.gameCode,
    host: match.host.toBase58(),
    guest: match.guest.toBase58(),
    referee: match.referee.toBase58(),
    stakeLamports: Number(match.stakeLamports),
    state: stateName(match.state),
    hostFunded: Boolean(match.hostFunded),
    guestFunded: Boolean(match.guestFunded),
    deadlineTs: Number(match.deadlineTs),
    createdAt: Number(match.createdAt),
  };
};

const snapshotSession = async (session) => {
  const { connection, program } = await getClient(session);
  const wagerMatch = session.wagerMatch;
  const [refBal, hostBal, guestBal] = await Promise.all([
    connection.getBalance(session.referee.publicKey, "confirmed"),
    connection.getBalance(session.host.publicKey, "confirmed"),
    connection.getBalance(session.guest.publicKey, "confirmed"),
  ]);
  const match = await readMatch(program, wagerMatch);
  return {
    id: session.id,
    gameCode: session.gameCode,
    wagerMatch: wagerMatch.toBase58(),
    programId: DEFAULT_PROGRAM_ID,
    rpcUrl: DEFAULT_RPC_URL,
    stakeLamports: session.stakeLamports,
    deadlineTs: session.deadlineTs,
    state: match?.state || "not_initialized",
    match,
    txs: session.txs,
    wallets: {
      referee: session.referee.publicKey.toBase58(),
      host: session.host.publicKey.toBase58(),
      guest: session.guest.publicKey.toBase58(),
      balances: {
        refereeLamports: refBal,
        hostLamports: hostBal,
        guestLamports: guestBal,
      },
    },
  };
};

const runStep = async (session, step) => {
  const { program } = await getClient(session);
  const wagerMatch = session.wagerMatch;
  const stakeBn = new BN(session.stakeLamports);
  const deadlineBn = new BN(session.deadlineTs);

  if (step === "initialize") {
    const sig = await program.methods
      .initializeMatch(session.gameCode, stakeBn, deadlineBn, session.referee.publicKey)
      .accounts({
        wagerMatch,
        host: session.host.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([session.host])
      .rpc();
    session.txs.initialize = sig;
    return sig;
  }

  if (step === "fund_host") {
    const sig = await program.methods
      .fundHost()
      .accounts({
        wagerMatch,
        host: session.host.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([session.host])
      .rpc();
    session.txs.fundHost = sig;
    return sig;
  }

  if (step === "join_and_fund") {
    const sig = await program.methods
      .joinAndFund()
      .accounts({
        wagerMatch,
        guest: session.guest.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([session.guest])
      .rpc();
    session.txs.joinAndFund = sig;
    return sig;
  }

  if (step === "settle_winner") {
    const sig = await program.methods
      .settleWinner(session.host.publicKey)
      .accounts({
        wagerMatch,
        referee: session.referee.publicKey,
        winner: session.host.publicKey,
      })
      .signers([session.referee])
      .rpc();
    session.txs.settleWinner = sig;
    return sig;
  }

  if (step === "refund_host_expired") {
    const sig = await program.methods
      .refundHostExpired()
      .accounts({
        wagerMatch,
        host: session.host.publicKey,
      })
      .signers([session.host])
      .rpc();
    session.txs.refundHostExpired = sig;
    return sig;
  }

  throw new Error(`Unknown step: ${step}`);
};

const resolveFreshGameCode = async ({ connection, programId, preferredCode }) => {
  const cleanPreferred = String(preferredCode || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);

  if (cleanPreferred) {
    const [pda] = PublicKey.findProgramAddressSync([Buffer.from("wager_match"), Buffer.from(cleanPreferred)], programId);
    const existing = await connection.getAccountInfo(pda, "confirmed");
    if (existing) throw new Error(`Game code ${cleanPreferred} already exists on localnet. Use a different code.`);
    return { gameCode: cleanPreferred, wagerMatch: pda };
  }

  for (let i = 0; i < 20; i += 1) {
    const code = randomCode().slice(0, 16);
    const [pda] = PublicKey.findProgramAddressSync([Buffer.from("wager_match"), Buffer.from(code)], programId);
    const existing = await connection.getAccountInfo(pda, "confirmed");
    if (!existing) return { gameCode: code, wagerMatch: pda };
  }
  throw new Error("Could not find a fresh game code. Reset localnet or retry.");
};

export async function POST(request) {
  if (!DEV_ENABLED) {
    return NextResponse.json({ error: "Wager dev test endpoint is disabled." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = String(body?.action || "").trim();

    if (!action) {
      return NextResponse.json({ error: "Missing action." }, { status: 400 });
    }

    if (action === "create_session") {
      const stakeSol = clamp(asNum(body?.stakeSol, 0.1), 0.01, 10);
      const deadlineMinutes = clamp(Math.round(asNum(body?.deadlineMinutes, 60)), 2, 24 * 60);
      const stakeLamports = Math.round(stakeSol * LAMPORTS_PER_SOL);
      const deadlineTs = Math.floor(Date.now() / 1000) + deadlineMinutes * 60;

      const referee = Keypair.generate();
      const host = Keypair.generate();
      const guest = Keypair.generate();
      const programId = new PublicKey(DEFAULT_PROGRAM_ID);
      const connection = new Connection(DEFAULT_RPC_URL, "confirmed");
      await connection.getLatestBlockhash("confirmed");
      const { gameCode, wagerMatch } = await resolveFreshGameCode({
        connection,
        programId,
        preferredCode: body?.gameCode,
      });

      const session = {
        id: genId(),
        referee,
        host,
        guest,
        gameCode,
        stakeLamports,
        deadlineTs,
        wagerMatch,
        txs: {
          initialize: null,
          fundHost: null,
          joinAndFund: null,
          settleWinner: null,
          refundHostExpired: null,
        },
      };

      await Promise.all([
        ensureFunded(connection, referee, 1.2),
        ensureFunded(connection, host, 1.2),
        ensureFunded(connection, guest, 1.2),
      ]);

      sessions.set(session.id, session);
      return NextResponse.json({ ok: true, session: await snapshotSession(session) });
    }

    const sessionId = String(body?.sessionId || "");
    const session = sessions.get(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found. Create a new test session." }, { status: 404 });

    if (action === "get_session") {
      return NextResponse.json({ ok: true, session: await snapshotSession(session) });
    }

    if (action === "run_step") {
      const step = String(body?.step || "");
      const sig = await runStep(session, step);
      return NextResponse.json({ ok: true, signature: sig, session: await snapshotSession(session) });
    }

    if (action === "run_full_flow") {
      const steps = ["initialize", "fund_host", "join_and_fund", "settle_winner"];
      const signatures = [];
      for (const step of steps) {
        signatures.push({ step, signature: await runStep(session, step) });
      }
      return NextResponse.json({ ok: true, signatures, session: await snapshotSession(session) });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || "Wager dev test request failed.",
      },
      { status: 500 },
    );
  }
}
