"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import {
  C,
  EMPTY_PROFILE_STATS,
  HISTORY_SELECT,
  PROFILE_SELECT,
  modeToPath,
  normalizeModeKey,
  normalizeProfileStats,
  pathToMode,
} from "./config/constants";
import { getRank } from "./lib/rank";
import AuthScreen from "./screens/AuthScreen";
import ModePickerScreen from "./screens/ModePickerScreen";
import OneVOneMode from "./screens/OneVOneMode";
import PracticeMode from "./screens/PracticeMode";
import ProfileTab from "./screens/ProfileTab";
import { CSS } from "./styles/cssText";

export default function App({initialDuelCode=""}){
  const router=useRouter();
  const pathname=usePathname();
  const tab=pathToMode(pathname||"");
  const duelCode=(initialDuelCode||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
  const[entryScreen,setEntryScreen]=useState("loading"); // loading | mode-picker | app
  const[startDiff,setStartDiff]=useState(1);
  const[session,setSession]=useState(null);
  const[authReady,setAuthReady]=useState(false);
  const[profileStats,setProfileStats]=useState(EMPTY_PROFILE_STATS);
  const[matchHistory,setMatchHistory]=useState([]);
  const[profileLoading,setProfileLoading]=useState(false);
  const[profileMsg,setProfileMsg]=useState("");

  useEffect(()=>{
    let active=true;
    if(!supabase){setAuthReady(true);return;}
    supabase.auth.getSession().then(({data})=>{
      if(active){
        const nextSession=data?.session||null;
        setSession(nextSession);
        if(!nextSession){
          setProfileStats(EMPTY_PROFILE_STATS);
          setMatchHistory([]);
          setEntryScreen("loading");
        }
        setAuthReady(true);
      }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession||null);
      if(!nextSession){
        setProfileStats(EMPTY_PROFILE_STATS);
        setMatchHistory([]);
        setEntryScreen("loading");
      }
    });
    return()=>{active=false;authListener?.subscription?.unsubscribe();};
  },[]);

  const loadProfileStats=useCallback(async({resolveEntry=false}={})=>{
    if(!supabase||!session?.user?.id)return;
    setProfileLoading(true);
    setProfileMsg("");
    const [{ data, error }, { data: historyData, error: historyError }] = await Promise.all([
      supabase
        .from("player_profiles")
        .select(PROFILE_SELECT)
        .eq("user_id", session.user.id)
        .maybeSingle(),
      supabase
        .from("player_match_history")
        .select(HISTORY_SELECT)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setProfileLoading(false);
    const nextStats=normalizeProfileStats(data||{});
    if(error){
      setProfileStats(EMPTY_PROFILE_STATS);
      setProfileMsg(historyError ? "Could not load profile stats or match history." : "Could not load profile stats.");
    }else{
      setProfileStats(nextStats);
    }
    if(historyError){
      setMatchHistory([]);
      setProfileMsg((prev)=>prev||"Could not load full match history.");
    }else{
      setMatchHistory(historyData||[]);
    }
    if(error&&resolveEntry){
      setEntryScreen("mode-picker");
      return;
    }
    if(resolveEntry){
      if(data){
        setEntryScreen("app");
      }else{
        setEntryScreen("mode-picker");
      }
    }
  },[session]);

  useEffect(()=>{
    if(!session?.user?.id)return;
    loadProfileStats({resolveEntry:true});
  },[session,loadProfileStats]);

  useEffect(()=>{
    if(entryScreen!=="app"||tab!=="profile"||!session?.user?.id)return;
    void loadProfileStats();
    const delayedRefresh=setTimeout(()=>{void loadProfileStats();},1200);
    return()=>clearTimeout(delayedRefresh);
  },[entryScreen,tab,session,loadProfileStats]);

  const updateProfileStats=useCallback(async(updater)=>{
    if(!supabase||!session?.user?.id)return;
    setProfileMsg("");
    const userId=session.user.id;
    const { data: current, error: fetchError } = await supabase
      .from("player_profiles")
      .select(PROFILE_SELECT)
      .eq("user_id", userId)
      .maybeSingle();
    if(fetchError){setProfileMsg("Could not save profile stats.");return;}
    const next=normalizeProfileStats(updater(normalizeProfileStats(current||{})));
    const payload={user_id:userId,...next};
    const { error: writeError } = await supabase
      .from("player_profiles")
      .upsert(payload,{onConflict:"user_id"});
    if(writeError){setProfileMsg("Could not save profile stats.");return;}
    setProfileStats(next);
  },[session]);

  const insertMatchHistory=useCallback(async(entry)=>{
    if(!supabase||!session?.user?.id)return;
    const payload={user_id:session.user.id,...entry};
    const { data, error } = await supabase
      .from("player_match_history")
      .insert(payload)
      .select(HISTORY_SELECT)
      .single();
    if(error){
      setProfileMsg("Could not save match history.");
      return;
    }
    if(data){
      setMatchHistory((prev)=>[data,...prev].slice(0,30));
    }
  },[session]);

  const savePreferredMode=useCallback(async(mode)=>{
    const normalized=normalizeModeKey(mode);
    await updateProfileStats((prev)=>({...prev,preferred_mode:normalized}));
  },[updateProfileStats]);

  const handleModeSelect=useCallback((mode,{persist=true,openApp=false}={})=>{
    const normalized=normalizeModeKey(mode);
    router.push(modeToPath(normalized));
    if(openApp)setEntryScreen("app");
    if(persist)void savePreferredMode(normalized);
  },[router,savePreferredMode]);

  const recordPracticeSession=useCallback(async(practiceStats)=>{
    const rounds=practiceStats.hits+practiceStats.misses+practiceStats.penalties;
    if(rounds<=0)return;
    const accuracy=Math.round((practiceStats.hits/rounds)*100);
    await updateProfileStats((prev)=>({
      ...prev,
      practice_sessions:prev.practice_sessions+1,
      practice_rounds:prev.practice_rounds+rounds,
      practice_hits:prev.practice_hits+practiceStats.hits,
      practice_misses:prev.practice_misses+practiceStats.misses,
      practice_penalties:prev.practice_penalties+practiceStats.penalties,
      practice_best_time:practiceStats.bestTime===null?prev.practice_best_time:prev.practice_best_time===null?practiceStats.bestTime:Math.min(prev.practice_best_time,practiceStats.bestTime),
      practice_best_streak:Math.max(prev.practice_best_streak,practiceStats.bestStreak||0),
    }));
    await insertMatchHistory({
      mode:"practice",
      outcome:"session",
      score:practiceStats.hits||0,
      opponent_score:null,
      rounds,
      accuracy_pct:accuracy,
      best_time:practiceStats.bestTime??null,
      best_streak:practiceStats.bestStreak||0,
    });
  },[updateProfileStats,insertMatchHistory]);

  const recordDuelMatch=useCallback(async(result)=>{
    const isDraw=result.myScore===result.oppScore;
    const isWin=result.myScore>result.oppScore;
    const outcome=isDraw?"draw":isWin?"win":"loss";
    await updateProfileStats((prev)=>({
      ...prev,
      duel_matches:prev.duel_matches+1,
      duel_wins:prev.duel_wins+(isWin?1:0),
      duel_losses:prev.duel_losses+(!isWin&&!isDraw?1:0),
      duel_draws:prev.duel_draws+(isDraw?1:0),
      duel_score_for:prev.duel_score_for+result.myScore,
      duel_score_against:prev.duel_score_against+result.oppScore,
      duel_best_score:Math.max(prev.duel_best_score,result.myScore),
    }));
    await insertMatchHistory({
      mode:"1v1",
      outcome,
      score:result.myScore||0,
      opponent_score:result.oppScore||0,
      rounds:null,
      accuracy_pct:null,
      best_time:null,
      best_streak:null,
    });
  },[updateProfileStats,insertMatchHistory]);

  const logOut=async()=>{if(supabase)await supabase.auth.signOut();};

  if(!authReady)return(<div className="menu-bg"><div className="grid-bg"/><div style={{position:"relative",zIndex:1,color:C.textDim,fontSize:12,letterSpacing:2}}>LOADING AUTH...</div><style>{CSS}</style></div>);
  if(!session)return(<><AuthScreen/><style>{CSS}</style></>);
  if(entryScreen==="loading")return(<div className="menu-bg"><div className="grid-bg"/><div style={{position:"relative",zIndex:1,color:C.textDim,fontSize:12,letterSpacing:2}}>LOADING PROFILE...</div><style>{CSS}</style></div>);
  if(entryScreen==="mode-picker")return(<><ModePickerScreen session={session} onSelect={(mode)=>handleModeSelect(mode,{persist:true,openApp:true})} onLogOut={logOut}/><style>{CSS}</style></>);

  const navItems = [
    { key: "practice", icon: "⌘", label: "Solo" },
    { key: "1v1", icon: "⚔", label: "Duel" },
    { key: "profile", icon: "📊", label: "Stats" },
  ];

  return(
    <div style={{height:"100vh",display:"flex",background:C.bg,fontFamily:"var(--mono)",overflow:"hidden"}}>
      {/* GLOBAL SIDEBAR */}
      <aside style={{width:72,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",background:C.bg,flexShrink:0,zIndex:100}}>
        <div onClick={()=>router.push("/")} style={{height:72,display:"flex",alignItems:"center",justifyContent:"center",borderBottom:`1px solid ${C.border}`,width:"100%",cursor:"pointer"}}>
          <img src="/logo.png" alt="L" style={{width:32,height:"auto"}} />
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:32,marginTop:40}}>
          {navItems.map((item) => {
            const active = tab === item.key;
            return (
              <div key={item.key} onClick={()=>handleModeSelect(item.key)} style={{ 
                fontSize: 18, color: active ? C.green : C.textMuted, cursor: "pointer",
                transition: "all 0.2s", width: 40, height: 40, display: "flex", 
                alignItems: "center", justifyContent: "center", borderRadius: 8,
                background: active ? `${C.green}10` : "transparent"
              }} className="sidebar-item-btn">
                {item.icon}
              </div>
            );
          })}
        </div>
        <div onClick={logOut} style={{marginTop:"auto",paddingBottom:32,fontSize:18,color:C.textDim,cursor:"pointer"}} className="sidebar-item-btn">⏻</div>
      </aside>

      <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,position:"relative"}}>
        {/* GLOBAL TICKER */}
        <div style={{width:"100%",height:32,background:"black",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",whiteSpace:"nowrap",fontSize:10,fontWeight:700,letterSpacing:1.5,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"clamp(24px, 4vw, 60px)"}}>
            <span style={{color:C.green}}>&gt; CONNECTION: ESTABLISHED</span>
            <span style={{color:C.textMuted}}>USER: {session?.user?.user_metadata?.username || "ANONYMOUS"}</span>
            <span style={{color:C.cyan}}>RANK: {getRank(profileStats.practice_best_time).tier}</span>
            <span style={{color:C.orange}}>SESSIONS: {profileStats.practice_sessions}</span>
          </div>
        </div>

        <div style={{flex:1,overflow:"hidden",minHeight:0,position:"relative"}}>
          {tab==="practice"?<PracticeMode startDiff={startDiff} onSessionComplete={recordPracticeSession} onStartDiffChange={setStartDiff} onOpenProfile={()=>handleModeSelect("profile")}/>:tab==="1v1"?<OneVOneMode onMatchComplete={recordDuelMatch} initialJoinCode={duelCode}/>:<ProfileTab session={session} stats={profileStats} history={matchHistory} loading={profileLoading} msg={profileMsg} onRefresh={loadProfileStats}/>}
        </div>
      </main>
      <style>{CSS}</style>
    </div>
  );
}
