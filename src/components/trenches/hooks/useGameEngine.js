import { useCallback, useEffect, useRef, useState } from "react";
import { C, CFG, getMult } from "../config/constants";
import { genNoiseToken, genRound } from "../lib/gameGen";
import { SFX } from "../lib/sfx";

const formatMultiplierLabel = (mult) => {
  if (Number.isInteger(mult)) return `x${mult.toFixed(0)}`;
  return `x${mult.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}`;
};

const getMultiplierTier = (mult) => (mult >= 3 ? 3 : mult >= 2 ? 2 : mult >= 1.5 ? 1 : 0);
const getDefaultStats = () => ({ score: 0, streak: 0, bestStreak: 0, bestTime: null, lastTime: null, hits: 0, misses: 0, penalties: 0, times: [] });

function useGameEngine(startDiff = 1, seed = null, maxDiffCap = 10, maxMultiplierCap = 3, options = {}) {
  const FEED_MAX = 40;
  const endRunOnFirstFailure = options?.endRunOnFirstFailure === true;
  const fixedRoundTimeLimitMs = Number.isFinite(options?.roundTimeLimitMs) && options.roundTimeLimitMs > 0 ? Math.round(options.roundTimeLimitMs) : null;
  const roundTimeLimitMsResolver = typeof options?.roundTimeLimitMsResolver === "function" ? options.roundTimeLimitMsResolver : null;
  const roundTransform = typeof options?.roundTransform === "function" ? options.roundTransform : null;

  const [stats, setStats] = useState(getDefaultStats);
  const [roundNum, setRoundNum] = useState(0);
  const [roundData, setRoundData] = useState(null);
  const [roundTimeLimitMs, setRoundTimeLimitMs] = useState(fixedRoundTimeLimitMs);
  const [peakRound, setPeakRound] = useState(0);
  const [runEndedReason, setRunEndedReason] = useState(null);
  const [spawned, setSpawned] = useState(new Set());
  const [txState, setTxState] = useState("idle");
  const [revealed, setRevealed] = useState(false);
  const [clickedId, setClickedId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [screenFlash, setScreenFlash] = useState(null);
  const [screenShake, setScreenShake] = useState(false);
  const [comboBurst, setComboBurst] = useState(null);
  const [tweetVis, setTweetVis] = useState(false);
  const [pairsVis, setPairsVis] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState(null);
  const [roundTimedOut, setRoundTimedOut] = useState(false);
  const [liveFeed, setLiveFeed] = useState([]);
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [holsterPhase, setHolsterPhase] = useState("idle");
  const [armProgress, setArmProgress] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const armStartRef = useRef(null);
  const armRafRef = useRef(null);
  const armTimeoutRef = useRef(null);
  const spawnRef = useRef([]);
  const fbRef = useRef(null);
  const nextRef = useRef(null);
  const roundNumRef = useRef(0);
  const holsterPhaseRef = useRef("idle");
  const noiseRef = useRef(null);
  const pausedRef = useRef(false);
  const revealedRef = useRef(false);
  const pauseStartedRef = useRef(null);
  const pausedSpawnQueueRef = useRef([]);
  const timerStartedRef = useRef(false);
  const roundLiveStartedAtRef = useRef(null);
  const prevMultTier = useRef(0);

  useEffect(() => {
    roundNumRef.current = roundNum;
  }, [roundNum]);
  useEffect(() => {
    holsterPhaseRef.current = holsterPhase;
  }, [holsterPhase]);
  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);

  const mult = Math.min(getMult(stats.streak), maxMultiplierCap);
  const multLabel = formatMultiplierLabel(mult);
  const multTier = getMultiplierTier(mult);
  const multColor = multTier >= 3 ? C.red : multTier >= 2 ? C.orange : multTier >= 1 ? C.yellow : C.textDim;
  const pnl = stats.score * mult;
  const difficulty = roundData ? roundData.diff : startDiff;

  useEffect(() => {
    if (multTier > prevMultTier.current && multTier > 0) {
      SFX.combo();
      setComboBurst(multLabel);
      setTimeout(() => setComboBurst(null), 900);
    }
    prevMultTier.current = multTier;
  }, [multTier, multLabel]);

  const clearAll = useCallback(() => {
    spawnRef.current.forEach(clearTimeout);
    spawnRef.current = [];
    clearTimeout(fbRef.current);
    clearTimeout(nextRef.current);
    clearInterval(noiseRef.current);
  }, []);

  const clampLiveFeed = useCallback((list) => {
    if (list.length <= FEED_MAX) return list;
    const clipped = list.slice(0, FEED_MAX);
    if (revealedRef.current) return clipped;
    if (clipped.some((c) => c?.isCorrect)) return clipped;
    const correct = list.find((c) => c?.isCorrect);
    if (!correct) return clipped;
    clipped[clipped.length - 1] = correct;
    return clipped;
  }, []);

  const flash = useCallback((c) => {
    setScreenFlash(c);
    setTimeout(() => setScreenFlash(null), 300);
  }, []);

  const shake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 350);
  }, []);

  const showFB = useCallback((type, rt = null) => {
    setFeedback({ id: Date.now(), type, rt });
    clearTimeout(fbRef.current);
    fbRef.current = setTimeout(() => setFeedback(null), 1200);
  }, []);

  const startTimerWhenCorrectVisible = useCallback((coin) => {
    if (!coin?.isCorrect || timerStartedRef.current || revealedRef.current) return;
    timerStartedRef.current = true;
    setTimerStart(Date.now());
    setTimerRunning(true);
  }, []);

  const startNoiseFeed = useCallback(
    (interval) => {
      clearInterval(noiseRef.current);
      noiseRef.current = setInterval(() => {
        if (pausedRef.current) return;
        const n = genNoiseToken();
        setLiveFeed((p) => clampLiveFeed([n, ...p]));
        setSpawned((p) => new Set([...p, n.id]));
      }, interval);
    },
    [clampLiveFeed]
  );

  const launchRound = useCallback(() => {
    clearAll();
    setIsPaused(false);
    pausedRef.current = false;
    pauseStartedRef.current = null;
    pausedSpawnQueueRef.current = [];
    roundLiveStartedAtRef.current = null;
    setRunEndedReason(null);

    const roundIndex = roundNumRef.current;
    const roundNumber = roundIndex + 1;
    const generatedData = genRound(roundIndex + Math.max(0, startDiff - 1) * 2, seed, maxDiffCap);
    const transformedData =
      roundTransform?.({
        roundData: generatedData,
        roundIndex,
        roundNumber,
      }) || generatedData;

    const resolvedRoundTimeLimitMs = roundTimeLimitMsResolver
      ? roundTimeLimitMsResolver({
          roundData: transformedData,
          roundIndex,
          roundNumber,
          baseRoundTimeLimitMs: fixedRoundTimeLimitMs,
        })
      : fixedRoundTimeLimitMs;
    const nextRoundTimeLimitMs = Number.isFinite(resolvedRoundTimeLimitMs) && resolvedRoundTimeLimitMs > 0 ? Math.round(resolvedRoundTimeLimitMs) : null;

    setRoundData(transformedData);
    setRoundTimeLimitMs(nextRoundTimeLimitMs);
    setSpawned(new Set());
    setRevealed(false);
    setClickedId(null);
    setShowCorrect(false);
    setTxState("spawning");
    setTweetVis(false);
    setPairsVis(false);
    setTimerRunning(false);
    setTimerStart(null);
    setRoundTimedOut(false);
    timerStartedRef.current = false;
    setHolsterPhase("live");
    setLiveFeed([]);
    setTimeout(() => setTweetVis(true), 100);
    setTimeout(() => {
      setPairsVis(true);
      setTxState("active");
      roundLiveStartedAtRef.current = Date.now();
      let si = 0;
      const sn = () => {
        if (si >= transformedData.pairs.length) {
          startNoiseFeed(transformedData.noiseInterval);
          return;
        }
        const c = transformedData.pairs[si];
        si += 1;
        if (pausedRef.current) {
          pausedSpawnQueueRef.current.push(c);
        } else {
          setLiveFeed((p) => clampLiveFeed([c, ...p]));
          setSpawned((p) => new Set([...p, c.id]));
          startTimerWhenCorrectVisible(c);
        }
        const t = setTimeout(sn, transformedData.spawnDelay);
        spawnRef.current.push(t);
      };
      sn();
    }, 400);
  }, [clearAll, clampLiveFeed, fixedRoundTimeLimitMs, maxDiffCap, roundTimeLimitMsResolver, roundTransform, seed, startDiff, startNoiseFeed, startTimerWhenCorrectVisible]);

  const cancelArm = useCallback(() => {
    cancelAnimationFrame(armRafRef.current);
    clearTimeout(armTimeoutRef.current);
    armStartRef.current = null;
    setArmProgress(0);
    if (holsterPhaseRef.current === "arming") setHolsterPhase("idle");
  }, []);

  const startArming = useCallback(() => {
    if (holsterPhaseRef.current !== "idle") return;
    setHolsterPhase("arming");
    SFX.arm();
    armStartRef.current = Date.now();
    const tick = () => {
      if (!armStartRef.current) return;
      const el = Date.now() - armStartRef.current;
      const prog = Math.min(el / CFG.holsterArm, 1);
      setArmProgress(prog);
      if (prog < 1) {
        armRafRef.current = requestAnimationFrame(tick);
      } else {
        setHolsterPhase("armed");
        SFX.armed();
        armTimeoutRef.current = setTimeout(() => launchRound(), 200);
      }
    };
    armRafRef.current = requestAnimationFrame(tick);
  }, [launchRound]);

  const handleHolsterEnter = useCallback(() => {
    if (holsterPhaseRef.current === "idle") startArming();
  }, [startArming]);

  const handleHolsterLeave = useCallback(() => {
    if (holsterPhaseRef.current === "arming") cancelArm();
  }, [cancelArm]);

  const handlePauseEnter = useCallback(() => {
    if (holsterPhaseRef.current !== "live" || revealedRef.current || pausedRef.current) return;
    setIsPaused(true);
    pausedRef.current = true;
    pauseStartedRef.current = Date.now();
  }, []);

  const handlePauseLeave = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    pauseStartedRef.current = null;
    setIsPaused(false);
    if (pausedSpawnQueueRef.current.length) {
      const queued = pausedSpawnQueueRef.current;
      pausedSpawnQueueRef.current = [];
      setLiveFeed((p) => clampLiveFeed([...queued.slice().reverse(), ...p]));
      setSpawned((p) => new Set([...p, ...queued.map((c) => c.id)]));
      const firstCorrect = queued.find((c) => c?.isCorrect);
      if (firstCorrect) startTimerWhenCorrectVisible(firstCorrect);
    }
  }, [clampLiveFeed, startTimerWhenCorrectVisible]);

  const finishRound = useCallback(
    (ok, reason = null) => {
      clearInterval(noiseRef.current);
      setIsPaused(false);
      pausedRef.current = false;
      pauseStartedRef.current = null;
      pausedSpawnQueueRef.current = [];
      setPeakRound((prev) => Math.max(prev, roundNumRef.current + (ok ? 1 : 0)));

      if (!ok) setShowCorrect(true);

      if (!ok && endRunOnFirstFailure) {
        setHolsterPhase("cooldown");
        setRunEndedReason(reason || "miss");
        setArmProgress(0);
        return;
      }

      setHolsterPhase("cooldown");
      setTimeout(() => {
        setRoundNum((p) => p + 1);
        setHolsterPhase("idle");
        setArmProgress(0);
        setShowCorrect(false);
      }, ok ? 1000 : 2000);
    },
    [endRunOnFirstFailure]
  );

  const handleBuy = useCallback(
    (coin) => {
      if (revealed) return;
      SFX.click();
      const fallbackStart = roundLiveStartedAtRef.current || Date.now();
      const effectiveStart = timerStart === null ? fallbackStart : timerStart;
      const rt = Math.max(0, Date.now() - effectiveStart);
      setTimerRunning(false);
      setRevealed(true);
      setClickedId(coin.id);
      clearAll();
      if (coin.isCorrect) {
        setTxState("hit");
        showFB("hit", rt);
        flash("green");
        SFX.hit();
        setStats((p) => {
          const ns = p.streak + 1;
          return {
            ...p,
            score: p.score + 1,
            streak: ns,
            bestStreak: Math.max(p.bestStreak, ns),
            bestTime: p.bestTime === null ? rt : Math.min(p.bestTime, rt),
            lastTime: rt,
            hits: p.hits + 1,
            times: [...p.times, rt],
          };
        });
        setAttemptHistory((p) => [...p, { id: Date.now(), type: "hit", rt, round: roundNumRef.current + 1 }]);
        finishRound(true, "hit");
      } else {
        setTxState("missed");
        showFB("wrong", rt);
        flash("red");
        shake();
        SFX.miss();
        setStats((p) => ({ ...p, score: Math.max(0, p.score - 1), streak: 0, misses: p.misses + 1, lastTime: rt }));
        setAttemptHistory((p) => [...p, { id: Date.now(), type: "wrong", rt, round: roundNumRef.current + 1 }]);
        finishRound(false, "miss");
      }
    },
    [clearAll, finishRound, flash, revealed, shake, showFB, timerStart]
  );

  useEffect(() => {
    if (!Number.isFinite(roundTimeLimitMs) || roundTimeLimitMs === null) return;
    if (!timerRunning || timerStart === null || revealed) return;
    const elapsed = Date.now() - timerStart;
    const remaining = Math.max(0, roundTimeLimitMs - elapsed);
    const timeoutId = setTimeout(() => {
      if (revealedRef.current) return;
      setTimerRunning(false);
      setRevealed(true);
      setRoundTimedOut(true);
      clearAll();
      setTxState("missed");
      showFB("timeout");
      flash("red");
      shake();
      SFX.miss();
      setStats((p) => ({ ...p, score: Math.max(0, p.score - 1), streak: 0, misses: p.misses + 1, lastTime: null }));
      setAttemptHistory((p) => [...p, { id: Date.now(), type: "timeout", rt: null, round: roundNumRef.current + 1 }]);
      finishRound(false, "timeout");
    }, remaining);
    return () => clearTimeout(timeoutId);
  }, [clearAll, finishRound, flash, revealed, roundTimeLimitMs, shake, showFB, timerRunning, timerStart]);

  const reset = useCallback(() => {
    clearAll();
    cancelAnimationFrame(armRafRef.current);
    clearTimeout(armTimeoutRef.current);
    clearInterval(noiseRef.current);
    setStats(getDefaultStats());
    setRoundNum(0);
    roundNumRef.current = 0;
    setRoundData(null);
    setRoundTimeLimitMs(fixedRoundTimeLimitMs);
    setPeakRound(0);
    setRunEndedReason(null);
    setSpawned(new Set());
    setTxState("idle");
    setRevealed(false);
    setClickedId(null);
    setFeedback(null);
    setScreenFlash(null);
    setScreenShake(false);
    setComboBurst(null);
    setTweetVis(false);
    setPairsVis(false);
    setTimerRunning(false);
    setTimerStart(null);
    setRoundTimedOut(false);
    timerStartedRef.current = false;
    roundLiveStartedAtRef.current = null;
    setLiveFeed([]);
    setAttemptHistory([]);
    setHolsterPhase("idle");
    setArmProgress(0);
    setShowCorrect(false);
    setIsPaused(false);
    pausedRef.current = false;
    pauseStartedRef.current = null;
    pausedSpawnQueueRef.current = [];
  }, [clearAll, fixedRoundTimeLimitMs]);

  useEffect(
    () => () => {
      clearAll();
      cancelAnimationFrame(armRafRef.current);
      clearTimeout(armTimeoutRef.current);
    },
    [clearAll]
  );

  return {
    stats,
    roundData,
    spawned,
    txState,
    revealed,
    clickedId,
    feedback,
    screenFlash,
    screenShake,
    comboBurst,
    showCorrect,
    isPaused,
    tweetVis,
    pairsVis,
    timerRunning,
    timerStart,
    roundTimedOut,
    roundTimeLimitMs,
    liveFeed,
    attemptHistory,
    holsterPhase,
    armProgress,
    mult,
    multLabel,
    multColor,
    pnl,
    difficulty,
    roundNum,
    peakRound,
    runEndedReason,
    handleHolsterEnter,
    handleHolsterLeave,
    handlePauseEnter,
    handlePauseLeave,
    handleBuy,
    reset,
  };
}

export default useGameEngine;
