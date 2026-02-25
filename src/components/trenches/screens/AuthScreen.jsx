import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { C } from "../config/constants";

function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const isLogin = mode === "login";

  const toLegacyInternalEmail = (raw) => {
    const clean = (raw || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    return clean ? `${clean}@trenchestrainer.app` : "";
  };
  const isLikelyEmail = (raw) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw || "").trim());
  const isConfirmationEmailFailure = (raw) => /error sending confirmation email/i.test(String(raw || ""));
  const getEmailRedirectTo = () => {
    if (typeof window === "undefined") return undefined;
    return `${window.location.origin}/auth?next=/play/solo`;
  };

  const submit = async () => {
    if (!supabase) {
      setMsg("Supabase is not configured.");
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();
    if (!password) {
      setMsg("Password is required.");
      return;
    }
    if (isLogin && !normalizedUsername) {
      setMsg("Username and password are required.");
      return;
    }
    if (!isLogin && !normalizedEmail) {
      setMsg("Email and password are required.");
      return;
    }
    if (!isLogin && !isLikelyEmail(normalizedEmail)) {
      setMsg("Enter a valid email address.");
      return;
    }
    if (!isLogin && normalizedUsername.length < 3) {
      setMsg("Username must be at least 3 characters.");
      return;
    }
    setBusy(true);
    setMsg(isLogin ? "Signing you in..." : "Creating account...");
    try {
      if (isLogin) {
        if (isLikelyEmail(normalizedUsername)) {
          const { error } = await supabase.auth.signInWithPassword({
            email: normalizedUsername.toLowerCase(),
            password,
          });
          if (error) throw error;
        } else {
          const loginRes = await fetch("/api/auth/username-login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ username: normalizedUsername, password }),
          });
          const loginBody = await loginRes.json().catch(() => ({}));
          if (!loginRes.ok) {
            let fallbackError = null;
            const legacyEmail = toLegacyInternalEmail(normalizedUsername);
            if (legacyEmail) {
              const legacyRes = await supabase.auth.signInWithPassword({
                email: legacyEmail,
                password,
              });
              fallbackError = legacyRes.error || null;
              if (!fallbackError) return;
            }
            throw new Error(loginBody?.error || fallbackError?.message || "Authentication failed.");
          }
          const session = loginBody?.session;
          if (!session?.access_token || !session?.refresh_token) {
            throw new Error("Authentication failed.");
          }
          const { error } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
          if (error) throw error;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: getEmailRedirectTo(),
            data: {
              username: normalizedUsername,
            },
          },
        });
        if (error) throw error;
        if (data?.session) {
          setMsg("Signup successful. Verification email sent.");
        } else {
          setMsg("Signup successful. Verification email sent. Check inbox, then log in.");
        }
      }
    } catch (e) {
      const rawMessage = e?.message || "Authentication failed.";
      const emailNotConfirmed = /email.*confirm|not confirmed/i.test(rawMessage);
      if (isLogin && emailNotConfirmed) {
        setMsg("Email not verified. Go to Sign Up tab, enter your email, and resend verification.");
      } else if (!isLogin && isConfirmationEmailFailure(rawMessage)) {
        setMsg("Signup unavailable: verification email service is down. Try again soon.");
      } else {
        setMsg(rawMessage);
      }
    } finally {
      setBusy(false);
    }
  };

  const resendVerification = async () => {
    if (!supabase) {
      setMsg("Supabase is not configured.");
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!isLikelyEmail(normalizedEmail)) {
      setMsg("Enter a valid email address to resend verification.");
      return;
    }
    setResendBusy(true);
    setMsg("Resending verification email...");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: getEmailRedirectTo(),
        },
      });
      if (error) throw error;
      setMsg("Verification email sent. Check inbox/spam.");
    } catch (e) {
      const rawMessage = e?.message || "Unable to resend verification email.";
      if (isConfirmationEmailFailure(rawMessage)) {
        setMsg("Verification email service is down. Try again soon.");
      } else {
        setMsg(rawMessage);
      }
    } finally {
      setResendBusy(false);
    }
  };

  const successMsg = /success|sent|check your email/i.test(msg);

  return (
    <div className="menu-bg auth-page" style={{ justifyContent: "center", padding: "40px 20px" }}>
      <div className="grid-bg" />

      <div style={{ width: "100%", maxWidth: 1000, position: "relative", zIndex: 1, marginBottom: 14 }}>
        <button onClick={() => router.push("/")} className="btn-ghost" style={{ fontSize: 11, padding: "8px 14px" }}>
          ← Back
        </button>
      </div>
      
      <div className="auth-shell" style={{ 
        maxWidth: 1000, width: "100%", display: "grid", 
        gridTemplateColumns: "1.1fr 0.9fr", gap: 20, 
        position: "relative", zIndex: 1 
      }}>
        
        {/* ── LEFT: SYSTEM BRANDING ── */}
        <div className="glass-card" style={{ padding: 48, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ 
            width: 64, height: 64, background: C.green, borderRadius: 12, 
            display: "flex", alignItems: "center", justifyContent: "center", 
            marginBottom: 32, boxShadow: `0 0 30px ${C.green}40` 
          }}>
            <img src="/logo.png" alt="L" style={{ width: 40, height: "auto", filter: "brightness(0)" }} />
          </div>
          
          <div style={{ fontSize: 14, color: C.green, letterSpacing: 6, fontWeight: 800, marginBottom: 12 }}>
            TRENCHES TRAINER
          </div>
          <p style={{ fontSize: 17, color: C.textMuted, lineHeight: 1.7, marginBottom: 40, maxWidth: 400 }}>
            Enter the simulation. Master the reaction gap. Cut through the noise.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["⚡", "Millisecond reaction tracking"],
              ["⚔", "Real-time 1v1 duels"],
              ["📊", "Detailed performance stats"]
            ].map(([icon, text]) => (
              <div key={text} style={{ 
                display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", 
                background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, borderRadius: 8 
              }}>
                <span style={{ fontSize: 18, color: C.green }}>{icon}</span>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: C.textDim }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: ACCESS TERMINAL ── */}
        <div className="glass-card" style={{ padding: 40, display: "flex", flexDirection: "column", borderTop: `4px solid ${isLogin ? C.green : C.blue}` }}>
          <div style={{ fontSize: 12, color: C.textDim, letterSpacing: 3, fontWeight: 800, marginBottom: 32 }}>
            &gt; {isLogin ? "ACCOUNT ACCESS" : "CREATE ACCOUNT"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 32 }}>
            <button 
              onClick={() => setMode("login")} 
              style={{ 
                padding: "14px", borderRadius: 6, border: `1px solid ${isLogin ? C.green : C.border}`,
                background: isLogin ? `${C.green}10` : "black", color: isLogin ? C.green : C.textDim,
                fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "var(--mono)"
              }}
            >
              LOG IN
            </button>
            <button 
              onClick={() => setMode("signup")} 
              style={{ 
                padding: "14px", borderRadius: 6, border: `1px solid ${!isLogin ? C.blue : C.border}`,
                background: !isLogin ? `${C.blue}10` : "black", color: !isLogin ? C.blue : C.textDim,
                fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "var(--mono)"
              }}
            >
              SIGN UP
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {isLogin ? (
              <div>
                <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, marginBottom: 8 }}>USERNAME</div>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !busy) submit(); }}
                  placeholder="your_username"
                  className="input-field"
                  style={{ height: 52, background: "black", fontSize: 15 }}
                />
              </div>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, marginBottom: 8 }}>EMAIL</div>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !busy) submit(); }}
                    placeholder="name@example.com"
                    className="input-field"
                    style={{ height: 52, background: "black", fontSize: 15 }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, marginBottom: 8 }}>USERNAME</div>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !busy) submit(); }}
                    placeholder="your_username"
                    className="input-field"
                    style={{ height: 52, background: "black", fontSize: 15 }}
                  />
                </div>
              </>
            )}

            <div>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, marginBottom: 8 }}>PASSWORD</div>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                onKeyDown={e => { if (e.key === "Enter" && !busy) submit(); }}
                placeholder="••••••••••••" 
                className="input-field" 
                style={{ height: 52, background: "black", fontSize: 15 }} 
              />
            </div>

          </div>

          {msg && (
            <div style={{ 
              marginTop: 24, padding: "12px 16px", borderRadius: 6, 
              background: `${successMsg ? C.green : C.red}10`,
              border: `1px solid ${successMsg ? C.green : C.red}33`,
              color: successMsg ? C.green : C.red,
              fontSize: 12, fontWeight: 800, textAlign: "center", letterSpacing: 1
            }}>
              &gt; {msg}
            </div>
          )}

          <button 
            onClick={submit} 
            disabled={busy} 
            className={`btn-primary ${isLogin ? "btn-green" : "btn-blue"}`} 
            style={{ marginTop: 28, padding: "18px", fontSize: 16, fontWeight: 900, letterSpacing: 3, opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "PROCESSING..." : isLogin ? "LOG IN" : "CREATE ACCOUNT"}
          </button>
          {!isLogin && (
            <button
              onClick={resendVerification}
              disabled={busy || resendBusy}
              className="btn-ghost"
              style={{
                marginTop: 10,
                padding: "12px",
                fontSize: 12,
                letterSpacing: 2,
                opacity: busy || resendBusy ? 0.7 : 1,
              }}
            >
              {resendBusy ? "RESENDING..." : "RESEND VERIFICATION EMAIL"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default AuthScreen;
