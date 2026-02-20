import { C } from "../config/constants";
import { formatHistoryDate } from "../lib/format";
import { getRank } from "../lib/rank";

function ProfileTab({ session, stats, history, loading, msg, onRefresh }) {
  const rounds = stats.practice_rounds;
  const practiceAcc = rounds > 0 ? Math.round((stats.practice_hits / rounds) * 100) : 0;
  const duelWinRate = stats.duel_matches > 0 ? Math.round((stats.duel_wins / stats.duel_matches) * 100) : 0;
  const avgDuelFor = stats.duel_matches > 0 ? (stats.duel_score_for / stats.duel_matches).toFixed(1) : "0.0";
  const username = session?.user?.user_metadata?.username || session?.user?.email?.split("@")[0] || "anonymous";
  const bestRT = stats.practice_best_time !== null ? `${(stats.practice_best_time / 1000).toFixed(3)}s` : "—";
  const rank = getRank(stats.practice_best_time);

  const getOutcomeColor = (row) => {
    if (row.mode === "practice") return C.green;
    if (row.outcome === "win") return C.green;
    if (row.outcome === "loss") return C.red;
    return C.orange;
  };

  return (
    <div className="menu-bg prac-page" style={{ justifyContent: "flex-start", paddingTop: 40, overflowY: "auto" }}>
      <div className="grid-bg" />
      
      <div className="prac-shell" style={{ maxWidth: 1000, width: "100%", margin: "0 auto", padding: "0 20px" }}>
        
        {/* ── HEADER BLOCK ── */}
        <div className="glass-card" style={{ padding: "32px 40px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `2px solid ${rank.color}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div style={{ 
              width: 80, height: 80, background: "black", border: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
              boxShadow: `0 0 30px ${rank.color}22`, borderRadius: 12
            }}>
              {rank.icon}
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 4, marginBottom: 8, fontWeight: 800 }}>AGENT_ID</div>
              <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -2, color: C.text, lineHeight: 1 }}>{username.toUpperCase()}</h1>
              <div style={{ fontSize: 12, fontWeight: 800, color: rank.color, letterSpacing: 2, marginTop: 8 }}>{rank.tier}</div>
            </div>
          </div>
          <button onClick={onRefresh} className="btn-ghost" style={{ padding: "12px 24px", fontSize: 10, fontWeight: 800, letterSpacing: 1.5 }}>REFRESH_INTEL</button>
        </div>

        {/* ── KEY PERFORMANCE INDICATORS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { l: "BEST_RT", v: bestRT, c: C.cyan },
            { l: "ACCURACY", v: `${practiceAcc}%`, c: C.green },
            { l: "WIN_RATE", v: `${duelWinRate}%`, c: C.orange },
            { l: "SESSIONS", v: stats.practice_sessions, c: C.text }
          ].map(s => (
            <div key={s.l} className="glass-card" style={{ padding: "24px 16px", textAlign: "center", background: "rgba(0,0,0,0.4)" }}>
              <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 2, marginBottom: 10, fontWeight: 800 }}>{s.l}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* ── DATA MATRICES ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, fontWeight: 800, marginBottom: 24 }}>&gt; PRACTICE_METRICS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[
                { l: "TOTAL_ROUNDS", v: stats.practice_rounds },
                { l: "TOTAL_HITS", v: stats.practice_hits },
                { l: "TOTAL_MISSES", v: stats.practice_misses },
                { l: "MAX_STREAK", v: stats.practice_best_streak }
              ].map(item => (
                <div key={item.l}>
                  <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 1, marginBottom: 6 }}>{item.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, fontWeight: 800, marginBottom: 24 }}>&gt; ARENA_METRICS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[
                { l: "ENGAGEMENTS", v: stats.duel_matches },
                { l: "CONFIRMED_WINS", v: stats.duel_wins },
                { l: "AVG_SCORE", v: avgDuelFor },
                { l: "SCORE_DIFF", v: stats.duel_score_for - stats.duel_score_against }
              ].map(item => (
                <div key={item.l}>
                  <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 1, marginBottom: 6 }}>{item.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ACTIVITY LOG ── */}
        <div className="glass-card" style={{ padding: 0, overflow: "hidden", marginBottom: 60 }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: 2 }}>&gt; RECENT_ACTIVITY_LOG</span>
            <span style={{ fontSize: 9, color: C.textGhost }}>PAGE_01 // AUTO_SYNC_ENABLED</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {history.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: C.textGhost, fontSize: 11 }}>NO_LOGS_FOUND_IN_REGISTRY</div>
            ) : history.slice(0, 10).map((row) => {
              const isPractice = row.mode === "practice";
              const rt = typeof row.best_time === "number" ? `${(row.best_time / 1000).toFixed(3)}s` : "N/A";
              return (
                <div key={row.id} style={{ 
                  display: "grid", gridTemplateColumns: "160px 120px 1fr auto", 
                  alignItems: "center", padding: "14px 24px", borderBottom: `1px solid ${C.border}`,
                  background: "black"
                }}>
                  <div style={{ fontSize: 9, color: C.textDim, fontFamily: "monospace" }}>[{formatHistoryDate(row.created_at || "").toUpperCase()}]</div>
                  <div style={{ fontSize: 10, fontWeight: 900, color: getOutcomeColor(row), letterSpacing: 1.5 }}>
                    {isPractice ? "PRACTICE" : "ARENA"}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    {isPractice ? `RT: ${rt} // ACC: ${row.accuracy_pct}%` : `SCORE: ${row.score} - ${row.opponent_score}`}
                  </div>
                  <div style={{ fontSize: 10, color: C.textGhost }}>// OK</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

export default ProfileTab;
