import { useCallback, useEffect, useRef, useState } from "react";
import { C } from "../config/constants";
import useGameEngine from "../hooks/useGameEngine";
import { getPracticeDifficultyMultiplier } from "../lib/practiceRank";
import { GameView, SessionSummary } from "../ui/shared";

const SOLO_DIFFICULTY_SETTINGS = {
  1: { roundCap: 3, maxMultiplier: 2.0 },
  3: { roundCap: 5, maxMultiplier: 2.25 },
  5: { roundCap: 7, maxMultiplier: 2.5 },
  7: { roundCap: 9, maxMultiplier: 2.75 },
  10: { roundCap: 12, maxMultiplier: 3.0 },
};

const SOLO_ROUND_TIME_LIMIT_MS = 15000;
const ENDLESS_BASE_TIME_LIMIT_MS = 15000;
const ENDLESS_MIN_TIME_LIMIT_MS = 6500;
const ENDLESS_TIME_DECREMENT_MS = 220;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const formatMultiplier = (value) => {
  if (Number.isInteger(value)) return `x${value.toFixed(1)}`;
  const text = value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `x${text}`;
};

const getEndlessSpeedFactor = (roundNumber) => {
  const round = Math.max(1, Math.round(Number(roundNumber) || 1));
  if (round <= 12) return 1 + 0.06 * (round - 1);
  return 1 + 0.66 + 0.025 * (round - 12);
};

const getEndlessRoundTimeLimitMs = (roundNumber) =>
  clamp(ENDLESS_BASE_TIME_LIMIT_MS - (Math.max(1, roundNumber) - 1) * ENDLESS_TIME_DECREMENT_MS, ENDLESS_MIN_TIME_LIMIT_MS, ENDLESS_BASE_TIME_LIMIT_MS);

