"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

const C = {
  bg: "#060911",
  bgAlt: "#0c1120",
  bgCard: "#111827",
  border: "#1e2d47",
  borderLight: "#2a3f5f",
  green: "#4ade80",
  red: "#f87171",
  orange: "#fb923c",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  textDim: "#475569",
};

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

export default function DashboardPage() {
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [codes, setCodes] = useState([]);
  const [actionBusy, setActionBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newNote, setNewNote] = useState("");

  const generateCode = useCallback(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    for (let i = 0; i < 8; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    setNewCode(`TT${suffix}`);
  }, []);

  const unlockDashboard = useCallback(async () => {
    if (!adminKey.trim()) {
      setMsg("Enter dashboard key first.");
      return;
    }
    setUnlockBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/dashboard", {
        headers: {
          "x-dashboard-key": adminKey.trim(),
        },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Invalid dashboard key.");
      setCodes(body.codes || []);
      setUnlocked(true);
      setMsg("");
    } catch (e) {
      setUnlocked(false);
      setCodes([]);
      setMsg(e?.message || "Invalid dashboard key.");
    } finally {
      setUnlockBusy(false);
    }
  }, [adminKey]);

  const createCode = useCallback(async () => {
    const code = newCode.trim().toUpperCase();
    if (!code) {
      setMsg("Code is required.");
      return;
    }
    if (!adminKey.trim()) {
      setMsg("Enter dashboard key first.");
      return;
    }
    setActionBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-dashboard-key": adminKey.trim(),
        },
        body: JSON.stringify({ code, note: newNote.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Failed to create code.");
      setCodes((prev) => [body.code, ...prev]);
      setNewCode("");
      setNewNote("");
      setMsg(`Created code ${body.code.code}.`);
    } catch (e) {
      setMsg(e?.message || "Failed to create code.");
    } finally {
      setActionBusy(false);
    }
  }, [newCode, newNote, adminKey]);

  const revokeCode = useCallback(
    async (code) => {
      if (!adminKey.trim()) {
        setMsg("Enter dashboard key first.");
        return;
      }
      setActionBusy(true);
      setMsg("");
      try {
        const res = await fetch("/api/dashboard", {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
            "x-dashboard-key": adminKey.trim(),
          },
          body: JSON.stringify({ code }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Failed to revoke code.");
        setCodes((prev) => prev.filter((row) => row.code !== code));
        setMsg(`Revoked code ${code}.`);
      } catch (e) {
        setMsg(e?.message || "Failed to revoke code.");
      } finally {
        setActionBusy(false);
      }
    },
    [adminKey]
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--mono,'Geist Mono',monospace)" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 18px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2.6, marginBottom: 6 }}>DASHBOARD</div>
            <h1 style={{ fontSize: 34, lineHeight: 1.1 }}>Access Codes</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/play" style={btnGhost}>Back to App</Link>
          </div>
        </div>

        {!unlocked ? (
          <div style={{ ...card, maxWidth: 520, margin: "20px auto 0" }}>
            <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 8 }}>DASHBOARD KEY</div>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !unlockBusy) unlockDashboard();
              }}
              placeholder="Enter DASHBOARD_KEY"
              style={input}
            />
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button onClick={unlockDashboard} disabled={unlockBusy} style={btnPrimary}>
                {unlockBusy ? "Unlocking..." : "Unlock Dashboard"}
              </button>
            </div>
            {msg && (
              <div style={{ marginTop: 10, fontSize: 12, color: msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("failed") ? C.red : C.green }}>
                {msg}
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12, gap: 8 }}>
              <button
                onClick={() => {
                  setUnlocked(false);
                  setCodes([]);
                  setMsg("");
                }}
                disabled={actionBusy}
                style={btnGhostButton}
              >
                Lock
              </button>
            </div>

            <div style={card}>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 8 }}>CREATE CODE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: 8 }}>
                <input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="ALPHA001"
                  style={input}
                />
                <button onClick={generateCode} disabled={actionBusy} style={btnGhostButton}>
                  Generate
                </button>
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="optional note"
                  style={input}
                />
                <button onClick={createCode} disabled={actionBusy} style={btnPrimary}>
                  {actionBusy ? "Working..." : "Create"}
                </button>
              </div>
            </div>

            {msg && (
              <div style={{ ...card, color: msg.toLowerCase().includes("failed") || msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("must") ? C.red : C.green }}>
                {msg}
              </div>
            )}

            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2 }}>CODES</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{codes.length} total</div>
              </div>

              {codes.length === 0 ? (
                <div style={{ color: C.textDim, fontSize: 12 }}>No codes loaded.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {codes.map((row) => {
                    const used = !!row.consumed_at;
                    return (
                      <div key={row.code} style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.bgCard, padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.8 }}>{row.code}</div>
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                            {row.note || "—"} • created {fmtDate(row.created_at)}
                          </div>
                          <div style={{ fontSize: 11, color: used ? C.orange : C.green, marginTop: 3 }}>
                            {used ? `Used ${fmtDate(row.consumed_at)}` : "Available"}
                          </div>
                        </div>
                        <div>
                          {!used && (
                            <button onClick={() => revokeCode(row.code)} disabled={actionBusy} style={btnGhostButton}>
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const card = {
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  background: C.bgAlt,
  padding: "14px 14px",
  marginBottom: 12,
};

const input = {
  width: "100%",
  padding: "10px 12px",
  background: C.bgCard,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  fontFamily: "inherit",
  fontSize: 12,
  letterSpacing: 0.7,
};

const btnPrimary = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 8,
  background: `linear-gradient(135deg, ${C.green}, #166534)`,
  color: "#04120a",
  fontWeight: 800,
  letterSpacing: 1,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 11,
};

const btnGhost = {
  display: "inline-block",
  textDecoration: "none",
  padding: "8px 11px",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.textMuted,
  fontSize: 11,
  letterSpacing: 1.2,
};

const btnGhostButton = {
  ...btnGhost,
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
};
