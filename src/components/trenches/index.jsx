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
const DUEL_ICON_VARIANT_KEY="trenches:duel-icon-variant-v5";
const DUEL_ICON_VARIANTS=["swords","vsMonogram","splitShields","glovesClash"];
const authBootstrapCache={
  ready:false,
  session:null,
};
const profileBootstrapCache={
  loaded:false,
  userId:null,
  stats:EMPTY_PROFILE_STATS,
  history:[],
  msg:"",
};
const writeAuthCache=(session)=>{
  authBootstrapCache.ready=true;
  authBootstrapCache.session=session||null;
};
const clearAuthCache=()=>{
  authBootstrapCache.ready=false;
  authBootstrapCache.session=null;
};
const hasCachedProfile=(userId)=>Boolean(userId)&&profileBootstrapCache.loaded&&profileBootstrapCache.userId===userId;
const clearProfileCache=()=>{
  profileBootstrapCache.loaded=false;
  profileBootstrapCache.userId=null;
  profileBootstrapCache.stats=EMPTY_PROFILE_STATS;
  profileBootstrapCache.history=[];
  profileBootstrapCache.msg="";
};
const writeProfileCache=({userId,stats,history,msg=""})=>{
  profileBootstrapCache.loaded=true;
  profileBootstrapCache.userId=userId;
  profileBootstrapCache.stats=stats;
  profileBootstrapCache.history=history;
  profileBootstrapCache.msg=msg;
};
const clampSidebarWidth=(value)=>Math.max(SIDEBAR_MIN,Math.min(SIDEBAR_MAX,Number(value)||SIDEBAR_DEFAULT));
const getSidebarWord=(word,width)=>{
  if(width>=156)return word;
  if(width>=128)return word.slice(0,Math.max(3,Math.min(4,word.length)));
  if(width>=100)return word.slice(0,Math.max(2,Math.min(3,word.length)));
  return word.slice(0,1);
};
const CompactSoloIcon=({color})=>(
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3v3m6.364-.364-2.122 2.122M21 12h-3m.364 6.364-2.122-2.122M12 21v-3m-6.364.364 2.122-2.122M3 12h3m-.364-6.364 2.122 2.122" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8"/>
  </svg>
);
const CompactDuelVsMonogramIcon=({color})=>(
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="14" rx="4" stroke={color} strokeWidth="1.8"/>
    <path d="M7.1 9.8 9 14.2l1.9-4.4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16.9 9.8h-3.2c-.9 0-1.1 1.2-.2 1.5l2 .7c.9.3.7 1.5-.2 1.5h-3.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8v8" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.75"/>
  </svg>
);
const CompactDuelSwordsIcon=({color})=>(
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7.2 18.6 16.9 8.9" stroke={color} strokeWidth="1.9" strokeLinecap="round"/>
    <path d="M16.8 18.6 7.1 8.9" stroke={color} strokeWidth="1.9" strokeLinecap="round"/>
    <path d="M8.7 17.1 6.4 19.4M6.4 19.4H4.9M6.4 19.4V17.9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15.3 17.1 17.6 19.4M17.6 19.4H19.1M17.6 19.4V17.9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 15.6h-2M14.5 15.6h2M10.2 6.6 7.8 8.1M13.8 6.6l2.4 1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CompactDuelSplitShieldsIcon=({color})=>(
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5.2c-2.4 0-4.8 1.1-6.2 2.3v5.2c0 3.2 2.4 5.6 6.2 6.2V5.2Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M12 5.2c2.4 0 4.8 1.1 6.2 2.3v5.2c0 3.2-2.4 5.6-6.2 6.2V5.2Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="m9.6 10.6 1.1 1.1 2.7-2.7M13.2 13.3h2.7" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CompactDuelGlovesClashIcon=({color})=>(
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 11.2c0-1.7 1.3-3 3-3h1.1l1.5 2.4-2.1 2.1H8.2A2.2 2.2 0 0 1 6 10.5v.7ZM18 11.2c0-1.7-1.3-3-3-3h-1.1l-1.5 2.4 2.1 2.1h1.3a2.2 2.2 0 0 0 2.2-2.2v.7Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
    <path d="m10.2 13.1 1.8 1.8 1.8-1.8M12 6.1v-1.6M9.6 6.9 8.5 5.8M14.4 6.9l1.1-1.1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CompactDuelIcon=({color,variant})=>(
  variant==="swords"
    ? <CompactDuelSwordsIcon color={color}/>
    : variant==="splitShields"
    ? <CompactDuelSplitShieldsIcon color={color}/>
    : variant==="glovesClash"
      ? <CompactDuelGlovesClashIcon color={color}/>
      : <CompactDuelVsMonogramIcon color={color}/>
);
const CompactProfileIcon=({color})=>(
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function App({initialDuelCode=""}){
  const router=useRouter();
  const pathname=usePathname();
  const tab=pathToMode(pathname||"");
  const duelCode=(initialDuelCode||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
  const[entryScreen,setEntryScreen]=useState(()=>profileBootstrapCache.loaded?"app":"loading"); // loading | app
  const[startDiff,setStartDiff]=useState(1);
  const[session,setSession]=useState(()=>authBootstrapCache.ready?authBootstrapCache.session:null);
  const[authReady,setAuthReady]=useState(()=>authBootstrapCache.ready);
  const[profileStats,setProfileStats]=useState(()=>profileBootstrapCache.loaded?profileBootstrapCache.stats:EMPTY_PROFILE_STATS);
  const[matchHistory,setMatchHistory]=useState(()=>profileBootstrapCache.loaded?profileBootstrapCache.history:[]);
  const[profileLoading,setProfileLoading]=useState(false);
  const[profileMsg,setProfileMsg]=useState(()=>profileBootstrapCache.loaded?profileBootstrapCache.msg:"");
  const[showLogoutWarning,setShowLogoutWarning]=useState(false);
  const[duelIconVariant,setDuelIconVariant]=useState(()=>{
    if(typeof window==="undefined")return "swords";
    const saved=window.localStorage.getItem(DUEL_ICON_VARIANT_KEY);
    return DUEL_ICON_VARIANTS.includes(saved)?saved:"swords";
  });
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
    if(!supabase){
      writeAuthCache(null);
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({data})=>{
      if(active){
        const nextSession=data?.session||null;
        writeAuthCache(nextSession);
        setSession(nextSession);
        if(!nextSession){
          clearProfileCache();
          setProfileStats(EMPTY_PROFILE_STATS);
          setMatchHistory([]);
          setProfileMsg("");
          setEntryScreen("loading");
        }else if(hasCachedProfile(nextSession.user.id)){
          setProfileStats(profileBootstrapCache.stats);
          setMatchHistory(profileBootstrapCache.history);
          setProfileMsg(profileBootstrapCache.msg);
          setEntryScreen("app");
        }else{
          setProfileStats(EMPTY_PROFILE_STATS);
          setMatchHistory([]);
          setProfileMsg("");
          setEntryScreen("loading");
        }
        setAuthReady(true);
      }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const normalizedSession=nextSession||null;
      if(normalizedSession){
        writeAuthCache(normalizedSession);
      }else{
        clearAuthCache();
      }
      setSession(normalizedSession);
      setAuthReady(true);
      if(!normalizedSession){
        clearProfileCache();
        setProfileStats(EMPTY_PROFILE_STATS);
        setMatchHistory([]);
        setProfileMsg("");
        setEntryScreen("loading");
      }else if(hasCachedProfile(normalizedSession.user.id)){
        setProfileStats(profileBootstrapCache.stats);
        setMatchHistory(profileBootstrapCache.history);
        setProfileMsg(profileBootstrapCache.msg);
        setEntryScreen("app");
      }else{
        setProfileStats(EMPTY_PROFILE_STATS);
        setMatchHistory([]);
        setProfileMsg("");
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
    const userId=session.user.id;
    setProfileLoading(true);
    setProfileMsg("");
    const [{ data, error }, { data: historyData, error: historyError }] = await Promise.all([
      supabase
        .from("player_profiles")
        .select(PROFILE_SELECT)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("player_match_history")
        .select(HISTORY_SELECT)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setProfileLoading(false);
    const nextStats=normalizeProfileStats(data||{});
    const finalStats=error?EMPTY_PROFILE_STATS:nextStats;
    const finalHistory=historyError?[]:(historyData||[]);
    const finalMsg=error
      ?(historyError?"Could not load profile stats or match history.":"Could not load profile stats.")
      :(historyError?"Could not load full match history.":"");
    if(error){
      setProfileStats(EMPTY_PROFILE_STATS);
      setProfileMsg(finalMsg);
    }else{
      setProfileStats(nextStats);
    }
    if(historyError){
      setMatchHistory([]);
      if(!error)setProfileMsg(finalMsg);
    }else{
      setMatchHistory(historyData||[]);
    }
    writeProfileCache({userId,stats:finalStats,history:finalHistory,msg:finalMsg});
    if(resolveEntry){
      setEntryScreen("app");
    }
  },[session]);

  useEffect(()=>{
    if(!session?.user?.id)return;
    if(hasCachedProfile(session.user.id)){
      setProfileStats(profileBootstrapCache.stats);
      setMatchHistory(profileBootstrapCache.history);
      setProfileMsg(profileBootstrapCache.msg);
      setEntryScreen("app");
      return;
    }
    loadProfileStats({resolveEntry:true});
  },[session,loadProfileStats]);

  useEffect(()=>{
    if(typeof window==="undefined")return;
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY,String(sidebarWidth));
  },[sidebarWidth]);
  useEffect(()=>{
    if(typeof window==="undefined")return;
    window.localStorage.setItem(DUEL_ICON_VARIANT_KEY,duelIconVariant);
  },[duelIconVariant]);

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
    if(profileBootstrapCache.userId===userId){
      profileBootstrapCache.stats=next;
      profileBootstrapCache.msg="";
      profileBootstrapCache.loaded=true;
    }
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
      setMatchHistory((prev)=>{
        const next=[data,...prev].slice(0,30);
        if(profileBootstrapCache.userId===session.user.id){
          profileBootstrapCache.history=next;
          profileBootstrapCache.msg="";
          profileBootstrapCache.loaded=true;
        }
        return next;
      });
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
    const outcome=result?.outcome==="win"||result?.outcome==="loss"||result?.outcome==="draw"?result.outcome:"draw";
    const isDraw=outcome==="draw";
    const isWin=outcome==="win";
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
    { key: "practice", word: "SOLO", compactIcon: "/practice-icon.png" },
    { key: "1v1", word: "DUEL", compactIconNode: (color)=><CompactDuelIcon color={color} variant={duelIconVariant}/> },
    { key: "profile", word: "STATS", compactIconNode: (color)=><CompactProfileIcon color={color}/> },
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
            const useCompactIcon = Boolean(item.compactIcon || item.compactIconNode) && !showWideSidebar;
            return (
              <div key={item.key} onClick={()=>handleModeSelect(item.key)} title={item.word} style={{ 
                color: active ? C.green : C.textMuted, cursor: "pointer",
                transition: "all 0.2s", width: showWideSidebar?"100%":56, height: 40, display: "flex", 
                alignItems: "center", justifyContent: showWideSidebar?"flex-start":"center", borderRadius: 8,
                background: active ? `${C.green}10` : "transparent"
              }} className="sidebar-item-btn">
                {useCompactIcon ? (
                  item.compactIconNode ? item.compactIconNode(active ? C.green : C.textMuted) : (
                    <img
                      src={item.compactIcon}
                      alt={item.word}
                      style={{
                        width: 24,
                        height: 24,
                        objectFit: "contain",
                        opacity: active ? 1 : 0.74,
                        filter: active ? "drop-shadow(0 0 4px rgba(0,255,157,0.35))" : "none",
                      }}
                    />
                  )
                ) : (
                  <span style={{fontSize:10,fontWeight:900,letterSpacing:1.2,lineHeight:1,paddingLeft:showWideSidebar?12:0}}>
                    {getSidebarWord(item.word,sidebarWidth)}
                  </span>
                )}
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
