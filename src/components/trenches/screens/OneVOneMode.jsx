import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { C } from "../config/constants";
import useGameEngine from "../hooks/useGameEngine";
import { genCode } from "../lib/gameGen";
import { SFX } from "../lib/sfx";
import { GameView, PerfPanel } from "../ui/shared";

const POLL_MS = 800;
const STATS_PUSH_MS = 500;
const MATCH_TIMEOUT_MS = 60_000;

function OneVOneMode({ onMatchComplete, initialJoinCode = "" }) {
  const [phase, setPhase] = useState("lobby");
  const [gameCode, setGameCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [opponentStats, setOpponentStats] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [bestOf, setBestOf] = useState(10);
  const [gameSeed, setGameSeed] = useState(null);
  const [isPublicLobby, setIsPublicLobby] = useState(true);
  const [publicLobbies, setPublicLobbies] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [localDone, setLocalDone] = useState(false);
  const [timeoutAt, setTimeoutAt] = useState(null);
  const [msg, setMsg] = useState("");

  const countdownRef = useRef(null);
  const supabaseWarnedRef = useRef(false);
  const lobbyPollRef = useRef(null);
  const pollRef = useRef(null);
  const resultSavedRef = useRef(false);
  const autoJoinAttemptRef = useRef("");

  const phaseRef = useRef(phase);
  const isHostRef = useRef(isHost);
  const gameCodeRef = useRef(gameCode);
  const bestOfRef = useRef(bestOf);
  const localDoneRef = useRef(localDone);
  const engineStatsRef = useRef(null);
  const roundNumRef = useRef(0);

  const engine = useGameEngine(1, gameSeed);
  const [playerId] = useState(() => `player-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const normalizedInitialJoinCode = (initialJoinCode || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);
  useEffect(() => {
    gameCodeRef.current = gameCode;
  }, [gameCode]);
  useEffect(() => {
    bestOfRef.current = bestOf;
  }, [bestOf]);
  useEffect(() => {
    localDoneRef.current = localDone;
  }, [localDone]);
  useEffect(() => {
    engineStatsRef.current = engine.stats;
  }, [engine.stats]);
  useEffect(() => {
    roundNumRef.current = engine.roundNum;
  }, [engine.roundNum]);

  const ensureSupabase = useCallback(() => {
    if (supabase) return true;
    if (!supabaseWarnedRef.current) {
      supabaseWarnedRef.current = true;
      alert("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
    }
    return false;
  }, []);

  const getGame = useCallback(async (code) => {
    const { data, error } = await supabase.from("duel_games").select("*").eq("code", code).maybeSingle();
    if (error) throw new Error(error.message || "Failed to load duel room.");
    return data || null;
  }, []);

  const getStats = useCallback(async (code, role) => {
    const { data, error } = await supabase
      .from("duel_game_stats")
      .select("*")
      .eq("game_code", code)
      .eq("player_role", role)
      .maybeSingle();
    if (error) throw new Error(error.message || "Failed to load duel stats.");
    return data || null;
  }, []);

  const upsertGame = useCallback(async (payload) => {
    const { data, error } = await supabase.from("duel_games").upsert(payload, { onConflict: "code" }).select("*").single();
    if (error) throw new Error(error.message || "Failed to save duel room.");
    return data;
  }, []);

  const updateGame = useCallback(async (code, patch, expectedStatus = null) => {
    let query = supabase.from("duel_games").update(patch).eq("code", code);
    if (expectedStatus) query = query.eq("status", expectedStatus);
    const { data, error } = await query.select("*").maybeSingle();
    if (error) throw new Error(error.message || "Failed to update duel room.");
    return data || null;
  }, []);

  const upsertStats = useCallback(async (code, role, patch) => {
    const { data, error } = await supabase
      .from("duel_game_stats")
      .upsert({ game_code: code, player_role: role, ...patch }, { onConflict: "game_code,player_role" })
      .select("*")
      .single();
    if (error) throw new Error(error.message || "Failed to sync duel stats.");
    return data;
  }, []);

  const deleteGameAndStats = useCallback(async (code) => {
    const { error: statsError } = await supabase.from("duel_game_stats").delete().eq("game_code", code);
    if (statsError) throw new Error(statsError.message || "Failed to remove duel stats.");
    const { error } = await supabase.from("duel_games").delete().eq("code", code);
    if (error) throw new Error(error.message || "Failed to remove duel room.");
  }, []);

  const deleteStatsRow = useCallback(async (code, role) => {
    const { error } = await supabase.from("duel_game_stats").delete().eq("game_code", code).eq("player_role", role);
    if (error) throw new Error(error.message || "Failed to remove duel stats row.");
  }, []);

  const fetchPublicLobbies = useCallback(async () => {
    if (!ensureSupabase()) return;
    try {
      const { data, error } = await supabase
        .from("duel_games")
        .select("code,host_id,host_name,best_of,created_at")
        .eq("status", "waiting")
        .eq("is_public", true)
        .is("guest_id", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const next = (data || []).filter((l) => l.host_id !== playerId);
      setPublicLobbies((prev) => {
        if (
          prev.length === next.length &&
          prev.every(
            (p, i) =>
              p.code === next[i]?.code &&
              p.host_id === next[i]?.host_id &&
              p.host_name === next[i]?.host_name &&
              p.best_of === next[i]?.best_of,
          )
        ) {
          return prev;
        }
        return next;
      });
    } catch (e) {
      setMsg(e?.message || "Failed to fetch public lobbies.");
    }
  }, [ensureSupabase, playerId]);

  const computeResult = useCallback((myScore, oppScore) => {
    const safeMy = Number(myScore || 0);
    const safeOpp = Number(oppScore || 0);
    return {
      myScore: safeMy,
      oppScore: safeOpp,
      win: safeMy > safeOpp,
    };
  }, []);

  const resetDuelView = useCallback(() => {
    clearInterval(pollRef.current);
    engine.reset();
    resultSavedRef.current = false;
    setPhase("lobby");
    setGameCode("");
    setJoinCode("");
    setOpponentName("");
    setOpponentStats(null);
    setMatchResult(null);
    setCountdown(null);
    setGameSeed(null);
    setLocalDone(false);
    setTimeoutAt(null);
    countdownRef.current = null;
    localDoneRef.current = false;
    setMsg("");
  }, [engine]);

  const cleanupLobby = useCallback(
    async (code) => {
      const normalizedCode = (code || "").toUpperCase().trim();
      if (normalizedCode.length !== 6 || !ensureSupabase()) return;
      const game = await getGame(normalizedCode);
      if (!game) return;
      const amHost = game.host_id === playerId;
      const amGuest = game.guest_id === playerId;
      if (!amHost && !amGuest) return;
      if (amHost) {
        await deleteGameAndStats(normalizedCode);
        return;
      }
      if (amGuest) {
        await updateGame(
          normalizedCode,
          {
            guest_id: null,
            guest_name: null,
            status: "waiting",
            timeout_at: null,
          },
          null,
        );
        await deleteStatsRow(normalizedCode, "guest");
      }
    },
    [deleteGameAndStats, deleteStatsRow, ensureSupabase, getGame, playerId, updateGame],
  );

  const backToLobby = useCallback(
    async ({ skipCleanup = false } = {}) => {
      const leavingCode = gameCodeRef.current;
      clearInterval(pollRef.current);
      if (!skipCleanup) {
        try {
          await cleanupLobby(leavingCode);
        } catch (e) {
          setMsg(e?.message || "Failed to leave room cleanly.");
        }
      }
      resetDuelView();
    },
    [cleanupLobby, resetDuelView],
  );

  const runCountdown = useCallback(() => {
    if (countdownRef.current) return;
    countdownRef.current = true;
    let n = 3;
    setCountdown(n);
    SFX.countdown(n);
    const iv = setInterval(() => {
      n -= 1;
      setCountdown(n);
      SFX.countdown(n);
      if (n <= 0) {
        clearInterval(iv);
        setTimeout(() => {
          setCountdown(null);
          countdownRef.current = null;
          setPhase("playing");
          setLocalDone(false);
          localDoneRef.current = false;
          engine.reset();
          const code = gameCodeRef.current;
          if (code) {
            void updateGame(code, { status: "playing" }, "countdown").catch((e) => {
              setMsg(e?.message || "Failed to transition duel to playing state.");
            });
          }
        }, 400);
      }
    }, 1000);
  }, [engine, updateGame]);

  const finalizeMatch = useCallback(
    async (code, amHost, fallbackOppStats = null) => {
      const myRole = amHost ? "host" : "guest";
      const oppRole = amHost ? "guest" : "host";
      const [myStats, oppStats] = await Promise.all([getStats(code, myRole), fallbackOppStats ? Promise.resolve(fallbackOppStats) : getStats(code, oppRole)]);
      const result = computeResult(myStats?.score, oppStats?.score);
      setOpponentStats(oppStats || null);
      setMatchResult(result);
      setPhase("results");
      clearInterval(pollRef.current);
      return result;
    },
    [computeResult, getStats],
  );

  const startPolling = useCallback(
    (code) => {
      clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        if (!ensureSupabase()) return;
        try {
          const game = await getGame(code);
          if (!game) {
            setMsg("Room no longer exists.");
            await backToLobby({ skipCleanup: true });
            return;
          }
          const amHost = game.host_id === playerId;
          const amGuest = game.guest_id === playerId;
          if (!amHost && !amGuest) {
            setMsg("You are no longer in this room.");
            await backToLobby({ skipCleanup: true });
            return;
          }
          setIsHost(amHost);
          setOpponentName(amHost ? game.guest_name || "" : game.host_name || "");
          setTimeoutAt(game.timeout_at || null);
          if (game.seed) setGameSeed(game.seed);
          if (game.best_of) setBestOf(game.best_of);

          const myRole = amHost ? "host" : "guest";
          const oppRole = amHost ? "guest" : "host";
          const [myStats, oppStats] = await Promise.all([getStats(code, myRole), getStats(code, oppRole)]);
          if (oppStats) setOpponentStats(oppStats);
          if (myStats?.is_done) {
            setLocalDone(true);
            localDoneRef.current = true;
          }

          if (game.status === "countdown" && !countdownRef.current && phaseRef.current !== "playing") {
            runCountdown();
          } else if (game.status === "playing" && phaseRef.current !== "playing" && !countdownRef.current) {
            setPhase("playing");
            setLocalDone(false);
            localDoneRef.current = false;
            engine.reset();
          }

          if (game.status === "finished") {
            await finalizeMatch(code, amHost, oppStats || null);
            return;
          }

          if (game.status === "playing") {
            const now = Date.now();
            const timeoutTs = game.timeout_at ? new Date(game.timeout_at).getTime() : null;
            const bothDone = Boolean(myStats?.is_done && oppStats?.is_done);
            const oneDone = Boolean(myStats?.is_done || oppStats?.is_done);

            if (bothDone) {
              await updateGame(code, { status: "finished" }, "playing");
              return;
            }

            if (oneDone) {
              if (!game.timeout_at) {
                await updateGame(code, { timeout_at: new Date(now + MATCH_TIMEOUT_MS).toISOString() }, "playing");
              } else if (Number.isFinite(timeoutTs) && now >= timeoutTs) {
                await updateGame(code, { status: "finished" }, "playing");
                return;
              }
            }
          }
        } catch (e) {
          setMsg(e?.message || "Duel sync failed.");
        }
      }, POLL_MS);
    },
    [backToLobby, engine, ensureSupabase, finalizeMatch, getGame, getStats, playerId, runCountdown, updateGame],
  );

  const createGame = useCallback(async () => {
    if (!ensureSupabase()) return;
    setMsg("");
    try {
      let code = "";
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const next = genCode();
        const existing = await getGame(next);
        if (!existing) {
          code = next;
          break;
        }
      }
      if (!code) throw new Error("Could not allocate a unique room code.");
      const name = playerName || "Player 1";
      const seed = Date.now();
      await upsertGame({
        code,
        host_id: playerId,
        host_name: name,
        guest_id: null,
        guest_name: null,
        status: "waiting",
        seed,
        best_of: bestOf,
        is_public: isPublicLobby,
        timeout_at: null,
        started_at: null,
      });
      resultSavedRef.current = false;
      setGameCode(code);
      setJoinCode(code);
      setIsHost(true);
      setGameSeed(seed);
      setLocalDone(false);
      setTimeoutAt(null);
      setPhase("waiting");
      startPolling(code);
    } catch (e) {
      setMsg(e?.message || "Failed to create room.");
    }
  }, [bestOf, ensureSupabase, getGame, isPublicLobby, playerId, playerName, startPolling, upsertGame]);

  const joinGame = useCallback(
    async (explicitCode = null) => {
      if (!ensureSupabase()) return;
      const code = (explicitCode || joinCode).toUpperCase().trim();
      if (code.length !== 6) {
        setMsg("Enter a valid 6-character room code.");
        return;
      }
      setMsg("");
      try {
        const game = await getGame(code);
        if (!game || game.status !== "waiting") throw new Error("Game not found or already started.");
        if (game.host_id === playerId) throw new Error("You can't join your own lobby.");
        const name = playerName || "Player 2";
        const { data, error } = await supabase
          .from("duel_games")
          .update({
            guest_id: playerId,
            guest_name: name,
            status: "ready",
          })
          .eq("code", code)
          .eq("status", "waiting")
          .is("guest_id", null)
          .select("*")
          .maybeSingle();
        if (error) throw new Error(error.message || "Failed to join room.");
        if (!data) throw new Error("Room was taken. Please refresh lobbies.");

        resultSavedRef.current = false;
        setJoinCode(code);
        setGameCode(code);
        setIsHost(false);
        setOpponentName(data.host_name || "");
        setGameSeed(data.seed || null);
        setBestOf(data.best_of || 10);
        setIsPublicLobby(Boolean(data.is_public));
        setLocalDone(false);
        setTimeoutAt(data.timeout_at || null);
        setPhase("waiting");
        startPolling(code);
      } catch (e) {
        setMsg(e?.message || "Failed to join room.");
      }
    },
    [ensureSupabase, getGame, joinCode, playerId, playerName, startPolling],
  );

  const joinPublicLobby = useCallback(async (code) => {
    await joinGame(code);
  }, [joinGame]);

  const startMatch = useCallback(async () => {
    if (!ensureSupabase()) return;
    if (!isHostRef.current) {
      setMsg("Only the host can start this match.");
      return;
    }
    const code = gameCodeRef.current;
    if (!code) return;
    setMsg("");
    try {
      const room = await getGame(code);
      if (!room?.guest_id) throw new Error("Waiting for opponent to join.");
      const seed = Date.now();
      const updated = await updateGame(
        code,
        {
          status: "countdown",
          seed,
          best_of: bestOfRef.current,
          started_at: new Date().toISOString(),
          timeout_at: null,
        },
        "ready",
      );
      if (!updated) throw new Error("Room is not ready to start.");
      setGameSeed(seed);
      setTimeoutAt(null);
      runCountdown();
    } catch (e) {
      setMsg(e?.message || "Failed to start match.");
    }
  }, [ensureSupabase, getGame, runCountdown, updateGame]);

  useEffect(() => {
    if (phase !== "playing" || !gameCode) return;
    const iv = setInterval(async () => {
      if (!ensureSupabase()) return;
      const role = isHostRef.current ? "host" : "guest";
      const stats = engineStatsRef.current;
      const roundNum = roundNumRef.current;
      const reachedCap = roundNum >= bestOfRef.current;
      const doneNow = localDoneRef.current || reachedCap;
      if (reachedCap && !localDoneRef.current) {
        localDoneRef.current = true;
        setLocalDone(true);
        setMsg("You finished your rounds. Waiting for opponent...");
      }
      try {
        await upsertStats(gameCodeRef.current, role, {
          score: stats?.score || 0,
          streak: stats?.streak || 0,
          best_time: stats?.bestTime ?? null,
          hits: stats?.hits || 0,
          misses: stats?.misses || 0,
          last_time: stats?.lastTime ?? null,
          round_num: roundNum || 1,
          is_done: doneNow,
          done_at: doneNow ? new Date().toISOString() : null,
        });
      } catch (e) {
        setMsg(e?.message || "Failed to sync your duel stats.");
      }
    }, STATS_PUSH_MS);
    return () => clearInterval(iv);
  }, [bestOf, ensureSupabase, phase, gameCode, upsertStats]);

  useEffect(() => {
    if (phase !== "lobby") {
      clearInterval(lobbyPollRef.current);
      return;
    }
    fetchPublicLobbies();
    lobbyPollRef.current = setInterval(fetchPublicLobbies, 5000);
    return () => clearInterval(lobbyPollRef.current);
  }, [phase, fetchPublicLobbies]);

  useEffect(() => () => clearInterval(pollRef.current), []);
  useEffect(() => () => clearInterval(lobbyPollRef.current), []);

  useEffect(() => {
    if (normalizedInitialJoinCode.length !== 6) {
      autoJoinAttemptRef.current = "";
      return;
    }
    if (phase !== "lobby") return;
    setJoinCode(normalizedInitialJoinCode);
    if (autoJoinAttemptRef.current === normalizedInitialJoinCode) return;
    autoJoinAttemptRef.current = normalizedInitialJoinCode;
    void joinGame(normalizedInitialJoinCode);
  }, [joinGame, normalizedInitialJoinCode, phase]);

  useEffect(() => {
    if (phase !== "results" || !matchResult || resultSavedRef.current) return;
    resultSavedRef.current = true;
    onMatchComplete?.(matchResult);
  }, [matchResult, onMatchComplete, phase]);

  if (countdown !== null) {
    return (
      <div className="menu-bg">
        <div className="grid-bg" />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <div
            style={{
              fontSize: countdown === 0 ? 72 : 120,
              fontWeight: 900,
              color: countdown === 0 ? C.green : C.text,
              textShadow: countdown === 0 ? `0 0 40px ${C.green}40` : "none",
              animation: "countPop 0.8s ease",
              fontFamily: "var(--mono)",
            }}
          >
            {countdown === 0 ? "GO!" : countdown}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="menu-bg prac-page" style={{ paddingTop: 40 }}>
        <div className="grid-bg" />
        <div className="prac-shell" style={{ display: "grid", gridTemplateAreas: "'head head' 'form join' 'public public'", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 1000, width: "100%" }}>
          <div style={{ gridArea: "head", display: "flex", alignItems: "baseline", gap: 16, marginBottom: 12 }}>
            <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -2, color: C.orange }}>DUEL LOBBY</h1>
            <span style={{ fontSize: 10, color: C.textDim, letterSpacing: 4 }}>LIVE MATCHMAKING</span>
          </div>

          <div className="glass-card" style={{ gridArea: "form", padding: 28, display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ fontSize: 9, color: C.orange, letterSpacing: 2, fontWeight: 800, marginBottom: 20 }}>&gt; SETUP</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 2, marginBottom: 8 }}>DISPLAY NAME</div>
              <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Enter your name..." className="input-field" style={{ height: 44, fontSize: 13 }} />
            </div>
            <div style={{ marginBottom: 20, flex: 1 }}>
              <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 2, marginBottom: 8 }}>MATCH LENGTH</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[5, 10, 20].map((n) => {
                  const active = bestOf === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setBestOf(n)}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 6,
                        border: `1px solid ${active ? C.orange : C.border}`,
                        background: active ? `${C.orange}10` : "black",
                        color: active ? C.orange : C.textDim,
                        fontSize: 11,
                        fontWeight: active ? 900 : 600,
                        fontFamily: "var(--mono)",
                        cursor: "pointer",
                      }}
                    >
                      Best of {n}
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={createGame} className="btn-primary btn-orange" style={{ padding: "14px", fontSize: 12, fontWeight: 900, marginTop: "auto" }}>
              CREATE ROOM
            </button>
          </div>

          <div className="glass-card" style={{ gridArea: "join", padding: 28, display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
            <div style={{ fontSize: 9, color: C.cyan, letterSpacing: 2, fontWeight: 800, marginBottom: 20 }}>&gt; JOIN BY CODE</div>
            <div style={{ display: "flex", gap: 10, alignItems: "stretch", marginBottom: "auto", marginTop: "auto" }}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                maxLength={6}
                className="input-field"
                style={{ flex: 1, textAlign: "center", fontSize: 24, fontWeight: 900, letterSpacing: 6, height: 56, background: "black" }}
              />
              <button onClick={() => joinGame()} className="btn-primary btn-blue" style={{ width: 100, padding: 0, fontSize: 12, fontWeight: 900 }}>
                JOIN
              </button>
            </div>
            <div style={{ fontSize: 9, color: C.textDim, marginTop: 16, textAlign: "center" }}>Enter a 6-character room code</div>
          </div>

          <div className="glass-card" style={{ gridArea: "public", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: 9, color: C.green, letterSpacing: 2, fontWeight: 800 }}>&gt; PUBLIC LOBBIES</div>
              <button onClick={fetchPublicLobbies} className="btn-ghost" style={{ fontSize: 9, padding: "6px 12px" }}>
                REFRESH
              </button>
            </div>
            {publicLobbies.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: 8, color: C.textGhost, fontSize: 11 }}>No public lobbies right now.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
                {publicLobbies.map((l) => (
                  <div key={l.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: `1px solid ${C.border}`, borderRadius: 8, background: "black" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{l.host_name || "Unknown player"}</div>
                      <div style={{ fontSize: 9, color: C.textDim, marginTop: 4 }}>Code: {l.code} • Best of {l.best_of}</div>
                    </div>
                    <button onClick={() => joinPublicLobby(l.code)} className="btn-primary btn-green" style={{ width: "auto", padding: "8px 16px", fontSize: 10, fontWeight: 900 }}>
                      JOIN
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {msg ? (
            <div style={{ gridArea: "public", marginTop: 12, color: C.red, fontSize: 10, letterSpacing: 1.2 }}>{msg}</div>
          ) : null}
        </div>
      </div>
    );
  }

  if (phase === "waiting") {
    return (
      <div className="menu-bg prac-page">
        <div className="grid-bg" />
        <div className="prac-shell" style={{ maxWidth: 600, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 11, color: C.orange, letterSpacing: 6, fontWeight: 800, marginBottom: 32 }}>WAITING ROOM</div>
          <div className="glass-card" style={{ width: "100%", padding: 40, textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 3, marginBottom: 16 }}>ROOM CODE</div>
            <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 12, color: C.orange, lineHeight: 1 }}>{gameCode}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 24 }}>Share this code with your opponent.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, width: "100%", marginBottom: 32 }}>
            <div className="glass-card" style={{ padding: 24, textAlign: "center", borderColor: `${C.green}44` }}>
              <div style={{ fontSize: 8, color: C.green, letterSpacing: 2, marginBottom: 8 }}>YOU</div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>{playerName || "YOU"}</div>
              <div style={{ fontSize: 10, color: C.green, marginTop: 8 }}>Ready</div>
            </div>
            <div className="glass-card" style={{ padding: 24, textAlign: "center", borderColor: opponentName ? `${C.green}44` : `${C.red}44` }}>
              <div style={{ fontSize: 8, color: opponentName ? C.green : C.red, letterSpacing: 2, marginBottom: 8 }}>OPPONENT</div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>{opponentName || "SEARCHING..."}</div>
              <div style={{ fontSize: 10, color: opponentName ? C.green : C.red, marginTop: 8 }}>{opponentName ? "Connected" : "Waiting to join"}</div>
            </div>
          </div>
          {isHost && opponentName ? (
            <button onClick={startMatch} className="btn-primary btn-orange" style={{ padding: "20px", fontSize: 16, fontWeight: 900, letterSpacing: 4, width: "100%" }}>
              START MATCH &gt;
            </button>
          ) : null}
          <button onClick={backToLobby} className="btn-ghost" style={{ marginTop: 24 }}>
            LEAVE ROOM
          </button>
          {msg ? <div style={{ marginTop: 14, color: C.red, fontSize: 10, letterSpacing: 1.2 }}>{msg}</div> : null}
        </div>
      </div>
    );
  }

  if (phase === "results" && matchResult) {
    return (
      <div className="menu-bg prac-page">
        <div className="grid-bg" />
        <div className="prac-shell" style={{ maxWidth: 600, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 11, color: matchResult.win ? C.green : C.red, letterSpacing: 6, fontWeight: 800, marginBottom: 32 }}>MATCH RESULTS</div>
          <div style={{ fontSize: 80, marginBottom: 20 }}>{matchResult.win ? "🏆" : "💀"}</div>
          <h2 style={{ fontSize: 48, fontWeight: 900, color: matchResult.win ? C.green : C.red, letterSpacing: -2, marginBottom: 8 }}>{matchResult.win ? "Victory" : "Defeat"}</h2>
          <div style={{ fontSize: 11, color: C.textDim, letterSpacing: 4, marginBottom: 40 }}>Match complete.</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, width: "100%", marginBottom: 40 }}>
            <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 2, marginBottom: 8 }}>YOUR SCORE</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: C.text }}>{matchResult.myScore}</div>
            </div>
            <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 2, marginBottom: 8 }}>OPPONENT SCORE</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: C.text }}>{matchResult.oppScore}</div>
            </div>
          </div>

          <button onClick={backToLobby} className="btn-primary btn-green" style={{ padding: "20px", fontSize: 14, fontWeight: 900, letterSpacing: 2, width: "100%" }}>
            BACK TO LOBBY
          </button>
        </div>
      </div>
    );
  }

  const timeoutRemainingMs = timeoutAt ? new Date(timeoutAt).getTime() - Date.now() : null;
  const timeoutLabel = timeoutRemainingMs !== null && timeoutRemainingMs > 0 ? `${Math.ceil(timeoutRemainingMs / 1000)}s` : null;
  const oppPanel = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: 8.5, color: C.orange, letterSpacing: 2.5, marginBottom: 10, fontWeight: 700 }}>OPPONENT — {opponentName || "..."}</div>
        {opponentStats ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              ["SCORE", `${opponentStats.score}`, opponentStats.score > engine.stats.score ? C.red : C.textDim],
              ["STREAK", `${opponentStats.streak || "—"}`, opponentStats.streak >= 4 ? C.yellow : C.textDim],
              ["BEST", opponentStats.best_time ? `${(opponentStats.best_time / 1000).toFixed(2)}s` : "—", C.orange],
              ["LAST", opponentStats.last_time ? `${(opponentStats.last_time / 1000).toFixed(2)}s` : "—", C.blue],
            ].map(([l, v, c]) => (
              <div key={l} style={{ padding: "6px 9px", borderRadius: 6, background: C.bgCard, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 7, color: C.textDim, letterSpacing: 2, marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: c, fontFamily: "var(--mono)" }}>{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 10, color: C.textGhost, animation: "pulse 2s ease-in-out infinite" }}>Syncing...</div>
        )}
        {localDone ? <div style={{ marginTop: 10, fontSize: 10, color: C.cyan }}>You finished your rounds. Waiting for opponent...</div> : null}
        {timeoutLabel ? <div style={{ marginTop: 6, fontSize: 10, color: C.yellow }}>Auto-finish in {timeoutLabel}</div> : null}
        {msg ? <div style={{ marginTop: 6, fontSize: 10, color: C.red }}>{msg}</div> : null}
      </div>
      <div style={{ height: 1, background: C.border, flexShrink: 0 }} />
      <PerfPanel stats={engine.stats} history={engine.attemptHistory} />
    </div>
  );

  return <GameView engine={engine} onExit={() => backToLobby()} rightPanel={oppPanel} />;
}

export default OneVOneMode;
