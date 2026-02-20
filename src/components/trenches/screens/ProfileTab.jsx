import { C } from "../config/constants";
import { formatHistoryDate } from "../lib/format";
import { getRank } from "../lib/rank";
import { modeToPath, normalizeModeKey } from "../config/constants";
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
  const preferredMode = normalizeModeKey(stats?.preferred_mode);
  const preferredModeLabel = preferredMode === "1v1" ? "1v1 Duel" : preferredMode === "profile" ? "Profile" : "Practice";

  let progressText = "Complete a practice run to get ranked.";
  if (stats.practice_best_time !== null) {
    if (rank.tier === "CHALLENGER") progressText = "Top tier reached.";
    if (rank.tier === "DIAMOND") progressText = `${Math.max(0, Math.ceil((stats.practice_best_time - 1250) / 10) * 10)}ms faster for Challenger.`;
    if (rank.tier === "GOLD") progressText = `${Math.max(0, Math.ceil((stats.practice_best_time - 1800) / 10) * 10)}ms faster for Diamond.`;
    if (rank.tier === "SILVER") progressText = `${Math.max(0, Math.ceil((stats.practice_best_time - 2400) / 10) * 10)}ms faster for Gold.`;
    if (rank.tier === "BRONZE") progressText = `${Math.max(0, Math.ceil((stats.practice_best_time - 3000) / 10) * 10)}ms faster for Silver.`;
  }

  const getOutcomeColor = (row) => {
    if (row.mode === "practice") return C.green;
    if (row.outcome === "win") return C.green;
    if (row.outcome === "loss") return C.red;
    return C.orange;
  };

  return (
    <div className="menu-bg prac-page" style={{ justifyContent: "flex-start", paddingTop: 40, overflowY: "auto" }}>
      <div className="grid-bg" />
      
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1360, width: "100%", margin: "0 auto", padding: "0 20px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))", gap: 20, alignItems: "start" }}>

          {/* Top-left: Identity */}
          <div className="glass-card" style={{ padding: "32px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `2px solid ${rank.color}`, minHeight: 210, gap: 24, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div style={{ 
                width: 80, height: 80, background: "black", border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
                boxShadow: `0 0 30px ${rank.color}22`, borderRadius: 12
              }}>
                {rank.icon}
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 4, marginBottom: 8, fontWeight: 800 }}>USERNAME</div>
                <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -2, color: C.text, lineHeight: 1 }}>{username.toUpperCase()}</h1>
                <div style={{ fontSize: 12, fontWeight: 800, color: rank.color, letterSpacing: 2, marginTop: 8 }}>{rank.tier}</div>
              </div>
            </div>

            <div style={{ minWidth: 260, maxWidth: 340, width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="glass-card" style={{ padding: "12px 14px", background: "rgba(0,0,0,0.5)", borderRadius: 10 }}>
                <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 1.6, marginBottom: 8 }}>&gt; CONTINUE</div>
                <button onClick={() => router.push(modeToPath(preferredMode))} className="btn-primary btn-green" style={{ width: "100%", height: 40, fontSize: 11, letterSpacing: 1.4, padding: 0 }}>
                  Continue {preferredModeLabel}
                </button>
              </div>

              <div className="glass-card" style={{ padding: "12px 14px", background: "rgba(0,0,0,0.5)", borderRadius: 10 }}>
                <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 1.6, marginBottom: 8 }}>&gt; RANK PROGRESS</div>
                <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>{progressText}</div>
              </div>
            </div>
          </div>

          {/* Top-right: KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16, minHeight: 210 }}>
            {[
              { l: "BEST RT", v: bestRT, c: C.cyan },
              { l: "ACCURACY", v: `${practiceAcc}%`, c: C.green },
              { l: "WIN RATE", v: `${duelWinRate}%`, c: C.orange },
              { l: "SESSIONS", v: stats.practice_sessions, c: C.text }
            ].map(s => (
              <div key={s.l} className="glass-card" style={{ padding: "24px 16px", textAlign: "center", background: "rgba(0,0,0,0.4)", minHeight: 210, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 2, marginBottom: 10, fontWeight: 800 }}>{s.l}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Bottom-left: Practice + Duel stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <div className="glass-card" style={{ padding: 24, minHeight: 300 }}>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, fontWeight: 800, marginBottom: 24 }}>&gt; PRACTICE STATS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {[
                  { l: "TOTAL ROUNDS", v: stats.practice_rounds },
                  { l: "TOTAL HITS", v: stats.practice_hits },
                  { l: "TOTAL MISSES", v: stats.practice_misses },
                  { l: "BEST STREAK", v: stats.practice_best_streak }
                ].map(item => (
                  <div key={item.l}>
                    <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 1, marginBottom: 6 }}>{item.l}</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{item.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ padding: 24, minHeight: 300 }}>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, fontWeight: 800, marginBottom: 24 }}>&gt; DUEL STATS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {[
                  { l: "MATCHES", v: stats.duel_matches },
                  { l: "WINS", v: stats.duel_wins },
                  { l: "AVG SCORE", v: avgDuelFor },
                  { l: "SCORE DIFF", v: stats.duel_score_for - stats.duel_score_against }
                ].map(item => (
                  <div key={item.l}>
                    <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 1, marginBottom: 6 }}>{item.l}</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{item.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom-right: Activity */}
          <div className="glass-card" style={{ padding: 0, overflow: "hidden", minHeight: 300 }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: 2 }}>&gt; RECENT ACTIVITY</span>
              <span style={{ fontSize: 9, color: C.textGhost }}>Auto sync enabled</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {history.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: C.textGhost, fontSize: 11 }}>No activity yet.</div>
              ) : history.slice(0, 10).map((row) => {
                const isPractice = row.mode === "practice";
                const rt = typeof row.best_time === "number" ? `${(row.best_time / 1000).toFixed(3)}s` : "N/A";
                return (
                  <div key={row.id} style={{ 
                    display: "grid", gridTemplateColumns: "160px 120px 1fr", 
                    alignItems: "center", padding: "14px 24px", borderBottom: `1px solid ${C.border}`,
                    background: "black"
                  }}>
                    <div style={{ fontSize: 9, color: C.textDim, fontFamily: "monospace" }}>[{formatHistoryDate(row.created_at || "").toUpperCase()}]</div>
                    <div style={{ fontSize: 10, fontWeight: 900, color: getOutcomeColor(row), letterSpacing: 1.5 }}>
                      {isPractice ? "Practice" : "Duel"}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>
                      {isPractice ? `Reaction: ${rt} • Accuracy: ${row.accuracy_pct}%` : `Score: ${row.score} - ${row.opponent_score}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileTab;
