"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { supabase } from "../../../lib/supabaseClient";
import { C } from "../config/constants";
import wagerIdl from "../lib/wagerIdl.json";

const STAKE_TIERS = [
  { key: "TIER_005", label: "0.05 SOL", lamports: 50_000_000 },
  { key: "TIER_010", label: "0.10 SOL", lamports: 100_000_000 },
  { key: "TIER_025", label: "0.25 SOL", lamports: 250_000_000 },
];

const TERMINAL_STATUSES = new Set(["settled", "refunded", "cancelled"]);

const readAnchorError = (error) => {
  const text = String(error?.message || error || "");
  if (text.includes("InvalidState")) return "This action is not valid for the current lobby state.";
  if (text.includes("Unauthorized")) return "This wallet is not authorized for that action.";
  if (text.includes("DeadlineNotReached")) return "Refund is locked until the on-chain deadline.";
  if (text.includes("InvalidWinner")) return "Winner must be either host or guest wallet.";
  return text || "Action failed.";
};

export default function WagerWipTab() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [lobbies, setLobbies] = useState([]);
  const [selectedLobbyId, setSelectedLobbyId] = useState("");
  const [stakeTier, setStakeTier] = useState("TIER_010");
  const [busyAction, setBusyAction] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [winnerUserId, setWinnerUserId] = useState("");

  const connectedWallet = wallet?.publicKey?.toBase58() || "";
  const refereePubkey = process.env.NEXT_PUBLIC_WAGER_REFEREE_PUBKEY || "";
  const programIdStr = process.env.NEXT_PUBLIC_WAGER_PROGRAM_ID || wagerIdl?.address || "";

  const isBusy = Boolean(busyAction);
  const selectedLobby = useMemo(() => lobbies.find((l) => l.id === selectedLobbyId) || null, [lobbies, selectedLobbyId]);

  const getAccessToken = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const token = data?.session?.access_token;
    if (!token) throw new Error("Login required.");
    return token;
  }, []);

  const callLobbyApi = useCallback(
    async (payload, path = "/api/wager/lobbies") => {
      const token = await getAccessToken();
      const res = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Request failed.");
      return json;
    },
    [getAccessToken],
  );

  const fetchLobbies = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/wager/lobbies", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to load lobbies.");
      const next = json?.lobbies || [];
      setLobbies(next);
      if (selectedLobbyId && !next.find((l) => l.id === selectedLobbyId)) setSelectedLobbyId("");
    } catch (error) {
      setErr(readAnchorError(error));
    }
  }, [getAccessToken, selectedLobbyId]);

  useEffect(() => {
    fetchLobbies();
    const iv = setInterval(fetchLobbies, 4000);
    return () => clearInterval(iv);
  }, [fetchLobbies]);

  const withAction = useCallback(async (label, fn) => {
    setBusyAction(label);
    setErr("");
    setMsg("");
    try {
      await fn();
    } catch (error) {
      setErr(readAnchorError(error));
    } finally {
      setBusyAction("");
    }
  }, []);

  const getProgram = useCallback(() => {
    if (!programIdStr) throw new Error("Missing NEXT_PUBLIC_WAGER_PROGRAM_ID.");
    if (!wallet?.publicKey || !wallet.signTransaction) throw new Error("Connect Phantom first.");
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    return {
      program: new Program({ ...wagerIdl, address: programIdStr }, provider),
      programId: new PublicKey(programIdStr),
    };
  }, [connection, programIdStr, wallet]);

  const findWagerMatch = useCallback(
    (gameCode) => {
      const { programId } = getProgram();
      const [wagerMatch] = PublicKey.findProgramAddressSync([Buffer.from("wager_match"), Buffer.from(gameCode)], programId);
      return wagerMatch;
    },
    [getProgram],
  );

  const createLobby = useCallback(
    () =>
      withAction("create_lobby", async () => {
        if (!connectedWallet) throw new Error("Connect Phantom first.");
        const response = await callLobbyApi({
          action: "create",
          stakeTier,
          walletPubkey: connectedWallet,
        });
        setSelectedLobbyId(response?.lobby?.id || "");
        await fetchLobbies();
        setMsg("Lobby created.");
      }),
    [callLobbyApi, connectedWallet, fetchLobbies, stakeTier, withAction],
  );

  const joinLobby = useCallback(
    (lobbyId) =>
      withAction("join_lobby", async () => {
        if (!connectedWallet) throw new Error("Connect Phantom first.");
        await callLobbyApi({
          action: "join",
          lobbyId,
          walletPubkey: connectedWallet,
        });
        setSelectedLobbyId(lobbyId);
        await fetchLobbies();
        setMsg("Joined lobby.");
      }),
    [callLobbyApi, connectedWallet, fetchLobbies, withAction],
  );

  const leaveLobby = useCallback(
    (lobbyId) =>
      withAction("leave_lobby", async () => {
        await callLobbyApi({ action: "leave", lobbyId });
        await fetchLobbies();
        if (selectedLobbyId === lobbyId) setSelectedLobbyId("");
        setMsg("Left lobby.");
      }),
    [callLobbyApi, fetchLobbies, selectedLobbyId, withAction],
  );

  const setLobbyStatus = useCallback(
    async (lobbyId, status, txSig = null, extras = {}) => {
      await callLobbyApi({
        action: "set_status",
        lobbyId,
        status,
        txSig,
        ...extras,
      });
      await fetchLobbies();
    },
    [callLobbyApi, fetchLobbies],
  );

  const initializeAndFundHost = useCallback(
    (lobby) =>
      withAction("host_initialize_fund", async () => {
        if (!connectedWallet) throw new Error("Connect Phantom first.");
        if (!refereePubkey) throw new Error("Missing NEXT_PUBLIC_WAGER_REFEREE_PUBKEY.");
        const { program } = getProgram();
        const wagerMatch = findWagerMatch(lobby.game_code);
        const deadlineTs = Number(lobby.deadline_ts || Math.floor(Date.now() / 1000) + 900);

        await program.methods
          .initializeMatch(lobby.game_code, new BN(Number(lobby.stake_lamports || 0)), new BN(deadlineTs), new PublicKey(refereePubkey))
          .accounts({
            wagerMatch,
            host: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        const fundSig = await program.methods
          .fundHost()
          .accounts({
            wagerMatch,
            host: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        await setLobbyStatus(lobby.id, "host_funded", fundSig, {
          wagerMatchPda: wagerMatch.toBase58(),
          deadlineTs,
        });
        setMsg("Host initialized + funded on-chain.");
      }),
    [connectedWallet, findWagerMatch, getProgram, refereePubkey, setLobbyStatus, wallet.publicKey, withAction],
  );

  const guestFund = useCallback(
    (lobby) =>
      withAction("guest_fund", async () => {
        if (!connectedWallet) throw new Error("Connect Phantom first.");
        const { program } = getProgram();
        const wagerMatch = lobby.wager_match_pda ? new PublicKey(lobby.wager_match_pda) : findWagerMatch(lobby.game_code);
        const sig = await program.methods
          .joinAndFund()
          .accounts({
            wagerMatch,
            guest: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        await setLobbyStatus(lobby.id, "both_funded", sig);
        setMsg("Guest funded escrow.");
      }),
    [connectedWallet, findWagerMatch, getProgram, setLobbyStatus, wallet.publicKey, withAction],
  );

  const markInProgress = useCallback(
    (lobby) =>
      withAction("mark_in_progress", async () => {
        await setLobbyStatus(lobby.id, "in_progress");
        setMsg("Lobby marked in-progress. Play duel, then settle winner.");
      }),
    [setLobbyStatus, withAction],
  );

  const settleWinner = useCallback(
    (lobby) =>
      withAction("settle_winner", async () => {
        if (!winnerUserId) throw new Error("Select winner first.");
        const token = await getAccessToken();
        const res = await fetch("/api/wager/settle", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lobbyId: lobby.id, winnerUserId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Settle failed.");
        await fetchLobbies();
        setMsg(`Settled on-chain: ${String(json?.signature || "").slice(0, 10)}...`);
      }),
    [fetchLobbies, getAccessToken, winnerUserId, withAction],
  );

  const refundHost = useCallback(
    (lobby) =>
      withAction("refund_host", async () => {
        const { program } = getProgram();
        const wagerMatch = lobby.wager_match_pda ? new PublicKey(lobby.wager_match_pda) : findWagerMatch(lobby.game_code);
        const sig = await program.methods
          .refundHostExpired()
          .accounts({
            wagerMatch,
            host: wallet.publicKey,
          })
          .rpc();
        await setLobbyStatus(lobby.id, "refunded", sig);
        setMsg("Host refunded.");
      }),
    [findWagerMatch, getProgram, setLobbyStatus, wallet.publicKey, withAction],
  );

  const myUserLobbies = useMemo(() => lobbies.filter((l) => !TERMINAL_STATUSES.has(String(l.status || "").toLowerCase())), [lobbies]);

  return (
    <div className="menu-bg" style={{ justifyContent: "flex-start", overflowY: "auto", overflowX: "hidden", paddingTop: 20, paddingBottom: 52 }}>
      <div className="grid-bg" />
      <div className="menu-inner" style={{ maxWidth: 1120 }}>
        <div className="glass-card" style={{ padding: 18, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 2.4, color: C.yellow, marginBottom: 6 }}>WAGER QUEUE // DEVNET MVP</div>
            <h2 style={{ fontSize: 32, lineHeight: 1, letterSpacing: -1, color: C.text, marginBottom: 8 }}>Real User Wager Workflow</h2>
            <div style={{ fontSize: 12, color: C.textMuted }}>Connect Phantom, create/join lobby, fund escrow, play duel, settle winner.</div>
          </div>
          <WalletMultiButton className="btn-primary" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12 }}>
          <div className="glass-card" style={{ padding: 14 }}>
            <div style={{ fontSize: 10, color: C.textGhost, letterSpacing: 2, marginBottom: 8 }}>&gt; CREATE LOBBY</div>
            <div style={{ display: "grid", gap: 8 }}>
              {STAKE_TIERS.map((tier) => {
                const active = tier.key === stakeTier;
                return (
                  <button
                    key={tier.key}
                    onClick={() => setStakeTier(tier.key)}
                    className="btn-ghost"
                    style={{
                      height: 38,
                      borderColor: active ? C.green : C.border,
                      color: active ? C.green : C.textMuted,
                      background: active ? `${C.green}10` : "transparent",
                      fontSize: 11,
                      letterSpacing: 1.2,
                    }}
                  >
                    {tier.label}
                  </button>
                );
              })}
              <button onClick={createLobby} className="btn-primary btn-green" disabled={!connectedWallet || isBusy} style={{ height: 42, fontSize: 11, letterSpacing: 1.5 }}>
                {busyAction === "create_lobby" ? "CREATING..." : "CREATE WAGER LOBBY"}
              </button>
            </div>

            <div style={{ marginTop: 14, fontSize: 10, color: C.textGhost, letterSpacing: 2 }}>&gt; OPEN LOBBIES</div>
            <div style={{ marginTop: 8, display: "grid", gap: 8, maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
              {myUserLobbies.length === 0 ? (
                <div style={{ border: `1px dashed ${C.border}`, borderRadius: 8, padding: 14, fontSize: 10, color: C.textDim, textAlign: "center" }}>No active wager lobbies.</div>
              ) : (
                myUserLobbies.map((lobby) => {
                  const selected = selectedLobbyId === lobby.id;
                  const canJoin = connectedWallet && lobby.status === "open" && !lobby.guest_user_id;
                  return (
                    <div key={lobby.id} style={{ border: `1px solid ${selected ? C.cyan : C.border}`, borderRadius: 8, background: selected ? `${C.cyan}10` : "rgba(0,0,0,0.35)", padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: C.text, fontFamily: "var(--mono)" }}>{lobby.code}</span>
                        <span style={{ fontSize: 9, color: C.textDim }}>{lobby.status}</span>
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 8 }}>{(Number(lobby.stake_lamports || 0) / 1_000_000_000).toFixed(3)} SOL</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
                        <button onClick={() => setSelectedLobbyId(lobby.id)} className="btn-ghost" style={{ height: 30, fontSize: 9 }}>
                          VIEW
                        </button>
                        <button onClick={() => joinLobby(lobby.id)} className="btn-primary btn-green" disabled={!canJoin || isBusy} style={{ height: 30, fontSize: 9, padding: "0 10px" }}>
                          JOIN
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 14 }}>
            <div style={{ fontSize: 10, color: C.textGhost, letterSpacing: 2, marginBottom: 8 }}>&gt; LOBBY WORKFLOW</div>
            {!selectedLobby ? (
              <div style={{ border: `1px dashed ${C.border}`, borderRadius: 8, padding: 20, textAlign: "center", fontSize: 11, color: C.textDim }}>
                Select a lobby to run the wager workflow.
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginBottom: 10 }}>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, color: C.textGhost }}>STATUS</div>
                    <div style={{ fontSize: 11, color: C.cyan, fontWeight: 900 }}>{selectedLobby.status}</div>
                  </div>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, color: C.textGhost }}>STAKE</div>
                    <div style={{ fontSize: 11, color: C.text }}>{(Number(selectedLobby.stake_lamports || 0) / 1_000_000_000).toFixed(3)} SOL</div>
                  </div>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, color: C.textGhost }}>HOST</div>
                    <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "var(--mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedLobby.host_pubkey || "-"}
                    </div>
                  </div>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, color: C.textGhost }}>GUEST</div>
                    <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "var(--mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedLobby.guest_pubkey || "-"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 8, marginBottom: 10 }}>
                  <button
                    onClick={() => initializeAndFundHost(selectedLobby)}
                    className="btn-primary btn-green"
                    disabled={
                      isBusy ||
                      !connectedWallet ||
                      connectedWallet !== selectedLobby.host_pubkey ||
                      !["matched", "open"].includes(String(selectedLobby.status))
                    }
                    style={{ height: 38, fontSize: 10 }}
                  >
                    HOST INIT+FUND
                  </button>
                  <button
                    onClick={() => guestFund(selectedLobby)}
                    className="btn-primary btn-blue"
                    disabled={isBusy || !connectedWallet || connectedWallet !== selectedLobby.guest_pubkey || selectedLobby.status !== "host_funded"}
                    style={{ height: 38, fontSize: 10 }}
                  >
                    GUEST FUND
                  </button>
                  <button
                    onClick={() => markInProgress(selectedLobby)}
                    className="btn-ghost"
                    disabled={isBusy || !["both_funded"].includes(String(selectedLobby.status))}
                    style={{ height: 38, fontSize: 10 }}
                  >
                    START DUEL
                  </button>
                  <button
                    onClick={() => refundHost(selectedLobby)}
                    className="btn-ghost"
                    disabled={
                      isBusy ||
                      !connectedWallet ||
                      connectedWallet !== selectedLobby.host_pubkey ||
                      !["host_funded", "refund_available"].includes(String(selectedLobby.status)) ||
                      Number(selectedLobby.deadline_ts || 0) > Math.floor(Date.now() / 1000)
                    }
                    style={{ height: 38, fontSize: 10 }}
                  >
                    REFUND
                  </button>
                  <button onClick={() => leaveLobby(selectedLobby.id)} className="btn-ghost" disabled={isBusy} style={{ height: 38, fontSize: 10 }}>
                    LEAVE
                  </button>
                </div>

                <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: C.textGhost, marginBottom: 6, letterSpacing: 1.2 }}>SETTLEMENT</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
                    <button
                      className="btn-ghost"
                      onClick={() => setWinnerUserId(selectedLobby.host_user_id)}
                      style={{
                        height: 34,
                        borderColor: winnerUserId === selectedLobby.host_user_id ? C.green : C.border,
                        color: winnerUserId === selectedLobby.host_user_id ? C.green : C.textMuted,
                        background: winnerUserId === selectedLobby.host_user_id ? `${C.green}10` : "transparent",
                        fontSize: 10,
                      }}
                    >
                      HOST WON
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => setWinnerUserId(selectedLobby.guest_user_id || "")}
                      disabled={!selectedLobby.guest_user_id}
                      style={{
                        height: 34,
                        borderColor: winnerUserId === selectedLobby.guest_user_id ? C.green : C.border,
                        color: winnerUserId === selectedLobby.guest_user_id ? C.green : C.textMuted,
                        background: winnerUserId === selectedLobby.guest_user_id ? `${C.green}10` : "transparent",
                        fontSize: 10,
                      }}
                    >
                      GUEST WON
                    </button>
                    <button
                      onClick={() => settleWinner(selectedLobby)}
                      className="btn-primary btn-orange"
                      disabled={isBusy || !winnerUserId || !["both_funded", "in_progress"].includes(String(selectedLobby.status))}
                      style={{ height: 34, fontSize: 10, padding: "0 12px" }}
                    >
                      SETTLE
                    </button>
                  </div>
                </div>

                <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", background: "rgba(0,0,0,0.35)" }}>
                  <div style={{ fontSize: 9, color: C.textGhost, marginBottom: 4, letterSpacing: 1.1 }}>TX</div>
                  <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "var(--mono)" }}>
                    settle: {selectedLobby.settle_tx_sig || "pending"} <br />
                    refund: {selectedLobby.refund_tx_sig || "pending"}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {err ? (
          <div style={{ marginTop: 10, border: `1px solid ${C.red}55`, background: `${C.red}10`, color: C.red, borderRadius: 8, padding: "8px 10px", fontSize: 11 }}>
            {err}
          </div>
        ) : null}
        {!err && msg ? (
          <div style={{ marginTop: 10, border: `1px solid ${C.green}55`, background: `${C.green}10`, color: C.green, borderRadius: 8, padding: "8px 10px", fontSize: 11 }}>
            {msg}
          </div>
        ) : null}
      </div>
    </div>
  );
}

