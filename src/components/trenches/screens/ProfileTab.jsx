import { useState } from "react";
import { C } from "../config/constants";
import { formatHistoryDate } from "../lib/format";
import { getDuelNextTier, getDuelTier } from "../lib/duelRank";
import { getPracticeNextTier, getPracticeTier } from "../lib/practiceRank";
import RankInfoModal from "./RankInfoModal";

function ProfileTab({ session, stats, history }) {
  const [historyFilter, setHistoryFilter] = useState("all");
  const [showRankInfo, setShowRankInfo] = useState(false);
  const isSoloMode = (mode) => mode === "solo" || mode === "practice";
  const duelWinRate = stats.duel_matches > 0 ? Math.round((stats.duel_wins / stats.duel_matches) * 100) : 0;
  const avgDuelFor = stats.duel_matches > 0 ? (stats.duel_score_for / stats.duel_matches).toFixed(1) : "0.0";
  const username = session?.user?.user_metadata?.username || session?.user?.email?.split("@")[0] || "anonymous";
  const practiceRank = getPracticeTier(stats.practice_rating);
  const duelRank = getDuelTier(stats.duel_rating);
  const practiceProgress = getPracticeNextTier(stats.practice_rating);
  const duelProgress = getDuelNextTier(stats.duel_rating);

  const getOutcomeColor = (row) => {
    if (isSoloMode(row.mode)) return C.green;
    if (row.outcome === "win") return C.green;
    if (row.outcome === "loss") return C.red;
    return C.orange;
  };
  const getDeltaColor = (delta) => {
    if (!Number.isFinite(delta) || delta === 0) return C.textDim;
    return delta > 0 ? C.green : C.red;
  };
  const formatDelta = (delta) => {
    if (!Number.isFinite(delta) || delta === 0) return "RP ±0";
    return delta > 0 ? `RP +${delta}` : `RP ${delta}`;
  };
  const filteredHistory = history.filter((row) => {
    if (historyFilter === "solo") return isSoloMode(row.mode);
    if (historyFilter === "duel") return row.mode === "1v1";
    return true;
  });

  return (
    <div className="menu-bg prac-page" style={{ justifyContent: "flex-start", paddingTop: 40, overflowY: "auto" }}>
      <div className="grid-bg" />
      
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1360, width: "100%", margin: "0 auto", padding: "0 20px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))", gap: 20, alignItems: "start" }}>

          {/* Top-left: Identity */}
          <div className="glass-card" style={{ padding: "28px 30px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", alignItems: "stretch", borderBottom: `2px solid ${practiceRank.color}`, minHeight: 210, gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24, minWidth: 0 }}>
              <div style={{ 
                width: 80, height: 80, background: "black", border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
                boxShadow: `0 0 30px ${practiceRank.color}22`, borderRadius: 12
              }}>
                {practiceRank.icon}
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 4, marginBottom: 8, fontWeight: 800 }}>USERNAME</div>
                <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -2, color: C.text, lineHeight: 1 }}>{username.toUpperCase()}</h1>
                <div style={{ fontSize: 11, fontWeight: 800, color: practiceRank.color, letterSpacing: 2, marginTop: 8 }}>
                  SOLO {practiceRank.tier} • {stats.practice_rating} RP
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: duelRank.color, letterSpacing: 2, marginTop: 4 }}>
                  DUEL {duelRank.tier} • {stats.duel_rating} RP
                </div>
              </div>
            </div>

            <div style={{ width: "100%" }}>
              <div className="glass-card" style={{ padding: "24px", background: "rgba(0,0,0,0.5)", borderRadius: 10, minHeight: 164, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1.6, marginBottom: 20 }}>&gt; RANK_PROGRESS</div>
                
                {/* Solo Progress */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 800 }}>SOLO_TIER_PROGRESS</div>
                    <div style={{ fontSize: 10, color: practiceRank.color, fontWeight: 800 }}>{practiceProgress.next ? `${practiceProgress.pointsToNext} RP TO ${practiceProgress.next.tier}` : "MAX_TIER_REACHED"}</div>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden", border: `1px solid ${C.border}` }}>
                    <div style={{ width: `${practiceProgress.progressPercent}%`, height: "100%", background: practiceRank.color, boxShadow: `0 0 10px ${practiceRank.color}`, transition: "width 1s ease-out" }} />
                  </div>
                </div>

                {/* Duel Progress */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 800 }}>DUEL_TIER_PROGRESS</div>
                    <div style={{ fontSize: 10, color: duelRank.color, fontWeight: 800 }}>{duelProgress.next ? `${duelProgress.pointsToNext} RP TO ${duelProgress.next.tier}` : "MAX_TIER_REACHED"}</div>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden", border: `1px solid ${C.border}` }}>
                    <div style={{ width: `${duelProgress.progressPercent}%`, height: "100%", background: duelRank.color, boxShadow: `0 0 10px ${duelRank.color}`, transition: "width 1s ease-out" }} />
                  </div>
                </div>

                <button onClick={() => setShowRankInfo(true)} className="btn-ghost" style={{ fontSize: 9, letterSpacing: 1.2, alignSelf: "flex-start", padding: "6px 12px" }}>
                  HOW RANKING WORKS
                </button>
              </div>
            </div>
          </div>

          {/* Top-right: KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16, minHeight: 210 }}>
            {[
              { l: "SOLO RP", v: stats.practice_rating, c: practiceRank.color },
              { l: "DUEL RP", v: stats.duel_rating, c: duelRank.color },
              { l: "WIN RATE", v: `${duelWinRate}%`, c: C.orange },
              { l: "SESSIONS", v: stats.practice_sessions, c: C.textMuted }
            ].map(s => (
              <div key={s.l} className="glass-card" style={{ padding: "24px 16px", textAlign: "center", background: "rgba(0,0,0,0.4)", minHeight: 210, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 8, color: C.textDim, letterSpacing: 2, marginBottom: 10, fontWeight: 800 }}>{s.l}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Bottom-left: Solo + Duel stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <div className="glass-card" style={{ padding: 24, minHeight: 300 }}>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, fontWeight: 800, marginBottom: 24 }}>&gt; SOLO STATS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {[
                  { l: "TOTAL ROUNDS", v: stats.practice_rounds },
                  { l: "TOTAL HITS", v: stats.practice_hits },
                  { l: "TOTAL MISSES", v: stats.practice_misses },
                  { l: "BEST STREAK", v: stats.practice_best_streak },
                  { l: "RATING", v: stats.practice_rating },
                  { l: "PEAK RP", v: stats.practice_peak_rating }
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
                  { l: "SCORE DIFF", v: stats.duel_score_for - stats.duel_score_against },
                  { l: "RATING", v: stats.duel_rating },
                  { l: "PEAK RP", v: stats.duel_peak_rating }
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
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { key: "all", label: "All" },
                  { key: "solo", label: "Solo" },
                  { key: "duel", label: "Duel" },
                ].map((opt) => {
                  const active = historyFilter === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setHistoryFilter(opt.key)}
                      className="btn-ghost"
                      style={{
                        height: 28,
                        padding: "0 10px",
                        fontSize: 9,
                        letterSpacing: 1.1,
                        color: active ? C.green : C.textDim,
                        borderColor: active ? C.green : C.border,
                        background: active ? `${C.green}10` : "transparent",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredHistory.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: C.textGhost, fontSize: 11 }}>No activity yet.</div>
              ) : filteredHistory.slice(0, 10).map((row) => {
                const isPractice = isSoloMode(row.mode);
                const rt = typeof row.best_time === "number" ? `${(row.best_time / 1000).toFixed(3)}s` : "N/A";
                const delta = Number(row.rating_delta);
                return (
                  <div key={row.id} style={{ 
                    display: "grid", gridTemplateColumns: "160px 120px 1fr auto", 
                    alignItems: "center", padding: "14px 24px", borderBottom: `1px solid ${C.border}`,
                    background: "black"
                  }}>
                    <div style={{ fontSize: 9, color: C.textDim, fontFamily: "monospace" }}>[{formatHistoryDate(row.created_at || "").toUpperCase()}]</div>
                    <div style={{ fontSize: 10, fontWeight: 900, color: getOutcomeColor(row), letterSpacing: 1.5 }}>
                      {isPractice ? "Solo" : "Duel"}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>
                      {isPractice ? `Reaction: ${rt} • Accuracy: ${row.accuracy_pct}%` : `Score: ${row.score} - ${row.opponent_score}`}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: getDeltaColor(delta), fontFamily: "monospace", paddingLeft: 16 }}>
                      {formatDelta(delta)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <RankInfoModal open={showRankInfo} onClose={() => setShowRankInfo(false)} />
    </div>
  );
}

export default ProfileTab;
