import { C, modeToPath, normalizeModeKey } from "../config/constants";
import { formatHistoryDate } from "../lib/format";
import { getRank } from "../lib/rank";
import { useRouter } from "next/navigation";

function ProfileTab({ session, stats, history, loading, msg, onRefresh }) {
  const router = useRouter();
  const rounds = stats.practice_rounds;
  const practiceAcc = rounds > 0 ? Math.round((stats.practice_hits / rounds) * 100) : 0;
  const duelWinRate = stats.duel_matches > 0 ? Math.round((stats.duel_wins / stats.duel_matches) * 100) : 0;
  const avgDuelFor = stats.duel_matches > 0 ? (stats.duel_score_for / stats.duel_matches).toFixed(1) : "0.0";
  const username = session?.user?.user_metadata?.username || session?.user?.email?.split("@")[0] || "anonymous";
  const bestRT = stats.practice_best_time !== null ? `${(stats.practice_best_time / 1000).toFixed(3)}s` : "—";
  const rank = getRank(stats.practice_best_time);
  const isHistoryLoading = loading && history.length === 0;
  const preferredMode = normalizeModeKey(stats.preferred_mode);
  const preferredModeLabel = preferredMode === "1v1" ? "1V1 DUEL" : preferredMode === "profile" ? "PROFILE" : "PRACTICE";
  const latest = history[0] || null;
  const latestWhen = latest?.created_at ? formatHistoryDate(latest.created_at || "").toUpperCase() : "NO_RUNS_YET";
  const latestSummary = !latest
    ? "NO_SESSIONS_LOGGED"
    : latest.mode === "practice"
    ? `PRACTICE // ${(typeof latest.best_time === "number" ? `${(latest.best_time / 1000).toFixed(3)}s` : "N/A")} // ${latest.accuracy_pct ?? 0}% ACC`
    : `1V1 // ${latest.outcome?.toUpperCase() || "UNKNOWN"} // ${latest.score ?? 0}-${latest.opponent_score ?? 0}`;
  const latestColor = !latest ? C.textDim : latest.mode === "practice" ? C.cyan : latest.outcome === "win" ? C.green : latest.outcome === "loss" ? C.red : C.orange;
  const duelRecord = `${stats.duel_wins}-${stats.duel_losses}${stats.duel_draws ? `-${stats.duel_draws}` : ""}`;

  const getOutcomeColor = (row) => {
    if (row.mode === "practice") return C.green;
    if (row.outcome === "win") return C.green;
    if (row.outcome === "loss") return C.red;
    return C.orange;
  };

  return (
    <div className="menu-bg prac-page" style={{ justifyContent: "flex-start", paddingTop: 40, overflowY: "auto" }}>
      <div className="grid-bg" />
      
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, width: "100%", padding: "0 20px", display: "flex", flexDirection: "column" }}>
        
        {/* ── HEADER: IDENTITY ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 48, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
            <div style={{ 
              width: 64, height: 64, background: "black", border: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
              boxShadow: `0 0 30px ${rank.color}15`, borderRadius: 4, position: "relative"
            }}>
              {rank.icon}
              <div style={{ position: "absolute", bottom: -2, right: -2, width: 12, height: 12, background: C.green, borderRadius: "50%", border: "2px solid black" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, color: C.text }}>{username.toUpperCase()}</h1>
              <div style={{ fontSize: 10, color: rank.color, letterSpacing: 3, fontWeight: 800 }}>RANK // {rank.tier}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, flex: 1, minWidth: 320 }}>
            <div className="glass-card" style={{ padding: 16, minHeight: 118 }}>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, fontWeight: 800, marginBottom: 12 }}>&gt; QUICK_STATS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                  <span style={{ color: C.textMuted }}>BEST_RT</span>
                  <span style={{ color: C.cyan, fontWeight: 800 }}>{bestRT}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                  <span style={{ color: C.textMuted }}>PRACTICE_ACC</span>
                  <span style={{ color: C.green, fontWeight: 800 }}>{practiceAcc}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                  <span style={{ color: C.textMuted }}>1V1_W-L(-D)</span>
                  <span style={{ color: C.orange, fontWeight: 800 }}>{duelRecord}</span>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: 16, minHeight: 118, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, fontWeight: 800, marginBottom: 10 }}>&gt; CONTINUE</div>
              <div style={{ fontSize: 11, color: C.text, fontWeight: 800, marginBottom: 6 }}>CONTINUE: {preferredModeLabel}</div>
              <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 14 }}>JUMP_BACK_TO_YOUR_DEFAULT_MODE</div>
              <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                <button onClick={() => router.push(modeToPath(preferredMode))} className="btn-primary btn-green" style={{ height: 34, fontSize: 9, letterSpacing: 1.5, padding: "0 12px" }}>CONTINUE</button>
                <button onClick={() => router.push(modeToPath("practice"))} className="btn-ghost" style={{ height: 34, fontSize: 9, letterSpacing: 1.2, padding: "0 10px" }}>CHOOSE_MODE</button>
              </div>
            </div>

            <div className="glass-card" style={{ padding: 16, minHeight: 118 }}>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, fontWeight: 800, marginBottom: 10 }}>&gt; RECENT_ACTIVITY</div>
              <div style={{ fontSize: 9, color: C.textGhost, marginBottom: 6 }}>{latestWhen}</div>
              <div style={{ fontSize: 10, color: latestColor, fontWeight: 800, lineHeight: 1.45 }}>{latestSummary}</div>
            </div>
          </div>
        </div>

        {/* ── PRIMARY KPI BAR (Full Width) ── */}
        <div style={{ 
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, 
          background: C.border, border: `1px solid ${C.border}`, borderRadius: 8, 
          overflow: "hidden", marginBottom: 48 
        }}>
          {[
            { l: "BEST_REACTION", v: bestRT, c: C.cyan },
            { l: "AVG_ACCURACY", v: `${practiceAcc}%`, c: C.green },
            { l: "DUEL_WINRATE", v: `${duelWinRate}%`, c: C.orange },
            { l: "TOTAL_SESSIONS", v: stats.practice_sessions, c: C.text }
          ].map(s => (
            <div key={s.l} style={{ background: "black", padding: "32px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 2, marginBottom: 12 }}>{s.l}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* ── ANALYTICS STACK (Unified Grid) ── */}
        <div className="glass-card" style={{ padding: 0, marginBottom: 48, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: 2 }}>&gt; DETAILED_PERFORMANCE_METRICS</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: 24, gap: 40 }}>
            {[
              { l: "PRACTICE_ROUNDS", v: stats.practice_rounds },
              { l: "PRACTICE_HITS", v: stats.practice_hits },
              { l: "PRACTICE_MISSES", v: stats.practice_misses },
              { l: "MAX_STREAK", v: stats.practice_best_streak },
              { l: "DUEL_MATCHES", v: stats.duel_matches },
              { l: "DUEL_WINS", v: stats.duel_wins },
              { l: "AVG_DUEL_SCORE", v: avgDuelFor },
              { l: "SCORE_DIFF", v: stats.duel_score_for - stats.duel_score_against }
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 1, marginBottom: 8 }}>{s.l}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ACTIVITY LOG (Full Width) ── */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 3, fontWeight: 800 }}>&gt; RECENT_ACTIVITY_STREAM</div>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {isHistoryLoading ? (
              <div style={{ padding: "60px", textAlign: "center", background: "rgba(255,255,255,0.01)", border: `1px dashed ${C.border}`, borderRadius: 8, color: C.textGhost, fontSize: 11 }}>
                LOADING_MATCH_HISTORY...
              </div>
            ) : history.length === 0 ? (
              <div style={{ padding: "60px", textAlign: "center", background: "rgba(255,255,255,0.01)", border: `1px dashed ${C.border}`, borderRadius: 8, color: C.textGhost, fontSize: 11 }}>
                NO_HISTORICAL_DATA_FOUND_IN_STREAM
              </div>
            ) : history.slice(0, 12).map((row) => {
              const isPractice = row.mode === "practice";
              const rt = typeof row.best_time === "number" ? `${(row.best_time / 1000).toFixed(3)}s` : "N/A";
              const outcomeLabel = (row.outcome || "unknown").toUpperCase();
              return (
                <div key={row.id} style={{ 
                  display: "grid", gridTemplateColumns: "160px 120px 1fr auto", 
                  alignItems: "center", padding: "14px 24px", background: "black",
                  border: `1px solid ${C.border}`, gap: 24
                }}>
                  <div style={{ fontSize: 9, color: C.textDim, fontFamily: "monospace" }}>[{formatHistoryDate(row.created_at || "").toUpperCase()}]</div>
                  <div style={{ fontSize: 10, fontWeight: 900, color: getOutcomeColor(row), letterSpacing: 1.5 }}>
                    {isPractice ? "PRACTICE_RUN" : `ARENA_${outcomeLabel}`}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    {isPractice
                      ? `REACTION: ${rt} // ACCURACY: ${row.accuracy_pct ?? 0}%`
                      : `FINAL_SCORE: ${row.score ?? 0} - ${row.opponent_score ?? 0}`}
                  </div>
                  <div style={{ fontSize: 10, color: C.textGhost, letterSpacing: 1 }}>STATUS_OK</div>
                </div>
              );
            })}
          </div>
          {msg ? (
            <div style={{ marginTop: 14, fontSize: 10, color: C.red, letterSpacing: 1.2 }}>
              {msg}
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}

export default ProfileTab;