function PracticeMode({ startDiff = 1, onSessionComplete, onStartDiffChange, onOpenProfile }) {
  const [screen, setScreen] = useState("menu"); // menu | playing | summary
  const [sessionVariant, setSessionVariant] = useState("solo"); // solo | endless
  const [rankImpact, setRankImpact] = useState(null);
  const [showMultiplierHelp, setShowMultiplierHelp] = useState(false);

  const isEndless = sessionVariant === "endless";
  const levelConfig = SOLO_DIFFICULTY_SETTINGS[startDiff] || SOLO_DIFFICULTY_SETTINGS[1];
  const levelCap = levelConfig.roundCap;
  const maxMultiplier = levelConfig.maxMultiplier;
  const rpMultiplier = getPracticeDifficultyMultiplier(startDiff);

  const endlessRoundTransform = useCallback(({ roundData, roundNumber }) => {
    const speedFactor = getEndlessSpeedFactor(roundNumber);
    const nextSpawnDelay = clamp(Math.round(roundData.spawnDelay / speedFactor), 55, 650);
    const noiseFactor = 0.85 + 0.55 * (speedFactor - 1);
    const nextNoiseInterval = clamp(Math.round(roundData.noiseInterval / noiseFactor), 320, 3000);
    return {
      ...roundData,
      spawnDelay: nextSpawnDelay,
      noiseInterval: nextNoiseInterval,
    };
  }, []);

  const endlessRoundTimeLimitResolver = useCallback(({ roundNumber }) => getEndlessRoundTimeLimitMs(roundNumber), []);

  const engine = useGameEngine(
    isEndless ? 1 : startDiff,
    null,
    isEndless ? 10 : levelCap,
    isEndless ? 3 : maxMultiplier,
    {
      roundTimeLimitMs: isEndless ? ENDLESS_BASE_TIME_LIMIT_MS : SOLO_ROUND_TIME_LIMIT_MS,
      roundTimeLimitMsResolver: isEndless ? endlessRoundTimeLimitResolver : null,
      roundTransform: isEndless ? endlessRoundTransform : null,
      endRunOnFirstFailure: isEndless,
    }
  );

  const summarySavedRef = useRef(false);
  const sessionDifficultyRef = useRef(startDiff);
  const sessionVariantRef = useRef("solo");
  const sessionEndReasonRef = useRef(null);
  const latestStatsRef = useRef(engine.stats);
  const latestPeakRoundRef = useRef(engine.peakRound);
  const latestRunEndedReasonRef = useRef(engine.runEndedReason);
  const latestScreenRef = useRef(screen);
  const onSessionCompleteRef = useRef(onSessionComplete);

  const start = () => {
    summarySavedRef.current = false;
    setRankImpact(null);
    sessionDifficultyRef.current = startDiff;
    sessionVariantRef.current = sessionVariant;
    sessionEndReasonRef.current = null;
    engine.reset();
    setScreen("playing");
  };

  const practiceSteps = [
    ["01", "Hover on HOLSTER for 0.8s to start", C.text],
    ["02", "Read the signal tweet before clicking", C.text],
    ["03", "Tap TX NOW only when the token matches", C.green],
    ["04", "Watch out for trap tokens with similar names", C.yellow],
    ["05", isEndless ? "Any miss/timeout ends the run" : "Any wrong click counts as a miss", C.red],
    ["06", "Hit streaks increase your score multiplier", C.orange],
  ];

  const levelOptions = [1, 3, 5, 7, 10];

  useEffect(() => {
    latestStatsRef.current = engine.stats;
  }, [engine.stats]);
  useEffect(() => {
    latestPeakRoundRef.current = engine.peakRound;
  }, [engine.peakRound]);
  useEffect(() => {
    latestRunEndedReasonRef.current = engine.runEndedReason;
  }, [engine.runEndedReason]);
  useEffect(() => {
    latestScreenRef.current = screen;
  }, [screen]);
  useEffect(() => {
    onSessionCompleteRef.current = onSessionComplete;
  }, [onSessionComplete]);
  useEffect(() => {
    sessionVariantRef.current = sessionVariant;
  }, [sessionVariant]);

  const persistSessionIfNeeded = () => {
    if (summarySavedRef.current) return;
    const latest = latestStatsRef.current;
    const rounds = (latest?.hits || 0) + (latest?.misses || 0) + (latest?.penalties || 0);
    if (rounds <= 0) return;
    summarySavedRef.current = true;
    const variant = sessionVariantRef.current;
    const endlessPeakRound = Math.max(Number(latestPeakRoundRef.current || 0), Number(latest?.hits || 0));
    const maybePromise = onSessionCompleteRef.current?.({
      ...latest,
      difficultyLevel: sessionDifficultyRef.current,
      variant,
      peakRound: variant === "endless" ? endlessPeakRound : null,
      endedBy: variant === "endless" ? sessionEndReasonRef.current || latestRunEndedReasonRef.current || null : null,
    });
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise
        .then((impact) => {
          if (impact?.mode === "solo" || impact?.mode === "endless") setRankImpact(impact);
        })
        .catch(() => {});
    } else if (maybePromise?.mode === "solo" || maybePromise?.mode === "endless") {
      setRankImpact(maybePromise);
    }
  };

  useEffect(() => {
    if (screen === "menu") {
      summarySavedRef.current = false;
      sessionEndReasonRef.current = null;
      setRankImpact(null);
      return;
    }
    if (screen !== "summary" || summarySavedRef.current) return;
    persistSessionIfNeeded();
  }, [screen, engine.stats, onSessionComplete]);

  useEffect(
    () => () => {
      if (latestScreenRef.current === "playing" || latestScreenRef.current === "summary") persistSessionIfNeeded();
    },
    []
  );

  useEffect(() => {
    if (screen !== "playing") return;
    if (!isEndless && engine.roundNum >= levelCap) {
      sessionEndReasonRef.current = null;
      setScreen("summary");
    }
  }, [screen, isEndless, levelCap, engine.roundNum]);

  useEffect(() => {
    if (screen !== "playing" || !isEndless) return;
    if (!engine.runEndedReason) return;
    sessionEndReasonRef.current = engine.runEndedReason;
    setScreen("summary");
  }, [screen, isEndless, engine.runEndedReason]);

  if (screen === "summary")
    return (
      <SessionSummary
        rankImpact={rankImpact}
        stats={engine.stats}
        onBack={() => {
          engine.reset();
          setScreen("menu");
        }}
        onPlayAgain={start}
        onProfile={onOpenProfile}
      />
    );

  if (screen === "menu")
    return (
      <div className="menu-bg prac-page" style={{ minHeight: "100%", height: "100%", justifyContent: "flex-start", overflowY: "auto", overflowX: "hidden", paddingTop: 28, paddingBottom: 120 }}>
        <div className="grid-bg" />
        <div className="prac-shell" style={{ maxWidth: 1000, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 44, opacity: 0, animation: "slideUp 0.6s ease forwards" }}>
            <div style={{ fontSize: 10, color: C.green, letterSpacing: 5, fontWeight: 800, marginBottom: 10 }}>{isEndless ? "ENDLESS MODE" : "SOLO MODE"}</div>
            <h1 style={{ fontSize: 68, fontWeight: 900, letterSpacing: -4, lineHeight: 0.85, color: C.text }}>
              TRENCHES
              <br />
              <span style={{ color: C.green }}>{isEndless ? "ENDLESS" : "TRAINER"}</span>
            </h1>
            <p style={{ fontSize: 13, color: C.textMuted, marginTop: 18, letterSpacing: 1, maxWidth: 500, margin: "18px auto 0", lineHeight: 1.6 }}>
              {isEndless ? "Uncapped rounds. Escalating speed. One miss ends the run." : "Sharpen your reflexes. Read the signal. Tap fast."}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, width: "100%", marginBottom: 44 }}>
            <div className="glass-card" style={{ padding: 30, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", opacity: 0, animation: "slideUp 0.6s ease 0.1s forwards", height: "100%" }}>
              <div style={{ fontSize: 12, color: C.textDim, letterSpacing: 3, fontWeight: 800, marginBottom: 24 }}>&gt; HOW TO PLAY</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                {practiceSteps.map(([n, t, c], i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ width: 34, height: 34, border: `1px solid ${c}44`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: c, fontWeight: 900, flexShrink: 0 }}>{n}</div>
                    <div style={{ fontSize: 14, color: C.textMuted, fontWeight: 600 }}>{t}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textDim, letterSpacing: 3, textAlign: "center" }}>
                {isEndless ? "Stay alive as long as possible." : "Speed beats hesitation."}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20, opacity: 0, animation: "slideUp 0.6s ease 0.2s forwards", height: "100%" }}>
              <div className="glass-card" style={{ flex: 1, padding: 30, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 22, width: "100%" }}>
                  <button
                    type="button"
                    onClick={() => setSessionVariant("solo")}
                    style={{
                      flex: 1,
                      height: 46,
                      border: `1px solid ${sessionVariant === "solo" ? C.green : C.border}`,
                      background: sessionVariant === "solo" ? `${C.green}10` : "black",
                      color: sessionVariant === "solo" ? C.green : C.textDim,
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: "pointer",
                      borderRadius: 6,
                      letterSpacing: 1.8,
                    }}
                  >
                    SOLO
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionVariant("endless")}
                    style={{
                      flex: 1,
                      height: 46,
                      border: `1px solid ${sessionVariant === "endless" ? C.cyan : C.border}`,
                      background: sessionVariant === "endless" ? `${C.cyan}10` : "black",
                      color: sessionVariant === "endless" ? C.cyan : C.textDim,
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: "pointer",
                      borderRadius: 6,
                      letterSpacing: 1.8,
                    }}
                  >
                    ENDLESS
                  </button>
                </div>

                {!isEndless ? (
                  <>
                    <div style={{ fontSize: 12, color: C.textDim, letterSpacing: 3, fontWeight: 800, marginBottom: 24 }}>&gt; DIFFICULTY</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 28, width: "100%" }}>
                      {levelOptions.map((d) => {
                        const active = startDiff === d;
                        const col = d >= 8 ? C.red : d >= 5 ? C.yellow : C.green;
                        return (
                          <button
                            key={d}
                            onClick={() => onStartDiffChange?.(d)}
                            style={{ flex: 1, height: 52, border: `1px solid ${active ? col : C.border}`, background: active ? `${col}10` : "black", color: active ? col : C.textDim, fontSize: 18, fontWeight: 900, cursor: "pointer", transition: "all 0.2s", borderRadius: 4 }}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 28, justifyContent: "center", width: "100%" }}>
                      <div>
                        <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2 }}>MULTIPLIER</div>
                          <button
                            type="button"
                            onMouseEnter={() => setShowMultiplierHelp(true)}
                            onMouseLeave={() => setShowMultiplierHelp(false)}
                            onFocus={() => setShowMultiplierHelp(true)}
                            onBlur={() => setShowMultiplierHelp(false)}
                            style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${C.border}`, background: C.bgCard, color: C.textMuted, fontSize: 10, fontWeight: 900, cursor: "help", lineHeight: 1, padding: 0 }}
                            aria-label="Show multiplier help"
                          >
                            ?
                          </button>
                          {showMultiplierHelp && (
                            <div style={{ position: "absolute", top: 26, left: "50%", transform: "translateX(-50%)", width: 500, padding: "16px 18px", borderRadius: 12, border: `1px solid ${C.borderLight}`, background: `linear-gradient(145deg,${C.bgCard},${C.bgAlt})`, boxShadow: "0 16px 38px rgba(0,0,0,0.5)", zIndex: 40, textAlign: "left" }}>
                              <div style={{ fontSize: 12, color: C.yellow, letterSpacing: 2.2, fontWeight: 800, marginBottom: 10 }}>SOLO RP MULTIPLIER</div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 6, columnGap: 12, fontFamily: "var(--mono)", fontSize: 13, marginBottom: 10 }}>
                                <span style={{ color: C.textMuted }}>Level 1</span>
                                <span style={{ color: C.text, fontWeight: 800 }}>x0.50</span>
                                <span style={{ color: C.textMuted }}>Level 3</span>
                                <span style={{ color: C.text, fontWeight: 800 }}>x0.90</span>
                                <span style={{ color: C.textMuted }}>Level 5</span>
                                <span style={{ color: C.text, fontWeight: 800 }}>x1.15</span>
                                <span style={{ color: C.textMuted }}>Level 7</span>
                                <span style={{ color: C.text, fontWeight: 800 }}>x1.40</span>
                                <span style={{ color: C.textMuted }}>Level 10</span>
                                <span style={{ color: C.text, fontWeight: 800 }}>x1.70</span>
                              </div>
                              <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.55 }}>
                                Base RP is calculated from reaction speed, accuracy, and consistency.
                                <br />
                                Final RP = Base RP x level multiplier (clamped to -35/+55).
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: C.orange }}>{formatMultiplier(rpMultiplier)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, marginBottom: 4 }}>ROUND_CAP</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: C.cyan }}>{levelCap}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: C.textDim, letterSpacing: 3, fontWeight: 800, marginBottom: 18 }}>&gt; ENDLESS PARAMETERS</div>
                    <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                      {[
                        ["LIFE MODEL", "1 MISS = RUN END", C.red],
                        ["RP PAYOUT", "FINAL ONLY", C.cyan],
                        ["RAMP CURVE", "TWO-PHASE", C.yellow],
                        ["TIME FLOOR", "6.5s MIN", C.orange],
                      ].map(([label, value, col]) => (
                        <div key={label} style={{ border: `1px solid ${C.border}`, background: C.bgAlt, borderRadius: 8, padding: "10px 12px", textAlign: "left" }}>
                          <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1.4, marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 13, color: col, fontWeight: 900, letterSpacing: 0.5 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, textAlign: "left", width: "100%" }}>
                      Rounds are uncapped. Spawn speed ramps up with each round, while timer shrinks toward a floor.
                      <br />
                      RP is awarded once at run end using peak progression, speed, and accuracy.
                    </div>
                  </>
                )}
              </div>

              <button onClick={start} className="btn-primary btn-green" style={{ height: 84, fontSize: 18, letterSpacing: 6, fontWeight: 900, boxShadow: `0 0 50px ${C.green}33`, flexShrink: 0 }}>
                {isEndless ? "ENGAGE ENDLESS" : "START NOW"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <GameView
      engine={engine}
      onExit={() => {
        if (isEndless) {
          sessionEndReasonRef.current = "exit";
        }
        setScreen("summary");
      }}
      timerMode="countdown"
      timerLimitMs={engine.roundTimeLimitMs || (isEndless ? ENDLESS_BASE_TIME_LIMIT_MS : SOLO_ROUND_TIME_LIMIT_MS)}
      timerLabel="TIME LEFT"
      showPnl={isEndless}
    />
  );
}

export default PracticeMode;
