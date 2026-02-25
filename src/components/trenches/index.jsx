"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import {
  C,
  HISTORY_SELECT,
  HISTORY_SELECT_LEGACY,
  HISTORY_SELECT_MINIMAL,
  EMPTY_PROFILE_STATS,
  PROFILE_SELECT,
  PROFILE_SELECT_LEGACY,
  modeToPath,
  normalizeModeKey,
  normalizeProfileStats,
  pathToMode,
} from "./config/constants";
import { computeDuelRating, getDuelTier } from "./lib/duelRank";
import {
  getPracticeDifficultyMultiplier,
  getSoloTierDifficultyPenaltyMultiplier,
  computePracticeRating,
  computePracticeSessionScore,
  computeEndlessRunScore,
  computeEndlessRating,
  getPracticeNextTier,
  getPracticeTier,
} from "./lib/practiceRank";
import OneVOneMode from "./screens/OneVOneMode";
import PracticeMode from "./screens/PracticeMode";
import ProfileTab from "./screens/ProfileTab";
import WagerWipTab from "./screens/WagerWipTab";
import { CSS } from "./styles/cssText";

const SIDEBAR_WIDTH_KEY="trenches:sidebar-width";
const SIDEBAR_MIN=64;
const SIDEBAR_MAX=220;
const SIDEBAR_DEFAULT=72;
const DUEL_ICON_VARIANT_KEY="trenches:duel-icon-variant-v5";
const DUEL_ICON_VARIANTS=["swords","vsMonogram","splitShields","glovesClash"];
const RANK_PROFILE_FIELDS=[
  "practice_rating",
  "practice_peak_rating",
  "practice_tier",
  "duel_rating",
  "duel_peak_rating",
  "duel_tier",
];
const CORE_PROFILE_FIELDS=[
  "preferred_mode",
  "practice_sessions",
  "practice_rounds",
  "practice_hits",
  "practice_misses",
  "practice_penalties",
  "practice_best_time",
  "practice_best_streak",
  "duel_matches",
  "duel_wins",
  "duel_losses",
  "duel_draws",
  "duel_score_for",
  "duel_score_against",
  "duel_best_score",
];
const HISTORY_RATING_FIELDS=["rating_before","rating_after","rating_delta"];
const isMissingRankColumnsError=(error)=>{
  const message=String(error?.message||"").toLowerCase();
  if(RANK_PROFILE_FIELDS.some((field)=>message.includes(field)))return true;
  return (
    error?.code==="42703"||
    (message.includes("player_profiles")&&message.includes("column")&&(message.includes("does not exist")||message.includes("schema cache")))
  );
};
const isMissingHistoryRatingColumnsError=(error)=>{
  const message=String(error?.message||"").toLowerCase();
  if(HISTORY_RATING_FIELDS.some((field)=>message.includes(field)))return true;
  return (
    error?.code==="42703"||
    (message.includes("player_match_history")&&message.includes("column")&&(message.includes("does not exist")||message.includes("schema cache")))
  );
};
const isHistoryModeConstraintError=(error)=>{
  const message=String(error?.message||"").toLowerCase();
  return (
    error?.code==="23514"&&
    message.includes("player_match_history")&&
    message.includes("mode")
  );
};
const stripHistoryRatingFieldsFromPayload=(payload)=>{
  const next={...payload};
  HISTORY_RATING_FIELDS.forEach((field)=>{delete next[field];});
  return next;
};
const isSoloHistoryMode=(mode)=>mode==="solo"||mode==="practice"||mode==="endless";
const hasRankFieldsInRow=(row)=>Boolean(row)&&RANK_PROFILE_FIELDS.some((field)=>Object.prototype.hasOwnProperty.call(row,field));
const hasCoreProfileFields=(row)=>Boolean(row)&&CORE_PROFILE_FIELDS.every((field)=>Object.prototype.hasOwnProperty.call(row,field));
const hasProfileProgress=(stats={})=>(
  Number(stats?.practice_sessions||0)>0||
  Number(stats?.practice_rounds||0)>0||
  Number(stats?.practice_hits||0)>0||
  Number(stats?.duel_matches||0)>0||
  Number(stats?.practice_rating||0)>0||
  Number(stats?.duel_rating||0)>0
);
const isSuspiciousResetRow=(row,historyRows=[])=>{
  if(!hasCoreProfileFields(row))return true;
  const normalized=normalizeProfileStats(row||{});
  return !hasProfileProgress(normalized)&&Array.isArray(historyRows)&&historyRows.length>0;
};
const asNumber=(value,fallback=0)=>{
  const num=Number(value);
  return Number.isFinite(num)?num:fallback;
};
const deriveProfileStatsFromHistory=(rows=[],seedStats=EMPTY_PROFILE_STATS)=>{
  const list=Array.isArray(rows)?rows:[];
  const base=normalizeProfileStats(seedStats||{});
  if(list.length===0)return base;

  let practiceSessions=0;
  let practiceRounds=0;
  let practiceHits=0;
  let practiceMisses=0;
  let practiceBestTime=base.practice_best_time;
  let practiceBestStreak=base.practice_best_streak;
  let practiceRating=base.practice_rating;
  let practicePeakRating=Math.max(base.practice_peak_rating||0,practiceRating);
  let sawPracticeRating=false;

  let duelMatches=0;
  let duelWins=0;
  let duelLosses=0;
  let duelDraws=0;
  let duelScoreFor=0;
  let duelScoreAgainst=0;
  let duelBestScore=base.duel_best_score;
  let duelRating=Math.max(0,base.duel_rating||0);
  let duelPeakRating=Math.max(base.duel_peak_rating||duelRating,duelRating);
  let sawDuelRating=false;

  list.forEach((row)=>{
    if(isSoloHistoryMode(row?.mode)){
      practiceSessions+=1;
      const storedRounds=Math.max(0,Math.round(asNumber(row?.rounds,0)));
      const storedScore=Math.max(0,Math.round(asNumber(row?.score,0)));
      const rawAccuracy=asNumber(row?.accuracy_pct,NaN);
      const hasAccuracy=Number.isFinite(rawAccuracy);
      const accuracyPct=Math.max(0,Math.min(100,rawAccuracy));
      const rounds=storedRounds>0?storedRounds:(hasAccuracy?0:storedScore);
      const hits=hasAccuracy&&rounds>0
        ?Math.max(0,Math.min(rounds,Math.round((accuracyPct/100)*rounds)))
        :Math.max(0,Math.min(rounds,storedScore));
      practiceRounds+=rounds;
      practiceHits+=hits;
      practiceMisses+=Math.max(0,rounds-hits);
      const bestTime=asNumber(row?.best_time,NaN);
      if(Number.isFinite(bestTime)&&bestTime>0){
        practiceBestTime=practiceBestTime===null?bestTime:Math.min(practiceBestTime,bestTime);
      }
      practiceBestStreak=Math.max(practiceBestStreak,Math.max(0,Math.round(asNumber(row?.best_streak,0))));
      const ratingAfter=asNumber(row?.rating_after,NaN);
      if(Number.isFinite(ratingAfter)){
        if(!sawPracticeRating){
          practiceRating=Math.max(0,Math.round(ratingAfter));
          sawPracticeRating=true;
        }
        practicePeakRating=Math.max(practicePeakRating,Math.round(ratingAfter));
      }
      return;
    }
    if(row?.mode==="1v1"){
      duelMatches+=1;
      if(row?.outcome==="win")duelWins+=1;
      else if(row?.outcome==="loss")duelLosses+=1;
      else duelDraws+=1;
      const myScore=Math.max(0,Math.round(asNumber(row?.score,0)));
      const oppScore=Math.max(0,Math.round(asNumber(row?.opponent_score,0)));
      duelScoreFor+=myScore;
      duelScoreAgainst+=oppScore;
      duelBestScore=Math.max(duelBestScore,myScore);
      const ratingAfter=asNumber(row?.rating_after,NaN);
      if(Number.isFinite(ratingAfter)){
        if(!sawDuelRating){
          duelRating=Math.max(0,Math.round(ratingAfter));
          sawDuelRating=true;
        }
        duelPeakRating=Math.max(duelPeakRating,Math.round(ratingAfter));
      }
    }
  });

  return normalizeProfileStats({
    ...base,
    practice_sessions:practiceSessions,
    practice_rounds:practiceRounds,
    practice_hits:practiceHits,
    practice_misses:practiceMisses,
    practice_penalties:0,
    practice_best_time:practiceBestTime,
    practice_best_streak:practiceBestStreak,
    practice_rating:practiceRating,
    practice_peak_rating:Math.max(practicePeakRating,practiceRating),
    practice_tier:getPracticeTier(practiceRating).tier,
    duel_matches:duelMatches,
    duel_wins:duelWins,
    duel_losses:duelLosses,
    duel_draws:duelDraws,
    duel_score_for:duelScoreFor,
    duel_score_against:duelScoreAgainst,
    duel_best_score:duelBestScore,
    duel_rating:duelRating,
    duel_peak_rating:Math.max(duelPeakRating,duelRating),
    duel_tier:getDuelTier(duelRating).tier,
  });
};
const mergeRankFields=(target,source)=>{
  const next={...target};
  RANK_PROFILE_FIELDS.forEach((field)=>{
    if(source&&source[field]!==undefined&&source[field]!==null){
      next[field]=source[field];
    }
  });
  return next;
};
const stripRankFieldsFromProfilePayload=(payload)=>{
  const next={...payload};
  RANK_PROFILE_FIELDS.forEach((field)=>{delete next[field];});
  return next;
};
const allowLegacyRankFallback=()=>{
  if(process.env.NODE_ENV==="production")return false;
  const explicit=String(process.env.NEXT_PUBLIC_ALLOW_LEGACY_RANK_FALLBACK||"").toLowerCase();
  if(explicit==="1"||explicit==="true"||explicit==="yes")return true;
  return true;
};
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
const CompactWagerIcon=({color})=>(
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6.5 8.2h11a2 2 0 0 1 2 2v5.6a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-5.6a2 2 0 0 1 2-2Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    <circle cx="12" cy="13" r="2.3" stroke={color} strokeWidth="1.8"/>
    <path d="M8.2 6.2h7.6M9.8 5h4.4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const CompactRoadmapIcon=({color})=>(
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M9 20l-5-2V4l5 2m0 14l5-2m-5 2V6m5 12l5 2V6l-5-2m0 14V4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
  const[profileHydrated,setProfileHydrated]=useState(()=>profileBootstrapCache.loaded);
  const[showLogoutWarning,setShowLogoutWarning]=useState(false);
  const[hoveredSidebarKey,setHoveredSidebarKey]=useState(null);
  const[duelIconVariant]=useState(()=>{
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
          setProfileHydrated(false);
          setEntryScreen("loading");
        }else if(hasCachedProfile(nextSession.user.id)){
          setProfileStats(profileBootstrapCache.stats);
          setMatchHistory(profileBootstrapCache.history);
          setProfileMsg(profileBootstrapCache.msg);
          setProfileHydrated(true);
          setEntryScreen("app");
        }else{
          setProfileStats(EMPTY_PROFILE_STATS);
          setMatchHistory([]);
          setProfileMsg("");
          setProfileHydrated(false);
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
        setProfileHydrated(false);
        setEntryScreen("loading");
      }else if(hasCachedProfile(normalizedSession.user.id)){
        setProfileStats(profileBootstrapCache.stats);
        setMatchHistory(profileBootstrapCache.history);
        setProfileMsg(profileBootstrapCache.msg);
        setProfileHydrated(true);
        setEntryScreen("app");
      }else{
        setProfileStats(EMPTY_PROFILE_STATS);
        setMatchHistory([]);
        setProfileMsg("");
        setProfileHydrated(false);
        setEntryScreen("loading");
      }
    });
    return()=>{active=false;authListener?.subscription?.unsubscribe();};
  },[]);

  useEffect(()=>{
    if(!authReady||session)return;
    const nextPath=typeof window!=="undefined"?`${window.location.pathname}${window.location.search}`:(pathname||"/play/solo");
    router.replace(`/auth?next=${encodeURIComponent(nextPath)}`);
  },[authReady,session,pathname,router]);

  const loadProfileStats=useCallback(async({resolveEntry=false}={})=>{
    if(!supabase||!session?.user?.id)return;
    const userId=session.user.id;
    setProfileHydrated(false);
    setProfileLoading(true);
    setProfileMsg("");
    const loadHistoryWithSelect=(selectFields)=>supabase
      .from("player_match_history")
      .select(selectFields)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    let { data, error } = await supabase
      .from("player_profiles")
      .select(PROFILE_SELECT)
      .eq("user_id", userId)
      .maybeSingle();
    if(error&&isMissingRankColumnsError(error)){
      const legacyRes=await supabase
        .from("player_profiles")
        .select(PROFILE_SELECT_LEGACY)
        .eq("user_id", userId)
        .maybeSingle();
      data=legacyRes.data;
      error=legacyRes.error;
    }
    let { data: historyData, error: historyError } = await loadHistoryWithSelect(HISTORY_SELECT);
    if(historyError&&isMissingHistoryRatingColumnsError(historyError)){
      const legacyHistoryRes=await loadHistoryWithSelect(HISTORY_SELECT_LEGACY);
      historyData=legacyHistoryRes.data;
      historyError=legacyHistoryRes.error;
    }
    if(historyError&&isMissingHistoryRatingColumnsError(historyError)){
      const minimalHistoryRes=await loadHistoryWithSelect(HISTORY_SELECT_MINIMAL);
      historyData=minimalHistoryRes.data;
      historyError=minimalHistoryRes.error;
    }
    setProfileLoading(false);
    const fallbackStats=hasCachedProfile(userId)?profileBootstrapCache.stats:normalizeProfileStats(profileStats||{});
    const resolvedHistory=historyError?[]:(historyData||[]);
    const rowHasCoreFields=hasCoreProfileFields(data);
    const rowMissing=!data;
    const normalizedRow=rowHasCoreFields?normalizeProfileStats(data||{}):null;
    const rowStats=rowHasCoreFields&&normalizedRow
      ?(hasRankFieldsInRow(data)?normalizedRow:mergeRankFields(normalizedRow,fallbackStats))
      :null;
    const shouldUseFallbackForMissingRow=rowMissing&&hasProfileProgress(fallbackStats);
    const shouldTreatRowAsInvalid=!rowHasCoreFields||isSuspiciousResetRow(data,resolvedHistory);
    const recoveredStats=(!historyError&&resolvedHistory.length>0&&(!rowStats||!hasProfileProgress(rowStats)||shouldTreatRowAsInvalid))
      ?deriveProfileStatsFromHistory(resolvedHistory,fallbackStats)
      :null;
    const shouldRecoverFromHistory=Boolean(recoveredStats)&&hasProfileProgress(recoveredStats);
    const resolvedStats=error
      ?fallbackStats
      :shouldUseFallbackForMissingRow
        ?fallbackStats
        :shouldRecoverFromHistory
          ?recoveredStats
          :rowStats||fallbackStats;
    let resolvedMsg=error
      ?(historyError?"Could not load profile stats or match history.":"Could not load profile stats.")
      :shouldUseFallbackForMissingRow
        ?"Profile row missing. Using cached stats to prevent reset."
      :shouldTreatRowAsInvalid&&!shouldRecoverFromHistory
        ?"Profile row is incomplete. Using safe fallback."
      :shouldRecoverFromHistory
        ?"Recovered profile stats from match history after detecting a reset row."
      :(historyError?"Could not load full match history.":"");

    if(shouldRecoverFromHistory){
      const recoveryPayload={user_id:userId,...resolvedStats};
      let { error: recoveryError } = await supabase
        .from("player_profiles")
        .upsert(recoveryPayload,{onConflict:"user_id"});
      if(recoveryError&&isMissingRankColumnsError(recoveryError)&&allowLegacyRankFallback()){
        const legacyRecoveryPayload=stripRankFieldsFromProfilePayload(recoveryPayload);
        const legacyRecoveryRes=await supabase
          .from("player_profiles")
          .upsert(legacyRecoveryPayload,{onConflict:"user_id"});
        recoveryError=legacyRecoveryRes.error;
      }
      if(recoveryError){
        if(isMissingRankColumnsError(recoveryError)){
          console.error("[profile_recovery_rank_write_failed]",{
            userId,
            code:recoveryError?.code,
            message:recoveryError?.message,
          });
        }
        resolvedMsg="Recovered stats locally from history, but could not persist recovery to profile row.";
      }
    }

    setProfileStats(resolvedStats);
    setMatchHistory(resolvedHistory);
    const canSafelyWriteProfile=!error||hasProfileProgress(resolvedStats)||resolvedHistory.length>0||hasCachedProfile(userId);
    const finalMsg=!canSafelyWriteProfile&&error
      ?"Profile sync unavailable right now. Writes are paused to protect your stats."
      :resolvedMsg;
    const shouldCacheResolved=canSafelyWriteProfile;
    setProfileMsg(finalMsg);
    if(shouldCacheResolved){
      writeProfileCache({userId,stats:resolvedStats,history:resolvedHistory,msg:finalMsg});
    }
    setProfileHydrated(canSafelyWriteProfile);
    if(resolveEntry){
      setEntryScreen("app");
    }
  },[profileStats,session]);

  useEffect(()=>{
    if(!session?.user?.id)return;
    if(hasCachedProfile(session.user.id)){
      setProfileStats(profileBootstrapCache.stats);
      setMatchHistory(profileBootstrapCache.history);
      setProfileMsg(profileBootstrapCache.msg);
      setProfileHydrated(true);
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
    if(!profileHydrated)return;
    setProfileMsg("");
    const userId=session.user.id;
    let { data: current, error: fetchError } = await supabase
      .from("player_profiles")
      .select(PROFILE_SELECT)
      .eq("user_id", userId)
      .maybeSingle();
    if(fetchError&&isMissingRankColumnsError(fetchError)){
      const legacyRes=await supabase
        .from("player_profiles")
        .select(PROFILE_SELECT_LEGACY)
        .eq("user_id", userId)
        .maybeSingle();
      current=legacyRes.data;
      fetchError=legacyRes.error;
    }
    if(fetchError){setProfileMsg("Could not save profile stats.");return;}
    const cachedStats=hasCachedProfile(userId)?profileBootstrapCache.stats:normalizeProfileStats(profileStats||{});
    const rowHasCoreFields=hasCoreProfileFields(current);
    const normalizedCurrent=rowHasCoreFields?normalizeProfileStats(current||{}):null;
    const baseFromCurrent=rowHasCoreFields&&normalizedCurrent
      ?(hasRankFieldsInRow(current)?normalizedCurrent:mergeRankFields(normalizedCurrent,cachedStats))
      :null;
    const historyDerived=Array.isArray(matchHistory)&&matchHistory.length>0
      ?deriveProfileStatsFromHistory(matchHistory,cachedStats)
      :null;
    const baseStats=baseFromCurrent&&hasProfileProgress(baseFromCurrent)
      ?baseFromCurrent
      :hasProfileProgress(cachedStats)
        ?cachedStats
        :historyDerived&&hasProfileProgress(historyDerived)
          ?historyDerived
          :baseFromCurrent||cachedStats;
    const next=normalizeProfileStats(updater(baseStats));
    const payload={user_id:userId,...next};
    let { error: writeError } = await supabase
      .from("player_profiles")
      .upsert(payload,{onConflict:"user_id"});
    if(writeError&&isMissingRankColumnsError(writeError)&&allowLegacyRankFallback()){
      const legacyPayload=stripRankFieldsFromProfilePayload(payload);
      const legacyWriteRes=await supabase
        .from("player_profiles")
        .upsert(legacyPayload,{onConflict:"user_id"});
      writeError=legacyWriteRes.error;
    }
    if(writeError){
      if(isMissingRankColumnsError(writeError)){
        console.error("[profile_rank_write_failed]",{
          userId,
          code:writeError?.code,
          message:writeError?.message,
        });
        setProfileMsg("Could not save rank fields. Database schema is missing rank columns.");
        return;
      }
      setProfileMsg("Could not save profile stats.");
      return;
    }
    setProfileStats(next);
    if(profileBootstrapCache.userId===userId){
      profileBootstrapCache.stats=next;
      profileBootstrapCache.msg="";
      profileBootstrapCache.loaded=true;
    }
    return next;
  },[matchHistory,profileHydrated,profileStats,session]);

  const insertMatchHistory=useCallback(async(entry)=>{
    if(!supabase||!session?.user?.id)return;
    const userId=session.user.id;
    const payload={user_id:userId,...entry};
    const insertWithSelect=(insertPayload,selectFields)=>supabase
      .from("player_match_history")
      .insert(insertPayload)
      .select(selectFields)
      .single();
    let { data, error } = await insertWithSelect(payload,HISTORY_SELECT);
    if(error&&isMissingHistoryRatingColumnsError(error)){
      const legacyPayload=stripHistoryRatingFieldsFromPayload(payload);
      const legacyInsertRes=await insertWithSelect(legacyPayload,HISTORY_SELECT_LEGACY);
      data=legacyInsertRes.data;
      error=legacyInsertRes.error;
      if(data){
        data={...data,...HISTORY_RATING_FIELDS.reduce((acc,field)=>{
          if(entry[field]!==undefined)acc[field]=entry[field];
          return acc;
        },{})};
      }
    }
    if(error&&isMissingHistoryRatingColumnsError(error)){
      const minimalPayload={
        user_id:userId,
        mode:entry?.mode||"solo",
        outcome:entry?.outcome||"session",
        score:Number(entry?.score||0),
        opponent_score:entry?.opponent_score??null,
      };
      const minimalInsertRes=await insertWithSelect(minimalPayload,HISTORY_SELECT_MINIMAL);
      data=minimalInsertRes.data;
      error=minimalInsertRes.error;
      if(data){
        data={...data,...HISTORY_RATING_FIELDS.reduce((acc,field)=>{
          if(entry[field]!==undefined)acc[field]=entry[field];
          return acc;
        },{})};
      }
    }
    if(error&&isHistoryModeConstraintError(error)&&entry?.mode==="endless"){
      const fallbackPayload={...payload,mode:"solo"};
      const fallbackInsertRes=await insertWithSelect(fallbackPayload,HISTORY_SELECT);
      data=fallbackInsertRes.data;
      error=fallbackInsertRes.error;
      if(error&&isMissingHistoryRatingColumnsError(error)){
        const fallbackLegacyPayload=stripHistoryRatingFieldsFromPayload(fallbackPayload);
        const fallbackLegacyRes=await insertWithSelect(fallbackLegacyPayload,HISTORY_SELECT_LEGACY);
        data=fallbackLegacyRes.data;
        error=fallbackLegacyRes.error;
        if(data){
          data={...data,...HISTORY_RATING_FIELDS.reduce((acc,field)=>{
            if(entry[field]!==undefined)acc[field]=entry[field];
            return acc;
          },{})};
        }
      }
    }
    if(error){
      setProfileMsg("Could not save match history.");
      return;
    }
    if(data){
      setMatchHistory((prev)=>{
        const next=[data,...prev].slice(0,30);
        if(profileBootstrapCache.userId===userId){
          profileBootstrapCache.history=next;
          profileBootstrapCache.msg="";
          profileBootstrapCache.loaded=true;
        }
        return next;
      });
    }
  },[session]);

  const savePreferredMode=useCallback(async(mode)=>{
    if(!profileHydrated)return;
    const normalized=normalizeModeKey(mode);
    if(normalizeModeKey(profileStats.preferred_mode)===normalized)return;
    await updateProfileStats((prev)=>({...prev,preferred_mode:normalized}));
  },[profileHydrated,profileStats.preferred_mode,updateProfileStats]);

  const handleModeSelect=useCallback((mode,{persist=true}={})=>{
    if(mode==="roadmap"){
      router.push("/roadmap");
      return;
    }
    const normalized=normalizeModeKey(mode);
    router.push(modeToPath(normalized));
    if(persist&&profileHydrated)void savePreferredMode(normalized);
  },[profileHydrated,router,savePreferredMode]);

  const recordPracticeSession=useCallback(async(practiceStats)=>{
    const rounds=practiceStats.hits+practiceStats.misses+practiceStats.penalties;
    if(rounds<=0)return;
    const variant=practiceStats?.variant==="endless"?"endless":"solo";
    const isEndless=variant==="endless";
    const difficultyLevel=Math.round(Number(practiceStats?.difficultyLevel)||1);
    const difficultyMultiplier=getPracticeDifficultyMultiplier(difficultyLevel);
    const accuracy=Math.round((practiceStats.hits/rounds)*100);
    const times=Array.isArray(practiceStats?.times)?practiceStats.times.filter((value)=>Number.isFinite(value)&&value>0):[];
    const avgRtMs=times.length>0?times.reduce((sum,value)=>sum+value,0)/times.length:null;
    const peakRound=isEndless
      ?Math.max(0,Math.round(Number(practiceStats?.peakRound??practiceStats?.hits??0)))
      :null;
    const sessionScore=isEndless
      ?computeEndlessRunScore({
        peakRound,
        avgRtMs,
        bestRtMs:practiceStats.bestTime,
        accuracyPct:accuracy,
        hits:practiceStats.hits,
        rounds,
        misses:practiceStats.misses,
        penalties:practiceStats.penalties,
      })
      :computePracticeSessionScore({
        avgRtMs,
        accuracyPct:accuracy,
        bestRtMs:practiceStats.bestTime,
        hits:practiceStats.hits,
        rounds,
        misses:practiceStats.misses,
        penalties:practiceStats.penalties,
        roundTimeLimitMs:practiceStats?.roundTimeLimitMs,
      });
    let baseDelta=0;
    let tierPenaltyMultiplier=1;
    let effectiveSoloMultiplier=difficultyMultiplier;
    const nextProfile=await updateProfileStats((prev)=>{
      const ratingUpdate=isEndless
        ?computeEndlessRating({
          currentRating:prev.practice_rating,
          sessionScore,
          peakRound,
          avgRtMs,
          hits:practiceStats.hits,
          misses:practiceStats.misses,
          penalties:practiceStats.penalties,
          accuracyPct:accuracy,
        })
        :computePracticeRating({
          currentRating:prev.practice_rating,
          sessionScore,
          avgRtMs,
          hits:practiceStats.hits,
          misses:practiceStats.misses,
          penalties:practiceStats.penalties,
          accuracyPct:accuracy,
          roundTimeLimitMs:practiceStats?.roundTimeLimitMs,
        });
      baseDelta=Number.isFinite(Number(ratingUpdate?.delta))?Math.round(Number(ratingUpdate.delta)):0;
      if(!isEndless){
        tierPenaltyMultiplier=getSoloTierDifficultyPenaltyMultiplier({
          currentRating:prev.practice_rating,
          difficultyLevel,
        });
        effectiveSoloMultiplier=difficultyMultiplier*tierPenaltyMultiplier;
      }
      const finalDelta=isEndless
        ?Math.max(-40,Math.min(65,Math.round(baseDelta)))
        :Math.max(-35,Math.min(55,Math.round(baseDelta*effectiveSoloMultiplier)));
      const nextPracticeRating=Math.max(0,Math.round(Number(prev.practice_rating||0))+finalDelta);
      return{
        ...prev,
        practice_sessions:prev.practice_sessions+1,
        practice_rounds:prev.practice_rounds+rounds,
        practice_hits:prev.practice_hits+practiceStats.hits,
        practice_misses:prev.practice_misses+practiceStats.misses,
        practice_penalties:prev.practice_penalties+practiceStats.penalties,
        practice_best_time:practiceStats.bestTime===null?prev.practice_best_time:prev.practice_best_time===null?practiceStats.bestTime:Math.min(prev.practice_best_time,practiceStats.bestTime),
        practice_best_streak:Math.max(prev.practice_best_streak,practiceStats.bestStreak||0),
        practice_rating:nextPracticeRating,
        practice_peak_rating:Math.max(prev.practice_peak_rating||0,nextPracticeRating),
        practice_tier:getPracticeTier(nextPracticeRating).tier,
      };
    });
    const beforeRating=Math.max(0,Math.round(Number(profileStats.practice_rating)||0));
    const afterRating=Math.max(0,Math.round(Number(nextProfile?.practice_rating||beforeRating)));
    const delta=afterRating-beforeRating;
    await insertMatchHistory({
      mode:isEndless?"endless":"solo",
      outcome:"session",
      score:practiceStats.score||0,
      opponent_score:null,
      rounds:isEndless?Math.max(peakRound||0,rounds):rounds,
      accuracy_pct:accuracy,
      best_time:practiceStats.bestTime??null,
      best_streak:practiceStats.bestStreak||0,
      rating_before:beforeRating,
      rating_after:afterRating,
      rating_delta:delta,
    });
    const beforeTier=getPracticeTier(beforeRating).tier;
    const afterTier=getPracticeTier(afterRating).tier;
    const nextTierInfo=getPracticeNextTier(afterRating);
    return{
      mode:isEndless?"endless":"solo",
      beforeRating,
      afterRating,
      delta,
      baseDelta,
      difficultyMultiplier:isEndless?1:difficultyMultiplier,
      tierPenaltyMultiplier:isEndless?1:tierPenaltyMultiplier,
      effectiveSoloMultiplier:isEndless?1:effectiveSoloMultiplier,
      difficultyLevel:isEndless?null:difficultyLevel,
      roundTimeLimitMs:isEndless?null:(Number.isFinite(Number(practiceStats?.roundTimeLimitMs))?Math.round(Number(practiceStats.roundTimeLimitMs)):null),
      peakRound:isEndless?peakRound:null,
      endedBy:isEndless?(practiceStats?.endedBy||null):null,
      beforeTier,
      afterTier,
      peak:Math.max(Number(nextProfile?.practice_peak_rating||0),afterRating),
      pointsToNext:nextTierInfo?.pointsToNext||0,
      nextTier:nextTierInfo?.next?.tier||null,
      progressPercent:typeof nextTierInfo?.progressPercent==="number"?nextTierInfo.progressPercent:0,
      sessionScore,
    };
  },[insertMatchHistory,profileStats.practice_rating,updateProfileStats]);

  const recordDuelMatch=useCallback(async(result)=>{
    const outcome=result?.outcome==="win"?"win":"loss";
    const isWin=outcome==="win";
    const myScore=Number(result?.myScore||0);
    const oppScore=Number(result?.oppScore||0);
    const beforeRating=Math.max(0,Math.round(Number(profileStats.duel_rating||0)));
    const nextProfile=await updateProfileStats((prev)=>{
      const oppEstimated=Number(result?.oppEstimatedRating);
      const opponentRating=Number.isFinite(oppEstimated)&&oppEstimated>=0?oppEstimated:Math.max(0,Number(prev.duel_rating||0));
      const nextDuelRating=computeDuelRating({
        currentRating:prev.duel_rating,
        opponentRating,
        outcome,
        matchesPlayed:prev.duel_matches,
      }).nextRating;
      return{
        ...prev,
        duel_matches:prev.duel_matches+1,
        duel_wins:prev.duel_wins+(isWin?1:0),
        duel_losses:prev.duel_losses+(!isWin?1:0),
        duel_draws:prev.duel_draws,
        duel_score_for:prev.duel_score_for+myScore,
        duel_score_against:prev.duel_score_against+oppScore,
        duel_best_score:Math.max(prev.duel_best_score,myScore),
        duel_rating:nextDuelRating,
        duel_peak_rating:Math.max(prev.duel_peak_rating||0,nextDuelRating),
        duel_tier:getDuelTier(nextDuelRating).tier,
      };
    });
    const afterRating=Math.max(0,Math.round(Number(nextProfile?.duel_rating||beforeRating)));
    const delta=afterRating-beforeRating;
    await insertMatchHistory({
      mode:"1v1",
      outcome,
      score:myScore,
      opponent_score:oppScore,
      rounds:null,
      accuracy_pct:null,
      best_time:null,
      best_streak:null,
      rating_before:beforeRating,
      rating_after:afterRating,
      rating_delta:delta,
    });
  },[profileStats.duel_rating,updateProfileStats,insertMatchHistory]);

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
    { key: "solo", word: "SOLO", compactIcon: "/practice-icon.png" },
    { key: "1v1", word: "DUEL", compactIconNode: (color)=><CompactDuelIcon color={color} variant={duelIconVariant}/> },
    { key: "wager", word: "WAGER", compactIconNode: (color)=><CompactWagerIcon color={color}/>, persist: false },
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
              <div
                key={item.key}
                onClick={()=>handleModeSelect(item.key,{persist:item.persist!==false})}
                onMouseEnter={()=>setHoveredSidebarKey(item.key)}
                onMouseLeave={()=>setHoveredSidebarKey((prev)=>prev===item.key?null:prev)}
                style={{ 
                color: active ? C.green : C.textMuted, cursor: "pointer",
                transition: "all 0.2s", width: showWideSidebar?"100%":56, height: 40, display: "flex", 
                alignItems: "center", justifyContent: showWideSidebar?"flex-start":"center", borderRadius: 8,
                background: active ? `${C.green}10` : "transparent", position:"relative", overflow:"visible"
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
                {!showWideSidebar&&hoveredSidebarKey===item.key&&(
                  <div style={{
                    position:"absolute",
                    left:62,
                    top:"50%",
                    transform:"translateY(-50%)",
                    background:`linear-gradient(145deg,${C.bgCard},${C.bgAlt})`,
                    color:C.text,
                    border:`1px solid ${C.borderLight}`,
                    borderRadius:8,
                    padding:"6px 10px",
                    fontSize:9,
                    fontWeight:800,
                    letterSpacing:1.1,
                    whiteSpace:"nowrap",
                    zIndex:220,
                    boxShadow:"0 8px 20px rgba(0,0,0,0.4)",
                    pointerEvents:"none",
                  }}>
                    {item.word}
                  </div>
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
        <div
          onClick={()=>handleModeSelect("roadmap",{persist:false})}
          onMouseEnter={()=>setHoveredSidebarKey("roadmap")}
          onMouseLeave={()=>setHoveredSidebarKey((prev)=>prev==="roadmap"?null:prev)}
          style={{
            marginTop:"auto",
            marginBottom:8,
            color:tab==="roadmap"?C.green:C.textMuted,
            cursor:"pointer",
            transition:"all 0.2s",
            width:showWideSidebar?"calc(100% - 16px)":56,
            height:40,
            display:"flex",
            alignItems:"center",
            justifyContent:showWideSidebar?"flex-start":"center",
            borderRadius:8,
            alignSelf:showWideSidebar?"center":"auto",
            background:tab==="roadmap"?`${C.green}10`:"transparent",
            position:"relative",
            overflow:"visible",
            paddingLeft:showWideSidebar?12:0,
          }}
          className="sidebar-item-btn"
        >
          {!showWideSidebar ? (
            <CompactRoadmapIcon color={tab==="roadmap"?C.green:C.textMuted}/>
          ) : (
            <span style={{fontSize:10,fontWeight:900,letterSpacing:1.2,lineHeight:1}}>
              {getSidebarWord("ROADMAP",sidebarWidth)}
            </span>
          )}
          {!showWideSidebar&&hoveredSidebarKey==="roadmap"&&(
            <div style={{
              position:"absolute",
              left:62,
              top:"50%",
              transform:"translateY(-50%)",
              background:`linear-gradient(145deg,${C.bgCard},${C.bgAlt})`,
              color:C.text,
              border:`1px solid ${C.borderLight}`,
              borderRadius:8,
              padding:"6px 10px",
              fontSize:9,
              fontWeight:800,
              letterSpacing:1.1,
              whiteSpace:"nowrap",
              zIndex:220,
              boxShadow:"0 8px 20px rgba(0,0,0,0.4)",
              pointerEvents:"none",
            }}>
              ROADMAP
            </div>
          )}
        </div>
        <div
          ref={logoutTriggerRef}
          onClick={openLogoutWarning}
          onMouseEnter={()=>setHoveredSidebarKey("logout")}
          onMouseLeave={()=>setHoveredSidebarKey((prev)=>prev==="logout"?null:prev)}
          style={{marginTop:0,marginBottom:32,fontSize:18,color:C.textDim,cursor:"pointer",width:showWideSidebar?"calc(100% - 16px)":56,height:40,borderRadius:8,display:"flex",alignItems:"center",justifyContent:showWideSidebar?"flex-start":"center",paddingLeft:showWideSidebar?12:0,alignSelf:showWideSidebar?"center":"auto",background:showLogoutWarning?`${C.orange}12`:"transparent",position:"relative",overflow:"visible"}}
          className="sidebar-item-btn"
        >
          ⏻
          {!showWideSidebar&&hoveredSidebarKey==="logout"&&(
            <div style={{
              position:"absolute",
              left:62,
              top:"50%",
              transform:"translateY(-50%)",
              background:`linear-gradient(145deg,${C.bgCard},${C.bgAlt})`,
              color:C.text,
              border:`1px solid ${C.borderLight}`,
              borderRadius:8,
              padding:"6px 10px",
              fontSize:9,
              fontWeight:800,
              letterSpacing:1.1,
              whiteSpace:"nowrap",
              zIndex:220,
              boxShadow:"0 8px 20px rgba(0,0,0,0.4)",
              pointerEvents:"none",
            }}>
              LOG OUT
            </div>
          )}
        </div>
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
            <span style={{color:C.textMuted}}>USER: {session?.user?.user_metadata?.username || "ANONYMOUS"}</span>
            <span style={{color:C.cyan}}>SOLO: {profileStats.practice_tier} {profileStats.practice_rating}</span>
            <span style={{color:C.blue}}>DUEL: {profileStats.duel_tier} {profileStats.duel_rating}</span>
          </div>
        </div>

        <div style={{flex:1,overflow:"hidden",minHeight:0,position:"relative"}}>
          {tab==="solo"?<PracticeMode startDiff={startDiff} onSessionComplete={recordPracticeSession} onStartDiffChange={setStartDiff} onOpenProfile={()=>handleModeSelect("profile")}/>:tab==="1v1"?<OneVOneMode onMatchComplete={recordDuelMatch} initialJoinCode={duelCode} playerIdentity={session?.user?.id||""}/>:tab==="wager"?<WagerWipTab/>:<ProfileTab session={session} stats={profileStats} history={matchHistory} loading={profileLoading} msg={profileMsg} onRefresh={loadProfileStats}/>}
        </div>
      </main>
      <style>{CSS}</style>
    </div>
  );
}
