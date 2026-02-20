import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { C } from "../config/constants";
function AuthScreen(){
  const[mode,setMode]=useState("login");
  const[username,setUsername]=useState("");
  const[password,setPassword]=useState("");
  const[accessCode,setAccessCode]=useState("");
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState("");
  const isLogin=mode==="login";

  const toInternalEmail=(raw)=>{
    const clean=(raw||"").trim().toLowerCase().replace(/[^a-z0-9_]/g,"");
    return clean?`${clean}@trenchestrainer.app`:"";
  };

  const submit=async()=>{
    if(!supabase){setMsg("Supabase is not configured in .env.local.");return;}
    const email=toInternalEmail(username);
    if(!email||!password){setMsg("Username and password are required.");return;}
    if(username.trim().length<3){setMsg("Username must be at least 3 characters.");return;}
    const normalizedAccessCode=accessCode.trim().toUpperCase();
    if(!isLogin&&!normalizedAccessCode){setMsg("Access code is required to create an account.");return;}
    setBusy(true);setMsg("");
    try{
      if(isLogin){
        const{error}=await supabase.auth.signInWithPassword({email,password});
        if(error)throw error;
      }else{
        const { data: codeAvailable, error: checkError } = await supabase.rpc("check_signup_access_code", { input_code: normalizedAccessCode });
        if(checkError)throw checkError;
        if(!codeAvailable)throw new Error("Invalid or already used access code.");
        const{error}=await supabase.auth.signUp({
          email,
          password,
          options:{
            data:{
              username:username.trim(),
              access_code:normalizedAccessCode,
            },
          },
        });
        if(error)throw error;
        setMsg("Account created.");
        setAccessCode("");
      }
    }catch(e){
      const message=e?.message||"Auth request failed.";
      if(message==="Database error saving new user"){
        setMsg("Signup failed. Access code may be invalid/used, or auth trigger is missing on this Supabase project.");
      }else{
        setMsg(message);
      }
    }
    finally{setBusy(false);}
  };

  return(
    <div className="menu-bg auth-page">
      <div className="grid-bg"/>
      <div className="menu-glow-orb green"/>
      <div className="auth-shell">
        <div className="auth-brand-card">
          <div className="auth-lock"><img src="/logo.png" alt="Trenches logo" style={{height:56,width:"auto",display:"block"}}/></div>
          <h1 className="title-text auth-title" style={{color:C.greenBright}}>TRENCHES TRAINER</h1>
          <div className="auth-subtitle">Sharpen your reaction time. Compete head-to-head. Climb the ranks.</div>
          <div className="auth-points">
            <div className="auth-point"><span>⚡</span>Millisecond-precise reaction training</div>
            <div className="auth-point"><span>📊</span>Track sessions, streaks, and accuracy</div>
            <div className="auth-point"><span>⚔️</span>1v1 duels against real opponents</div>
          </div>
        </div>
        <div className="auth-form-card">
          <div className="auth-form-head">
            <div style={{fontSize:11,color:C.textDim,letterSpacing:3,fontWeight:700}}>ACCOUNT ACCESS</div>
            <div style={{fontSize:9,color:C.textGhost,letterSpacing:1.5}}>{isLogin?"PASSWORD LOGIN":"SIGNUP CODE REQUIRED"}</div>
          </div>
          <div className="auth-mode-switch">
            <button onClick={()=>setMode("login")} className="auth-mode-btn" style={{background:isLogin?`linear-gradient(135deg,${C.green},${C.greenDim})`:"transparent",color:isLogin?C.bg:C.textDim,borderColor:isLogin?"transparent":C.border}}>Login</button>
            <button onClick={()=>setMode("signup")} className="auth-mode-btn" style={{background:!isLogin?`linear-gradient(135deg,${C.blue},${C.cyan})`:"transparent",color:!isLogin?C.bg:C.textDim,borderColor:!isLogin?"transparent":C.border}}>Sign Up</button>
          </div>
          <div style={{fontSize:8,color:C.textDim,letterSpacing:2.5,marginBottom:6}}>USERNAME</div>
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="yourname" className="input-field auth-input" style={{marginBottom:8}}/>
          <div style={{fontSize:8,color:C.textDim,letterSpacing:2.5,marginTop:12,marginBottom:6}}>PASSWORD</div>
          <input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!busy)submit();}} type="password" placeholder="••••••••" className="input-field auth-input" style={{marginBottom:10}}/>
          {!isLogin&&<>
            <div style={{fontSize:8,color:C.textDim,letterSpacing:2.5,marginTop:2,marginBottom:6}}>ACCESS CODE</div>
            <input value={accessCode} onChange={e=>setAccessCode(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"&&!busy)submit();}} placeholder="ALPHA001" className="input-field auth-input" style={{marginBottom:10,textTransform:"uppercase"}}/>
          </>}
          <div style={{fontSize:9,color:C.textGhost,marginBottom:12}}>Use letters, numbers, and underscore in username.</div>
          {msg&&<div className="auth-msg" style={{color:msg.toLowerCase().includes("failed")||msg.toLowerCase().includes("required")||msg.toLowerCase().includes("invalid")||msg.toLowerCase().includes("already used")?C.red:C.green,borderColor:msg.toLowerCase().includes("failed")||msg.toLowerCase().includes("required")||msg.toLowerCase().includes("invalid")||msg.toLowerCase().includes("already used")?`${C.red}35`:`${C.green}35`,background:msg.toLowerCase().includes("failed")||msg.toLowerCase().includes("required")||msg.toLowerCase().includes("invalid")||msg.toLowerCase().includes("already used")?`${C.red}10`:`${C.green}10`}}>{msg}</div>}
          <button onClick={submit} disabled={busy} className={`btn-primary ${isLogin?"btn-green":"btn-blue"}`} style={{opacity:busy?0.7:1,cursor:busy?"default":"pointer",marginTop:msg?0:4}}>
            {busy?"Submitting...":isLogin?"Login":"Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
