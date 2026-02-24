import { createClient } from "@supabase/supabase-js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "node:fs/promises";
import path from "node:path";

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

export const getSupabaseUserClient = (jwt) => {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
};

export const getSupabaseServiceClient = () => {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export const getBearerToken = (request) => {
  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
};

export const getRequestUser = async (request) => {
  const token = getBearerToken(request);
  if (!token) throw new Error("Missing bearer token.");
  const client = getSupabaseUserClient(token);
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) throw new Error("Unauthorized.");
  return data.user;
};

const idlPath = () => path.join(process.cwd(), "solana", "wager-escrow", "target", "idl", "wager_escrow.json");
const parseRefereeKey = (secret) => {
  const raw = String(secret || "").trim();
  if (!raw) throw new Error("Missing WAGER_REFEREE_SECRET_KEY");
  if (raw.startsWith("[")) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  return Keypair.fromSecretKey(bs58.decode(raw));
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

export const getWagerProgram = async () => {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const programId = process.env.WAGER_PROGRAM_ID || process.env.NEXT_PUBLIC_WAGER_PROGRAM_ID;
  if (!programId) throw new Error("Missing WAGER_PROGRAM_ID or NEXT_PUBLIC_WAGER_PROGRAM_ID.");
  const referee = parseRefereeKey(process.env.WAGER_REFEREE_SECRET_KEY);
  const idl = JSON.parse(await fs.readFile(idlPath(), "utf8"));
  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new AnchorProvider(connection, makeNodeWallet(referee), { commitment: "confirmed" });
  return {
    connection,
    program: new Program({ ...idl, address: programId }, provider),
    referee,
    programId: new PublicKey(programId),
  };
};

