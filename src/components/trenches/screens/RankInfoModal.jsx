import { useEffect } from "react";
import { C } from "../config/constants";
import { DUEL_TIERS } from "../lib/duelRank";
import { PRACTICE_TIERS } from "../lib/practiceRank";

function TierTable({ title, rows, suffix = "RP" }) {
  const ordered = [...rows].reverse();
  return (
    <div className="glass-card" style={{ padding: 14, marginTop: 10 }}>
      <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {ordered.map((row, idx) => {
          const next = ordered[idx + 1];
          const range = next ? `${row.min}-${next.min - 1} ${suffix}` : `${row.min}+ ${suffix}`;
          return (
            <div key={row.tier} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center", padding: "6px 8px", borderRadius: 8, border: `1px solid ${C.border}`, background: "rgba(0,0,0,0.35)" }}>
              <span style={{ color: row.color, fontSize: 12 }}>{row.icon}</span>
              <span style={{ color: row.color, fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>{row.tier}</span>
              <span style={{ color: C.textMuted, fontSize: 10, fontFamily: "var(--mono)" }}>{range}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankInfoModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(92vw, 760px)",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 20,
          border: `1px solid ${C.borderLight}`,
          background: `linear-gradient(160deg, ${C.bgCard}, ${C.bgAlt})`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: C.green, letterSpacing: 3, fontWeight: 800 }}>RANKING GUIDE</div>
            <h2 style={{ fontSize: 26, color: C.text, marginTop: 6, fontWeight: 900, letterSpacing: -0.5 }}>How Ranking Works</h2>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ width: 34, height: 34, padding: 0, fontSize: 16, lineHeight: 1 }} aria-label="Close ranking info">
            ×
          </button>
        </div>

        <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7, marginBottom: 14 }}>
          You have two separate ranks:
          <br />
          <span style={{ color: C.green }}>Solo RP</span> for solo sessions and <span style={{ color: C.blue }}>Duel RP</span> for 1v1 matches.
        </div>

        <div className="glass-card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: C.green, letterSpacing: 2, marginBottom: 6 }}>&gt; SOLO RANK</div>
          <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
            Solo RP is based on three things:
            <br />1. Faster average reaction time
            <br />2. Better accuracy
            <br />3. Better consistency (best vs average)
            <br />
            <br />
            Your new RP is smoothed, so one run won’t swing rank too hard.
          </div>
          <TierTable title="Solo tiers" rows={PRACTICE_TIERS} />
        </div>

        <div className="glass-card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: C.blue, letterSpacing: 2, marginBottom: 6 }}>&gt; DUEL RANK</div>
          <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
            Duel uses an Elo-style system:
            <br />- Beat higher-rated players: bigger gains.
            <br />- Lose to lower-rated players: bigger losses.
            <br />- Every match resolves to a winner and loser (no draws).
          </div>
          <TierTable title="Duel tiers" rows={DUEL_TIERS} />
        </div>

        <div className="glass-card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: C.orange, letterSpacing: 2, marginBottom: 6 }}>&gt; QUICK EXAMPLES</div>
          <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
            Example A: You improve from 80% to 92% accuracy with faster reactions in Solo, your RP should rise.
            <br />
            Example B: You beat a stronger Duel opponent, you usually gain more RP than a normal win.
            <br />
            Example C: You can track progress to next tier from the Solo summary and this Profile page.
          </div>
        </div>

        <div className="glass-card" style={{ padding: 14, marginBottom: 12, border: `1px solid ${C.yellow}33`, background: `linear-gradient(145deg, rgba(251,191,36,0.08), rgba(0,0,0,0.35))` }}>
          <div style={{ fontSize: 10, color: C.yellow, letterSpacing: 2, marginBottom: 6 }}>&gt; RISK NOTICE</div>
          <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
            LLM-powered signals may contain mistakes. Always verify information before acting.
          </div>
        </div>

        <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1.1 }}>
          Peak RP is your all-time highest RP for each mode.
        </div>
      </div>
    </div>
  );
}

export default RankInfoModal;
