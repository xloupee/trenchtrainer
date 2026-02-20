"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import OneVOneMode from "./screens/OneVOneMode";
import PracticeMode from "./screens/PracticeMode";
import ProfileTab from "./screens/ProfileTab";
import { CSS } from "./styles/cssText";

const SIDEBAR_WIDTH_KEY="trenches:sidebar-width";
const SIDEBAR_MIN=64;
const SIDEBAR_MAX=220;
const SIDEBAR_DEFAULT=72;
const clampSidebarWidth=(value)=>Math.max(SIDEBAR_MIN,Math.min(SIDEBAR_MAX,Number(value)||SIDEBAR_DEFAULT));
const getSidebarWord=(word,width)=>{
  if(width>=156)return word;
  if(width>=128)return word.slice(0,Math.max(3,Math.min(4,word.length)));
  if(width>=100)return word.slice(0,Math.max(2,Math.min(3,word.length)));
  return word.slice(0,1);
};

export default function App({initialDuelCode=""}){
  const router=useRouter();
  const pathname=usePathname();
  const tab=pathToMode(pathname||"");
  const duelCode=(initialDuelCode||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
  const[entryScreen,setEntryScreen]=useState("loading"); // loading | app
  const[startDiff,setStartDiff]=useState(1);
  const[session,setSession]=useState(null);
  const[authReady,setAuthReady]=useState(false);
  const[profileStats,setProfileStats]=useState(EMPTY_PROFILE_STATS);
  const[matchHistory,setMatchHistory]=useState([]);
  const[profileLoading,setProfileLoading]=useState(false);
  const[profileMsg,setProfileMsg]=useState("");
  const[showLogoutWarning,setShowLogoutWarning]=useState(false);
  const[sidebarWidth,setSidebarWidth]=useState(()=>{
    if(typeof window==="undefined")return SIDEBAR_DEFAULT;
    return clampSidebarWidth(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
  });
  const[isResizingSidebar,setIsResizingSidebar]=useState(false);
  const isResizingSidebarRef=useRef(false);
  const logoutWarningRef=useRef(null);
  const logoutTriggerRef=useRef(null);
  const showWideSidebar=sidebarWidth>=124;

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

  useEffect(()=>{
    if(!authReady||session)return;
    const nextPath=typeof window!=="undefined"?`${window.location.pathname}${window.location.search}`:(pathname||"/play/practice");
    router.replace(`/auth?next=${encodeURIComponent(nextPath)}`);
  },[authReady,session,pathname,router]);

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
    if(resolveEntry){
      setEntryScreen("app");
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

  useEffect(()=>{
    if(typeof window==="undefined")return;
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY,String(sidebarWidth));
  },[sidebarWidth]);

  useEffect(()=>{
    isResizingSidebarRef.current=isResizingSidebar;
    if(!isResizingSidebar)return;
    const onMouseMove=(event)=>{
      if(!isResizingSidebarRef.current)return;
      setSidebarWidth(clampSidebarWidth(event.clientX));
    };
    const onMouseUp=()=>setIsResizingSidebar(false);
    window.addEventListener("mousemove",onMouseMove);
    window.addEventListener("mouseup",onMouseUp);
    document.body.style.cursor="col-resize";
    document.body.style.userSelect="none";
    return()=>{
      window.removeEventListener("mousemove",onMouseMove);
      window.removeEventListener("mouseup",onMouseUp);
      document.body.style.cursor="";
      document.body.style.userSelect="";
    };
  },[isResizingSidebar]);

  useEffect(()=>{
    if(!showLogoutWarning||typeof window==="undefined")return;
    const onPointerDown=(event)=>{
      const target=event.target;
      if(logoutWarningRef.current?.contains(target))return;
      if(logoutTriggerRef.current?.contains(target))return;
      setShowLogoutWarning(false);
    };
    window.addEventListener("mousedown",onPointerDown);
    return()=>window.removeEventListener("mousedown",onPointerDown);
  },[showLogoutWarning]);

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

  const handleModeSelect=useCallback((mode,{persist=true}={})=>{
    const normalized=normalizeModeKey(mode);
    router.push(modeToPath(normalized));
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
  const openLogoutWarning=()=>setShowLogoutWarning(true);
  const cancelLogout=()=>setShowLogoutWarning(false);
  const confirmAndLogOut=()=>{
    setShowLogoutWarning(false);
    void logOut();
  };

  if(!authReady)return(<div className="menu-bg"><div className="grid-bg"/><div style={{position:"relative",zIndex:1,color:C.textDim,fontSize:12,letterSpacing:2}}>LOADING AUTH...</div><style>{CSS}</style></div>);
  if(!session)return(<div className="menu-bg"><div className="grid-bg"/><div style={{position:"relative",zIndex:1,color:C.textDim,fontSize:12,letterSpacing:2}}>REDIRECTING TO AUTH...</div><style>{CSS}</style></div>);
  if(entryScreen==="loading")return(<div className="menu-bg"><div className="grid-bg"/><div style={{position:"relative",zIndex:1,color:C.textDim,fontSize:12,letterSpacing:2}}>LOADING PROFILE...</div><style>{CSS}</style></div>);

  const navItems = [
    { key: "practice", word: "SOLO" },
    { key: "1v1", word: "DUEL" },
    { key: "profile", word: "STATS" },
  ];

  return(
    <div style={{height:"100vh",display:"flex",background:C.bg,fontFamily:"var(--mono)",overflow:"hidden"}}>
      {/* GLOBAL SIDEBAR */}
      <aside style={{width:sidebarWidth,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:showWideSidebar?"stretch":"center",background:C.bg,flexShrink:0,zIndex:100,position:"relative"}}>
        <div onClick={()=>router.push("/")} style={{height:72,display:"flex",alignItems:"center",justifyContent:"center",borderBottom:`1px solid ${C.border}`,width:"100%",cursor:"pointer"}}>
          <img src="/logo.png" alt="L" style={{width:32,height:"auto"}} />
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:20,marginTop:28,padding:showWideSidebar?"0 8px":"0"}}>
          {navItems.map((item) => {
            const active = tab === item.key;
            return (
              <div key={item.key} onClick={()=>handleModeSelect(item.key)} title={item.word} style={{ 
                color: active ? C.green : C.textMuted, cursor: "pointer",
                transition: "all 0.2s", width: showWideSidebar?"100%":56, height: 40, display: "flex", 
                alignItems: "center", justifyContent: showWideSidebar?"flex-start":"center", borderRadius: 8,
                background: active ? `${C.green}10` : "transparent"
              }} className="sidebar-item-btn">
                <span style={{fontSize:10,fontWeight:900,letterSpacing:1.2,lineHeight:1,paddingLeft:showWideSidebar?12:0}}>
                  {getSidebarWord(item.word,sidebarWidth)}
                </span>
              </div>
            );
          })}
        </div>
        {showLogoutWarning?(
          <div style={{
            position:"absolute",
            bottom:84,
            left:showWideSidebar?8:66,
            width:showWideSidebar?"calc(100% - 16px)":220,
            padding:10,
            borderRadius:10,
            border:`1px solid ${C.borderLight}`,
            background:`linear-gradient(145deg, ${C.bgCard}, ${C.bgAlt})`,
            boxShadow:"0 10px 30px rgba(0,0,0,0.45)",
            zIndex:160,
          }} ref={logoutWarningRef}>
            <div style={{fontSize:10,fontWeight:800,color:C.text,letterSpacing:1,marginBottom:8}}>Log out?</div>
            <div style={{fontSize:9,color:C.textMuted,lineHeight:1.5,marginBottom:10}}>You will need to sign in again to continue.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={cancelLogout} className="btn-ghost" style={{height:34,fontSize:9,padding:0}}>Cancel</button>
              <button onClick={confirmAndLogOut} className="btn-primary btn-orange btn-static" style={{height:34,fontSize:9,letterSpacing:1.2,padding:0}}>Log out</button>
            </div>
          </div>
        ):null}
        <div ref={logoutTriggerRef} onClick={openLogoutWarning} style={{marginTop:"auto",marginBottom:32,fontSize:18,color:C.textDim,cursor:"pointer",width:showWideSidebar?"calc(100% - 16px)":56,height:40,borderRadius:8,display:"flex",alignItems:"center",justifyContent:showWideSidebar?"flex-start":"center",paddingLeft:showWideSidebar?12:0,alignSelf:showWideSidebar?"center":"auto",background:showLogoutWarning?`${C.orange}12`:"transparent"}} className="sidebar-item-btn">⏻</div>
        <div
          onMouseDown={(event)=>{event.preventDefault();setIsResizingSidebar(true);}}
          onDoubleClick={()=>setSidebarWidth(SIDEBAR_DEFAULT)}
          title="Drag to resize sidebar"
          style={{position:"absolute",top:0,right:-3,width:6,height:"100%",cursor:"col-resize",zIndex:140,background:isResizingSidebar?`${C.green}30`:"transparent",transition:"background 0.2s"}}
        />
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
