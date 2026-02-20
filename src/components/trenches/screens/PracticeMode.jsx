import { useEffect, useRef, useState } from "react";
import { C } from "../config/constants";
import useGameEngine from "../hooks/useGameEngine";
import { GameView, SessionSummary } from "../ui/shared";
function PracticeMode({startDiff=1,onSessionComplete,onStartDiffChange,onOpenProfile}){
  const[screen,setScreen]=useState("menu"); // menu | playing | summary
  const levelCap=startDiff===1?3:10;
  const engine=useGameEngine(startDiff,null,levelCap);
  const summarySavedRef=useRef(false);
  const latestStatsRef=useRef(engine.stats);
  const latestScreenRef=useRef(screen);
  const onSessionCompleteRef=useRef(onSessionComplete);
  const start=()=>{engine.reset();setScreen("playing");};
  const practiceSteps=[
    ["01","Hold HOLSTER 0.8s to arm",C.text],
    ["02","Read signal tweet first",C.text],
    ["03","Tap TX NOW on match",C.green],
    ["04","Traps use partial matches",C.yellow],
    ["05","Any wrong click = miss",C.red],
    ["06","Streaks boost PnL to x3",C.orange]
  ];
  const levelOptions=[1,3,5,7,10];
  useEffect(()=>{latestStatsRef.current=engine.stats;},[engine.stats]);
  useEffect(()=>{latestScreenRef.current=screen;},[screen]);
  useEffect(()=>{onSessionCompleteRef.current=onSessionComplete;},[onSessionComplete]);
  const persistSessionIfNeeded=()=>{
    if(summarySavedRef.current)return;
    const latest=latestStatsRef.current;
    const rounds=(latest?.hits||0)+(latest?.misses||0)+(latest?.penalties||0);
    if(rounds<=0)return;
    summarySavedRef.current=true;
    onSessionCompleteRef.current?.(latest);
  };
  useEffect(()=>{
    if(screen==="menu"){summarySavedRef.current=false;return;}
    if(screen!=="summary"||summarySavedRef.current)return;
    persistSessionIfNeeded();
  },[screen,engine.stats,onSessionComplete]);
  useEffect(()=>()=>{if(latestScreenRef.current==="playing"||latestScreenRef.current==="summary")persistSessionIfNeeded();},[]);
  useEffect(()=>{
    if(screen==="playing"&&levelCap===3&&engine.roundNum>=3){
      setScreen("summary");
    }
  },[screen,levelCap,engine.roundNum]);
  if(screen==="summary")return <SessionSummary stats={engine.stats} history={engine.attemptHistory} onBack={()=>{engine.reset();setScreen("menu");}} onProfile={onOpenProfile}/>;
  if(screen==="menu")return(
    <div className="menu-bg prac-page" style={{minHeight:"100%",height:"100%",justifyContent:"flex-start",overflowY:"auto",overflowX:"hidden",paddingTop:28,paddingBottom:120}}><div className="grid-bg"/>
      <div className="prac-shell" style={{maxWidth:1000,width:"100%",display:"flex",flexDirection:"column",alignItems:"center",position:"relative",zIndex:1}}>
        
        {/* HEADER BLOCK */}
        <div style={{textAlign:"center",marginBottom:44,opacity:0,animation:"slideUp 0.6s ease forwards"}}>
          <div style={{fontSize:10,color:C.green,letterSpacing:5,fontWeight:800,marginBottom:10}}>MISSION // SOLO_SIMULATION</div>
          <h1 style={{fontSize:68,fontWeight:900,letterSpacing:-4,lineHeight:0.85,color:C.text}}>TRENCHES<br/><span style={{color:C.green}}>TRAINER</span></h1>
          <p style={{fontSize:13,color:C.textMuted,marginTop:18,letterSpacing:1,maxWidth:440,margin:"18px auto 0",lineHeight:1.6}}>SHARPEN_REFLEXES. PARSE_SIGNAL. SNIPE_TARGET.</p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:30,width:"100%",marginBottom:44}}>
          {/* OPERATIONAL PROTOCOL */}
          <div className="glass-card" style={{padding:30,background:"rgba(0,0,0,0.6)",display:"flex",flexDirection:"column",opacity:0,animation:"slideUp 0.6s ease 0.1s forwards",height:"100%"}}>
            <div style={{fontSize:9,color:C.textDim,letterSpacing:3,fontWeight:800,marginBottom:24}}>&gt; OPERATIONAL_PROTOCOL</div>
            <div style={{display:"flex",flexDirection:"column",gap:14,flex:1}}>
              {practiceSteps.map(([n,t,c],i)=>(
                <div key={i} style={{display:"flex",gap:14,alignItems:"center"}}>
                  <div style={{width:28,height:28,border:`1px solid ${c}44`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:c,fontWeight:900,flexShrink:0}}>{n}</div>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:500}}>{t.toUpperCase()}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:22,paddingTop:18,borderTop:`1px solid ${C.border}`,fontSize:9,color:C.textDim,letterSpacing:3,textAlign:"center"}}>SPEED_BEATS_HESITATION</div>
          </div>

          {/* SYSTEM CONFIG */}
          <div style={{display:"flex",flexDirection:"column",gap:20,opacity:0,animation:"slideUp 0.6s ease 0.2s forwards",height:"100%"}}>
            <div className="glass-card" style={{flex:1,padding:30,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",textAlign:"center"}}>
              <div style={{fontSize:12,color:C.textDim,letterSpacing:3,fontWeight:800,marginBottom:24}}>&gt; DIFFICULTY</div>
              <div style={{display:"flex",gap:6,marginBottom:28,width:"100%"}}>
                {levelOptions.map((d)=>{
                  const active=startDiff===d;
                  const col=d>=8?C.red:d>=5?C.yellow:C.green;
                  return(
                    <button key={d} onClick={()=>onStartDiffChange?.(d)} style={{flex:1,height:52,border:`1px solid ${active?col:C.border}`,background:active?`${col}10`:"black",color:active?col:C.textDim,fontSize:18,fontWeight:900,cursor:"pointer",transition:"all 0.2s",borderRadius:4}}>
                      {d}
                    </button>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:28,justifyContent:"center",width:"100%"}}>
                <div>
                  <div style={{fontSize:10,color:C.textDim,letterSpacing:2,marginBottom:4}}>MULTIPLIER</div>
                  <div style={{fontSize:28,fontWeight:900,color:C.orange}}>x3.0</div>
                </div>
                <div>
                  <div style={{fontSize:10,color:C.textDim,letterSpacing:2,marginBottom:4}}>ROUND_CAP</div>
                  <div style={{fontSize:28,fontWeight:900,color:C.cyan}}>{levelCap}</div>
                </div>
              </div>
            </div>
            
            <button onClick={start} className="btn-primary btn-green" style={{height:84,fontSize:20,letterSpacing:8,fontWeight:900,boxShadow:`0 0 50px ${C.green}33`,flexShrink:0}}>START NOW



</button>
          </div>
        </div>

      </div>
    </div>);
  return <GameView engine={engine} onExit={()=>setScreen("summary")}/>;
}

export default PracticeMode;
