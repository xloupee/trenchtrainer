import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { C } from "../config/constants";
import useGameEngine from "../hooks/useGameEngine";
import { genCode } from "../lib/gameGen";
import { SFX } from "../lib/sfx";
import { GameView, PerfPanel } from "../ui/shared";
function OneVOneMode({onMatchComplete,initialJoinCode=""}){
  const[phase,setPhase]=useState("lobby");const[gameCode,setGameCode]=useState("");const[joinCode,setJoinCode]=useState("");const[isHost,setIsHost]=useState(false);const[playerName,setPlayerName]=useState("");const[opponentName,setOpponentName]=useState("");const[opponentStats,setOpponentStats]=useState(null);const[matchResult,setMatchResult]=useState(null);
  const[bestOf,setBestOf]=useState(10);const[gameSeed,setGameSeed]=useState(null);const[isPublicLobby,setIsPublicLobby]=useState(true);const[publicLobbies,setPublicLobbies]=useState([]);
  const[countdown,setCountdown]=useState(null);
  const countdownRef=useRef(null);
  const supabaseWarnedRef=useRef(false);const lobbyPollRef=useRef(null);
  const resultSavedRef=useRef(false);
  const autoJoinAttemptRef=useRef("");
  const engine=useGameEngine(1,gameSeed);const pollRef=useRef(null);
  const[playerId]=useState(()=>`player-${Date.now()}-${Math.random().toString(36).slice(2,6)}`);
  const normalizedInitialJoinCode=(initialJoinCode||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);

  const ensureSupabase=useCallback(()=>{
    if(supabase)return true;
    if(!supabaseWarnedRef.current){
      supabaseWarnedRef.current=true;
      alert("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
    }
    return false;
  },[]);
  const parseGameKey=(key)=>{
    const gameMatch=key.match(/^game:([A-Z0-9]{6})$/i);
    if(gameMatch)return{type:"game",code:gameMatch[1].toUpperCase()};
    const statsMatch=key.match(/^game:([A-Z0-9]{6}):(host|guest)-stats$/i);
    if(statsMatch)return{type:"stats",code:statsMatch[1].toUpperCase(),role:statsMatch[2].toLowerCase()};
    return null;
  };
  async function storageSet(k,v){
    if(!ensureSupabase())return;
    const parsed=parseGameKey(k);
    if(!parsed)return;
    if(parsed.type==="game"){
      const payload={
        code:parsed.code,
        host_id:v?.host?.id||null,
        host_name:v?.host?.name||null,
        guest_id:v?.guest?.id||null,
        guest_name:v?.guest?.name||null,
        status:v?.status||"waiting",
        seed:v?.seed||null,
        best_of:v?.bestOf||10,
        is_public:v?.isPublic??false,
      };
      const{error}=await supabase.from("duel_games").upsert(payload,{onConflict:"code"});
      if(error)console.error("supabase storageSet game failed",error);
      return;
    }
    const payload={
      game_code:parsed.code,
      player_role:parsed.role,
      score:v?.score||0,
      streak:v?.streak||0,
      best_time:v?.bestTime||null,
      hits:v?.hits||0,
      misses:v?.misses||0,
      last_time:v?.lastTime||null,
      round_num:v?.roundNum||1,
    };
    const{error}=await supabase.from("duel_game_stats").upsert(payload,{onConflict:"game_code,player_role"});
    if(error)console.error("supabase storageSet stats failed",error);
  }
  async function storageGet(k){
    if(!ensureSupabase())return null;
    const parsed=parseGameKey(k);
    if(!parsed)return null;
    if(parsed.type==="game"){
      const{data,error}=await supabase.from("duel_games").select("*").eq("code",parsed.code).maybeSingle();
      if(error){console.error("supabase storageGet game failed",error);return null;}
      if(!data)return null;
      return{
        code:data.code,
        host:data.host_id&&data.host_name?{id:data.host_id,name:data.host_name}:null,
        guest:data.guest_id&&data.guest_name?{id:data.guest_id,name:data.guest_name}:null,
        status:data.status,
        seed:data.seed,
        bestOf:data.best_of,
        isPublic:data.is_public??false,
      };
    }
    const{data,error}=await supabase.from("duel_game_stats").select("*").eq("game_code",parsed.code).eq("player_role",parsed.role).maybeSingle();
    if(error){console.error("supabase storageGet stats failed",error);return null;}
    if(!data)return null;
    return{
      score:data.score,
      streak:data.streak,
      bestTime:data.best_time,
      hits:data.hits,
      misses:data.misses,
      lastTime:data.last_time,
      roundNum:data.round_num,
    };
  }
  async function storageRemove(k){
    if(!ensureSupabase())return;
    const parsed=parseGameKey(k);
    if(!parsed)return;
    if(parsed.type==="game"){
      const{error:statsError}=await supabase.from("duel_game_stats").delete().eq("game_code",parsed.code);
      if(statsError)console.error("supabase storageRemove stats failed",statsError);
      const{error}=await supabase.from("duel_games").delete().eq("code",parsed.code);
      if(error)console.error("supabase storageRemove game failed",error);
      return;
    }
    const{error}=await supabase.from("duel_game_stats").delete().eq("game_code",parsed.code).eq("player_role",parsed.role);
    if(error)console.error("supabase storageRemove stats row failed",error);
  }

  const fetchPublicLobbies=useCallback(async()=>{
    if(!ensureSupabase())return;
    const{data,error}=await supabase.from("duel_games").select("code,host_id,host_name,best_of,created_at").eq("status","waiting").eq("is_public",true).is("guest_id",null).order("created_at",{ascending:false}).limit(20);
    if(error){console.error("supabase fetch public lobbies failed",error);return;}
    const next=(data||[]).filter(l=>l.host_id!==playerId);
    setPublicLobbies(prev=>{
      if(prev.length===next.length&&prev.every((p,i)=>p.code===next[i]?.code&&p.host_id===next[i]?.host_id&&p.host_name===next[i]?.host_name&&p.best_of===next[i]?.best_of))return prev;
      return next;
    });
  },[ensureSupabase,playerId]);
  const createGame=async()=>{const code=genCode();const name=playerName||"Player 1";const seed=Date.now();await storageSet(`game:${code}`,{code,host:{id:playerId,name},guest:null,status:"waiting",seed,bestOf,isPublic:isPublicLobby});resultSavedRef.current=false;setGameCode(code);setIsHost(true);setGameSeed(seed);setPhase("waiting");startPolling(code);};
  const joinGame=async(explicitCode=null)=>{const code=(explicitCode||joinCode).toUpperCase().trim();if(code.length!==6)return;const game=await storageGet(`game:${code}`);if(!game||game.status!=="waiting"){alert("Game not found or already started.");return;}if(game.host?.id===playerId){alert("You can't join your own lobby.");return;}const name=playerName||"Player 2";game.guest={id:playerId,name};game.status="ready";await storageSet(`game:${code}`,game);resultSavedRef.current=false;setJoinCode(code);setGameCode(code);setIsHost(false);setOpponentName(game.host.name);setGameSeed(game.seed);setBestOf(game.bestOf||10);setIsPublicLobby(!!game.isPublic);setPhase("waiting");startPolling(code);};
  const joinPublicLobby=async(code)=>{await joinGame(code);};
  const resetDuelView=()=>{
    clearInterval(pollRef.current);
    engine.reset();
    resultSavedRef.current=false;
    setPhase("lobby");
    setGameCode("");
    setJoinCode("");
    setOpponentName("");
    setOpponentStats(null);
    setMatchResult(null);
    setCountdown(null);
    countdownRef.current=null;
    setGameSeed(null);
  };
  const cleanupLobby=async(code)=>{
    const normalizedCode=(code||"").toUpperCase().trim();
    if(normalizedCode.length!==6)return;
    const key=`game:${normalizedCode}`;
    const game=await storageGet(key);
    if(!game)return;
    const amHost=game.host?.id===playerId;
    const amGuest=game.guest?.id===playerId;
    if(!amHost&&!amGuest)return;
    if(amHost){
      await storageRemove(key);
      return;
    }
    if(amGuest){
      game.guest=null;
      game.status="waiting";
      await storageSet(key,game);
      await storageRemove(`game:${normalizedCode}:guest-stats`);
    }
  };
  const backToLobby=async({skipCleanup=false}={})=>{
    const leavingCode=gameCode;
    clearInterval(pollRef.current);
    if(!skipCleanup)await cleanupLobby(leavingCode);
    resetDuelView();
  };
  const startPolling=(code)=>{clearInterval(pollRef.current);pollRef.current=setInterval(async()=>{const game=await storageGet(`game:${code}`);if(!game){backToLobby({skipCleanup:true});return;}if(isHost&&game.guest)setOpponentName(game.guest.name);if(!isHost&&game.host)setOpponentName(game.host.name);if(game.seed)setGameSeed(game.seed);if(game.status==="countdown"&&!countdownRef.current){runCountdown();}if(game.status==="playing"&&phase!=="playing"&&!countdownRef.current){setPhase("playing");engine.reset();}const oppKey=isHost?`game:${code}:guest-stats`:`game:${code}:host-stats`;const os=await storageGet(oppKey);if(os)setOpponentStats(os);if(game.status==="finished"){setMatchResult({myScore:engine.stats.score,oppScore:os?os.score:0,win:engine.stats.score>(os?os.score:0)});setPhase("results");clearInterval(pollRef.current);}},800);};

  const runCountdown=()=>{if(countdownRef.current)return;countdownRef.current=true;let n=3;setCountdown(n);SFX.countdown(n);const iv=setInterval(()=>{n--;setCountdown(n);SFX.countdown(n);if(n<=0){clearInterval(iv);setTimeout(()=>{setCountdown(null);countdownRef.current=null;setPhase("playing");engine.reset();},400);}},1000);};

  const startMatch=async()=>{const game=await storageGet(`game:${gameCode}`);if(!game)return;const seed=Date.now();game.status="countdown";game.seed=seed;game.bestOf=bestOf;await storageSet(`game:${gameCode}`,game);setGameSeed(seed);runCountdown();};

  useEffect(()=>{if(phase!=="playing"||!gameCode)return;const iv=setInterval(async()=>{const key=isHost?`game:${gameCode}:host-stats`:`game:${gameCode}:guest-stats`;await storageSet(key,{score:engine.stats.score,streak:engine.stats.streak,bestTime:engine.stats.bestTime,hits:engine.stats.hits,misses:engine.stats.misses,lastTime:engine.stats.lastTime,roundNum:engine.roundNum});},500);return()=>clearInterval(iv);},[phase,gameCode,isHost,engine.stats,engine.roundNum]);
  const endMatch=async()=>{const game=await storageGet(`game:${gameCode}`);if(game){game.status="finished";await storageSet(`game:${gameCode}`,game);}setPhase("results");clearInterval(pollRef.current);const oppKey=isHost?`game:${gameCode}:guest-stats`:`game:${gameCode}:host-stats`;const os=await storageGet(oppKey);setMatchResult({myScore:engine.stats.score,oppScore:os?os.score:0,win:engine.stats.score>(os?os.score:0)});};
  useEffect(()=>{if(phase!=="lobby"){clearInterval(lobbyPollRef.current);return;}fetchPublicLobbies();lobbyPollRef.current=setInterval(fetchPublicLobbies,5000);return()=>clearInterval(lobbyPollRef.current);},[phase,fetchPublicLobbies]);
  useEffect(()=>()=>clearInterval(pollRef.current),[]);
  useEffect(()=>()=>clearInterval(lobbyPollRef.current),[]);
  useEffect(()=>{
    if(normalizedInitialJoinCode.length!==6){
      autoJoinAttemptRef.current="";
      return;
    }
    if(phase!=="lobby")return;
    setJoinCode(normalizedInitialJoinCode);
    if(autoJoinAttemptRef.current===normalizedInitialJoinCode)return;
    autoJoinAttemptRef.current=normalizedInitialJoinCode;
    void joinGame(normalizedInitialJoinCode);
  },[phase,normalizedInitialJoinCode]);
  useEffect(()=>{
    if(phase!=="results"||!matchResult||resultSavedRef.current)return;
    resultSavedRef.current=true;
    onMatchComplete?.(matchResult);
  },[phase,matchResult,onMatchComplete]);

  // Countdown overlay
  if(countdown!==null)return(
    <div className="menu-bg"><div className="grid-bg"/><div style={{position:"relative",zIndex:1,textAlign:"center"}}>
      <div style={{fontSize:countdown===0?72:120,fontWeight:900,color:countdown===0?C.green:C.text,textShadow:countdown===0?`0 0 40px ${C.green}40`:"none",animation:"countPop 0.8s ease",fontFamily:"var(--mono)"}}>{countdown===0?"GO!":countdown}</div>
    </div></div>);

  if(phase==="lobby")return(
    <div className="menu-bg prac-page" style={{paddingTop:40}}><div className="grid-bg"/>
      <div className="prac-shell" style={{display:"grid",gridTemplateAreas:"'head head' 'form join' 'public public'",gridTemplateColumns:"1fr 1fr",gap:16,maxWidth:1000,width:"100%"}}>
        
        {/* HEADER */}
        <div style={{gridArea:"head",display:"flex",alignItems:"baseline",gap:16,marginBottom:12}}>
          <h1 style={{fontSize:42,fontWeight:900,letterSpacing:-2,color:C.orange}}>COMBAT_LOBBY</h1>
          <span style={{fontSize:10,color:C.textDim,letterSpacing:4}}>ARENA_v3.0_LIVE</span>
        </div>

        {/* AGENT CONFIG */}
        <div className="glass-card" style={{gridArea:"form",padding:28,display:"flex",flexDirection:"column",height:"100%"}}>
          <div style={{fontSize:9,color:C.orange,letterSpacing:2,fontWeight:800,marginBottom:20}}>&gt; AGENT_CONFIG</div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:8,color:C.textDim,letterSpacing:2,marginBottom:8}}>AGENT_NAME</div>
            <input value={playerName} onChange={e=>setPlayerName(e.target.value)} placeholder="ENTER_CALLSIGN..." className="input-field" style={{height:44,fontSize:13}}/>
          </div>
          <div style={{marginBottom:20,flex:1}}>
            <div style={{fontSize:8,color:C.textDim,letterSpacing:2,marginBottom:8}}>MATCH_FORMAT</div>
            <div style={{display:"flex",gap:6}}>
              {[5,10,20].map(n=>{
                const active=bestOf===n;
                return(<button key={n} onClick={()=>setBestOf(n)} style={{flex:1,padding:"10px 0",borderRadius:6,border:`1px solid ${active?C.orange:C.border}`,background:active?`${C.orange}10`:"black",color:active?C.orange:C.textDim,fontSize:11,fontWeight:active?900:600,fontFamily:"var(--mono)",cursor:"pointer"}}>BO_{n}</button>);
              })}
            </div>
          </div>
          <button onClick={createGame} className="btn-primary btn-orange" style={{padding:"14px",fontSize:12,fontWeight:900,marginTop:"auto"}}>CREATE_NEW_ROOM</button>
        </div>

        {/* JOIN BY CODE */}
        <div className="glass-card" style={{gridArea:"join",padding:28,display:"flex",flexDirection:"column",justifyContent:"center",height:"100%"}}>
          <div style={{fontSize:9,color:C.cyan,letterSpacing:2,fontWeight:800,marginBottom:20}}>&gt; DIRECT_ACCESS</div>
          <div style={{display:"flex",gap:10,alignItems:"stretch",marginBottom:"auto",marginTop:"auto"}}>
            <input
              value={joinCode}
              onChange={e=>setJoinCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              maxLength={6}
              className="input-field"
              style={{flex:1,textAlign:"center",fontSize:24,fontWeight:900,letterSpacing:6,height:56,background:"black"}}
            />
            <button onClick={()=>joinGame()} className="btn-primary btn-blue" style={{width:100,padding:0,fontSize:12,fontWeight:900}}>JOIN</button>
          </div>
          <div style={{fontSize:9,color:C.textDim,marginTop:16,textAlign:"center"}}>ENTER 6-DIGIT COMBAT CODE</div>
        </div>

        {/* PUBLIC LOBBIES */}
        <div className="glass-card" style={{gridArea:"public",padding:24}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div style={{fontSize:9,color:C.green,letterSpacing:2,fontWeight:800}}>&gt; ACTIVE_TRANSMISSIONS</div>
            <button onClick={fetchPublicLobbies} className="btn-ghost" style={{fontSize:9,padding:"6px 12px"}}>SYNC_LIST</button>
          </div>
          {publicLobbies.length===0 ? (
            <div style={{padding:"40px",textAlign:"center",border:`1px dashed ${C.border}`,borderRadius:8,color:C.textGhost,fontSize:11}}>NO_ACTIVE_LOBBIES_DETECTED</div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12,maxHeight:300,overflowY:"auto",paddingRight:4}}>
              {publicLobbies.map((l)=>(
                <div key={l.code} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",border:`1px solid ${C.border}`,borderRadius:8,background:"black"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:C.text}}>{l.host_name||"UNKNOWN_AGENT"}</div>
                    <div style={{fontSize:9,color:C.textDim,marginTop:4}}>CODE: {l.code} • BO_{l.best_of}</div>
                  </div>
                  <button onClick={()=>joinPublicLobby(l.code)} className="btn-primary btn-green" style={{width:"auto",padding:"8px 16px",fontSize:10,fontWeight:900}}>ENGAGE</button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>);

  if(phase==="waiting")return(
    <div className="menu-bg prac-page"><div className="grid-bg"/>
      <div className="prac-shell" style={{maxWidth:600,width:"100%",display:"flex",flexDirection:"column",alignItems:"center",position:"relative",zIndex:1}}>
        <div style={{fontSize:11,color:C.orange,letterSpacing:6,fontWeight:800,marginBottom:32}}>// STANDBY_MODE</div>
        <div className="glass-card" style={{width:"100%",padding:40,textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:10,color:C.textDim,letterSpacing:3,marginBottom:16}}>ACCESS_CODE</div>
          <div style={{fontSize:64,fontWeight:900,letterSpacing:12,color:C.orange,lineHeight:1}}>{gameCode}</div>
          <div style={{fontSize:11,color:C.textMuted,marginTop:24}}>TRANSMIT THIS CODE TO YOUR OPPONENT</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,width:"100%",marginBottom:32}}>
          <div className="glass-card" style={{padding:24,textAlign:"center",borderColor:`${C.green}44`}}>
            <div style={{fontSize:8,color:C.green,letterSpacing:2,marginBottom:8}}>LOCAL_AGENT</div>
            <div style={{fontSize:16,fontWeight:900}}>{playerName||"YOU"}</div>
            <div style={{fontSize:10,color:C.green,marginTop:8}}>READY_ONLINE</div>
          </div>
          <div className="glass-card" style={{padding:24,textAlign:"center",borderColor:opponentName?`${C.green}44`:`${C.red}44`}}>
            <div style={{fontSize:8,color:opponentName?C.green:C.red,letterSpacing:2,marginBottom:8}}>REMOTE_AGENT</div>
            <div style={{fontSize:16,fontWeight:900}}>{opponentName||"SEARCHING..."}</div>
            <div style={{fontSize:10,color:opponentName?C.green:C.red,marginTop:8}}>{opponentName?"LINK_ESTABLISHED":"WAITING_FOR_SIGNAL"}</div>
          </div>
        </div>
        {isHost&&opponentName&&<button onClick={startMatch} className="btn-primary btn-orange" style={{padding:"20px",fontSize:16,fontWeight:900,letterSpacing:4,width:"100%"}}>ENGAGE_COMBAT_&gt;</button>}
        <button onClick={backToLobby} className="btn-ghost" style={{marginTop:24}}>ABORT_MISSION</button>
      </div>
    </div>);

  if(phase==="results"&&matchResult)return(
    <div className="menu-bg prac-page"><div className="grid-bg"/>
      <div className="prac-shell" style={{maxWidth:600,width:"100%",display:"flex",flexDirection:"column",alignItems:"center",position:"relative",zIndex:1}}>
        <div style={{fontSize:11,color:matchResult.win?C.green:C.red,letterSpacing:6,fontWeight:800,marginBottom:32}}>// POST_COMBAT_REPORT</div>
        <div style={{fontSize:80,marginBottom:20}}>{matchResult.win?"🏆":"💀"}</div>
        <h2 style={{fontSize:48,fontWeight:900,color:matchResult.win?C.green:C.red,letterSpacing:-2,marginBottom:8}}>{matchResult.win?"VICTORY":"DEFEAT"}</h2>
        <div style={{fontSize:11,color:C.textDim,letterSpacing:4,marginBottom:40}}>MISSION_OBJECTIVE_COMPLETED</div>
        
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,width:"100%",marginBottom:40}}>
          <div className="glass-card" style={{padding:32,textAlign:"center"}}>
            <div style={{fontSize:8,color:C.textDim,letterSpacing:2,marginBottom:8}}>LOCAL_SCORE</div>
            <div style={{fontSize:42,fontWeight:900,color:C.text}}>{matchResult.myScore}</div>
          </div>
          <div className="glass-card" style={{padding:32,textAlign:"center"}}>
            <div style={{fontSize:8,color:C.textDim,letterSpacing:2,marginBottom:8}}>REMOTE_SCORE</div>
            <div style={{fontSize:42,fontWeight:900,color:C.text}}>{matchResult.oppScore}</div>
          </div>
        </div>
        
        <button onClick={backToLobby} className="btn-primary btn-green" style={{padding:"20px",fontSize:14,fontWeight:900,letterSpacing:2,width:"100%"}}>RETURN_TO_LOBBY</button>
      </div>
    </div>);

  const oppPanel=(<div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}><div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}><div style={{fontSize:8.5,color:C.orange,letterSpacing:2.5,marginBottom:10,fontWeight:700}}>OPPONENT — {opponentName||"..."}</div>{opponentStats?(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[["SCORE",`${opponentStats.score}`,opponentStats.score>engine.stats.score?C.red:C.textDim],["STREAK",`${opponentStats.streak||"—"}`,opponentStats.streak>=4?C.yellow:C.textDim],["BEST",opponentStats.bestTime?`${(opponentStats.bestTime/1000).toFixed(2)}s`:"—",C.orange],["LAST",opponentStats.lastTime?`${(opponentStats.lastTime/1000).toFixed(2)}s`:"—",C.blue]].map(([l,v,c])=>(<div key={l} style={{padding:"6px 9px",borderRadius:6,background:C.bgCard,border:`1px solid ${C.border}`}}><div style={{fontSize:7,color:C.textDim,letterSpacing:2,marginBottom:2}}>{l}</div><div style={{fontSize:13,fontWeight:800,color:c,fontFamily:"var(--mono)"}}>{v}</div></div>))}</div>):(<div style={{fontSize:10,color:C.textGhost,animation:"pulse 2s ease-in-out infinite"}}>Syncing...</div>)}</div><div style={{height:1,background:C.border,flexShrink:0}}/><PerfPanel stats={engine.stats} history={engine.attemptHistory}/></div>);

  return <GameView engine={engine} onExit={endMatch} rightPanel={oppPanel}/>;
}

export default OneVOneMode;
