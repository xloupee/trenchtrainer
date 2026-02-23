import { useCallback, useEffect, useRef, useState } from "react";
import { C } from "../config/constants";
import { getRC } from "../lib/rank";
import { getPracticeSessionTier, getPracticeTier } from "../lib/practiceRank";

const SOLO_TIMER_LIMIT_MS = 15000;
function HudStat({label,value,color,large}){return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"0 8px",gap:2}}><span style={{fontSize:7,fontWeight:500,color:C.textDim,letterSpacing:2.5,textTransform:"uppercase"}}>{label}</span><span style={{fontSize:large?20:13,fontWeight:800,color:color||C.text,fontFamily:"var(--mono)",textShadow:large?`0 0 14px ${color}25`:"none",transition:"all 0.2s"}}>{value}</span></div>);}

function ElapsedTimer({startTime,running,mode="elapsed",limitMs=15000,label}){const[el,setEl]=useState(0);const raf=useRef(null);useEffect(()=>{if(!startTime){setEl(0);return;}if(!running){setEl(Date.now()-startTime);return;}const tick=()=>{setEl(Date.now()-startTime);raf.current=requestAnimationFrame(tick);};raf.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf.current);},[startTime,running]);const normalizedLimit=Number.isFinite(limitMs)&&limitMs>0?limitMs:15000;const isCountdown=mode==="countdown";const shownMs=isCountdown?Math.max(0,normalizedLimit-el):Math.max(0,el);const s=shownMs/1000;const progress=isCountdown?Math.max(0,Math.min(1,shownMs/normalizedLimit)):Math.max(0,Math.min(1,(el/10000)));const col=isCountdown?(s>10?C.green:s>7?C.greenBright:s>4?C.yellow:s>2?C.orange:C.red):(s<1?C.green:s<2?C.greenBright:s<3?C.yellow:s<5?C.orange:C.red);const timerLabel=label||(isCountdown?"TIME LEFT":"ELAPSED");return(<div style={{display:"flex",alignItems:"center",gap:7}}><div style={{position:"relative",width:40,height:40,flexShrink:0}}><svg width={40} height={40} style={{transform:"rotate(-90deg)"}}><circle cx={20} cy={20} r={17} fill="none" stroke={C.border} strokeWidth={2}/><circle cx={20} cy={20} r={17} fill="none" stroke={col} strokeWidth={2} strokeDasharray={`${progress*106.8} 106.8`} strokeLinecap="round" style={{transition:"stroke 0.3s",filter:`drop-shadow(0 0 4px ${col}40)`}}/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:col,fontFamily:"var(--mono)"}}>{s.toFixed(1)}</div></div><div><div style={{fontSize:7,color:C.textDim,letterSpacing:2}}>{timerLabel}</div><div style={{fontSize:12,fontWeight:800,color:col,fontFamily:"var(--mono)",transition:"color 0.3s"}}>{s.toFixed(2)}s</div></div></div>);}

/* avatar color from name string */
const avatarGrad=(name)=>{let h=0;for(let i=0;i<name.length;i++)h=name.charCodeAt(i)+((h<<5)-h);const hue=Math.abs(h)%360;return`linear-gradient(135deg,hsl(${hue},55%,45%),hsl(${(hue+40)%360},50%,35%))`;};
const VerifiedBadge=({color="#4299e1"})=>(<svg width="14" height="14" viewBox="0 0 24 24" fill={color} style={{flexShrink:0}}><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.74 4.2L7.01 12.7l1.41-1.41 2.09 2.09 5.09-5.09 1.41 1.41-6.5 6.5z"/></svg>);
/* fake media thumbnail — gradient with play button or image icon */
function MediaThumb({media}){
  const isVid=media&&media.type==="video";
  return(<div style={{width:"100%",borderRadius:10,overflow:"hidden",marginTop:8,border:`1px solid ${C.border}`,background:`linear-gradient(145deg,#1a1f2e,#141824)`,position:"relative",height:isVid?160:120}}>
    {/* fake visual noise */}
    <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 40% 50%,rgba(72,187,120,0.04) 0%,transparent 60%)`}}/>
    <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 70% 30%,rgba(99,179,237,0.03) 0%,transparent 50%)`}}/>
    {/* figure silhouette */}
    <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:60,height:80,borderRadius:"30px 30px 0 0",background:"rgba(255,255,255,0.03)"}}/>
    <div style={{position:"absolute",bottom:80,left:"50%",transform:"translateX(-50%)",width:30,height:30,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
    {isVid&&<>
      {/* play button */}
      <div style={{position:"absolute",bottom:10,left:10,display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:0,height:0,borderStyle:"solid",borderWidth:"5px 0 5px 9px",borderColor:`transparent transparent transparent ${C.text}`,marginLeft:2}}/>
        </div>
        <span style={{fontSize:11,color:C.text,fontWeight:600,fontFamily:"var(--mono)"}}>{media.dur||"0:30"}</span>
      </div>
      {/* volume + expand icons */}
      <div style={{position:"absolute",bottom:12,right:10,display:"flex",gap:8}}>
        <span style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}>🔊</span>
        <span style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>⛶</span>
      </div>
    </>}
  </div>);
}

function XTweet({data,isSignal,animDelay=0}){
  const verified=isSignal||data.verified;
  return(<div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,opacity:0,animation:`slideUp 0.35s ease ${animDelay}ms forwards`,position:"relative"}}>
    {isSignal&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:2,background:`linear-gradient(180deg,${C.green},transparent)`,borderRadius:1}}/>}
    <div style={{display:"flex",gap:10}}>
      {/* Avatar */}
      <div style={{width:40,height:40,borderRadius:"50%",flexShrink:0,background:isSignal?`linear-gradient(135deg,${C.green},${C.greenDim})`:avatarGrad(data.user),display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"rgba(255,255,255,0.85)",letterSpacing:-0.5}}>{data.user.slice(0,2).toUpperCase()}</div>
      <div style={{flex:1,minWidth:0}}>
        {/* Name row */}
        <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:1}}>
          <span style={{color:C.text,fontWeight:700,fontSize:13}}>{data.user}</span>
          {verified&&<VerifiedBadge color={isSignal?"#ecc94b":"#4299e1"}/>}
          <span style={{color:C.textDim,fontSize:10.5}}>{data.handle}</span>
          <span style={{color:C.textDim,fontSize:10.5}}>·{data.time}</span>
          <div style={{flex:1}}/>
          <span style={{color:C.textGhost,fontSize:12,cursor:"pointer",opacity:0.6}}>↩</span>
        </div>
        {/* Reply to */}
        {data.reply&&<div style={{fontSize:10,color:C.blue,marginBottom:3}}>Replying to <span style={{fontWeight:600}}>{data.reply}</span></div>}
        {/* Tweet text */}
        <div style={{color:isSignal?C.text:"#9badc4",fontSize:12.5,lineHeight:1.55,whiteSpace:"pre-line",marginBottom:2}}>{data.text}</div>
        {/* Warning */}
        {data.warn&&<div style={{marginTop:6,padding:"5px 9px",background:"rgba(236,201,75,0.05)",border:`1px solid rgba(236,201,75,0.12)`,borderRadius:8,fontSize:9.5,color:C.yellow}}>⚠️ Security Warning</div>}
        {/* Inline media */}
        {data.media&&!data.quote&&<MediaThumb media={data.media}/>}
        {/* Quote tweet embed */}
        {data.quote&&<div style={{marginTop:8,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 12px",background:C.bgAlt}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:avatarGrad(data.quote.user),display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"rgba(255,255,255,0.85)",flexShrink:0}}>{data.quote.user.slice(0,2).toUpperCase()}</div>
            <span style={{color:C.text,fontWeight:700,fontSize:11}}>{data.quote.user}</span>
            {data.quote.verified&&<VerifiedBadge color="#4299e1"/>}
            <span style={{color:C.textDim,fontSize:9.5}}>{data.quote.handle}</span>
            <span style={{color:C.textDim,fontSize:9.5}}>·{data.quote.time}</span>
          </div>
          <div style={{color:"#8a9bb8",fontSize:11.5,lineHeight:1.5,whiteSpace:"pre-line"}}>{data.quote.text}</div>
          {data.quote.media&&<MediaThumb media={data.quote.media}/>}
        </div>}
      </div>
    </div>
  </div>);
}

function TokenRow({coin,onBuy,spawned,revealed,clickedId,showCorrect}){
  const wc=clickedId===coin.id,iw=wc&&!coin.isCorrect;
  const isRevealCorrect=showCorrect&&revealed&&coin.isCorrect;
  let bl="transparent",bg="transparent";if(iw){bl=C.red;bg="rgba(245,101,101,0.03)";}else if(isRevealCorrect){bl=C.green;bg="rgba(72,187,120,0.04)";}
  const ia=!revealed,sb=!revealed;
  const buyBtnStyle=(active,isMain)=>({display:"flex",alignItems:"center",justifyContent:"center",gap:3,padding:"0",background:"transparent",border:"none",color:active&&isMain?C.green:C.textDim,fontSize:active&&isMain?11:10,fontWeight:active&&isMain?800:600,cursor:active&&isMain?"pointer":"default",fontFamily:"var(--mono)",width:"100%",height:"100%",transition:"all 0.12s"});

  return(<div style={{display:"flex",alignItems:"flex-start",padding:"8px 8px",borderBottom:`1px solid ${C.border}`,borderLeft:`2px solid ${bl}`,background:bg,opacity:spawned?1:0,maxHeight:spawned?200:0,transform:spawned?"none":"translateY(-8px)",transition:"opacity 0.3s,transform 0.3s,max-height 0.3s",minHeight:spawned?86:0,overflow:"hidden",gap:8}}>
    {/* Avatar */}
    <div style={{width:50,height:50,borderRadius:10,background:`linear-gradient(145deg,${C.bgElevated},${C.bgCard})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0,border:`1px solid ${isRevealCorrect?C.green:C.border}`,position:"relative",boxShadow:isRevealCorrect?`0 0 14px ${C.green}30`:"none",transition:"all 0.3s"}}>
      {coin.emoji}
      {isRevealCorrect&&<div style={{position:"absolute",top:-3,right:-3,width:16,height:16,borderRadius:"50%",background:C.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:C.bg,fontWeight:900}}>✓</div>}
      {!isRevealCorrect&&<div style={{position:"absolute",bottom:-2,right:-2,width:14,height:14,borderRadius:"50%",background:C.bgAlt,border:`1.5px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:6,color:C.green}}>●</span></div>}
    </div>

    {/* Info */}
    <div style={{flex:1,minWidth:0}}>
      {/* Row 1: Ticker + Name */}
      <div style={{display:"flex",alignItems:"baseline",gap:5,marginBottom:2}}>
        <span style={{fontWeight:900,fontSize:13.5,color:iw?C.red:isRevealCorrect?C.green:C.text,letterSpacing:-0.3}}>{coin.name.length>8?coin.name.slice(0,8):coin.name}</span>
        <span style={{color:C.textMuted,fontSize:10.5,fontWeight:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{coin.name}</span>
        {isRevealCorrect&&<span style={{fontSize:7.5,color:C.green,fontWeight:800,letterSpacing:1.5,animation:"blink 1s infinite"}}>← CORRECT</span>}
      </div>
      {/* Row 2: Age + socials + holders */}
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2,flexWrap:"wrap"}}>
        <span style={{color:C.cyan,fontSize:10,fontWeight:600}}>{coin.age}</span>
        <div style={{display:"flex",gap:3,alignItems:"center"}}>
          {coin.socials.web&&<span style={{color:C.cyan,fontSize:9}}>🏠</span>}
          <span style={{color:C.cyan,fontSize:9}}>🔗</span>
          <span style={{color:C.textDim,fontSize:9}}>💬</span>
          <span style={{color:C.textDim,fontSize:9}}>🔍</span>
        </div>
        <span style={{color:C.textDim,fontSize:9.5}}>↻{coin.holders}</span>
      </div>
      {/* Row 3: Address */}
      <div style={{color:C.textGhost,fontSize:9,marginBottom:3,letterSpacing:0.3}}>{coin.addr}</div>
      {/* Row 4: Dev stats */}
      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:9,flexWrap:"wrap"}}>
        <span style={{color:parseInt(coin.devPct)>15?C.red:C.textDim}}>👤 {coin.devPct}</span>
        <span style={{color:C.textDim}}>⟳ {coin.top10}</span>
        {coin.hasDS&&<span style={{color:C.cyan,fontSize:8.5}}>DS</span>}
        <span style={{color:C.textDim}}>{coin.devAge}</span>
        <span style={{color:C.textDim}}>{coin.buySell}</span>
      </div>
    </div>

    {/* TX button */}
    <div style={{display:"flex",gap:4,flexShrink:0}}>
      <div style={{width:108,height:64,borderRadius:6,background:C.bgCard,border:`1px solid ${ia&&sb?C.borderLight:C.border}`,display:"flex",flexDirection:"column",overflow:"hidden",transition:"border-color 0.2s"}}>
        <div style={{flex:1}}/>
        {sb?(<button onClick={e=>onBuy(coin,e)} style={buyBtnStyle(ia,true)}>
          <><span style={{color:C.yellow,fontSize:9}}>⚡</span> TX NOW</>
        </button>):(<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:3,color:C.textDim,fontSize:10,height:"100%"}}><span style={{color:C.yellow,fontSize:9}}>⚡</span> 3.30</div>)}
      </div>
    </div>

    {/* V / MC */}
    <div style={{textAlign:"right",minWidth:55,paddingTop:0,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:3}}>
        <span style={{color:C.textDim,fontSize:8.5}}>V</span>
        <span style={{color:C.text,fontSize:12,fontWeight:800}}>{coin.vol}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:3,marginTop:3}}>
        <span style={{color:C.textDim,fontSize:8.5}}>MC</span>
        <span style={{color:C.text,fontSize:11,fontWeight:700}}>{coin.mcap}</span>
      </div>
    </div>
  </div>);
}

function PerfPanel({stats,history,roundTimeLimitMs=null}){const avg=stats.times.length>0?stats.times.reduce((a,b)=>a+b,0)/stats.times.length:null;const rounds=stats.hits+stats.misses+stats.penalties;const acc=rounds>0?Math.round((stats.hits/rounds)*100):0;const rank=rounds===0?getPracticeTier(0):getPracticeSessionTier({avgRtMs:avg,accuracyPct:acc,bestRtMs:stats.bestTime,hits:stats.hits,misses:stats.misses,penalties:stats.penalties,rounds,roundTimeLimitMs});const rankGlow=rank.tier!=="UNRANKED"?`0 0 16px ${rank.color}35`:"none";const tl=(history||[]).slice(-15);return(<div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"16px 16px 12px",flexShrink:0}}><div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 22px",borderRadius:12,background:`linear-gradient(145deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${rank.color}20`,boxShadow:rank.tier!=="UNRANKED"?`${rankGlow},inset 0 1px 0 rgba(255,255,255,0.02)`:"inset 0 1px 0 rgba(255,255,255,0.02)",transition:"all 0.4s"}}><span style={{fontSize:24,color:rank.color,filter:rank.tier!=="UNRANKED"?`drop-shadow(0 0 10px ${rank.color}50)`:"none",transition:"filter 0.4s"}}>{rank.icon}</span><div><div style={{fontSize:12.5,fontWeight:900,color:rank.color,letterSpacing:2.5,transition:"color 0.3s"}}>{rank.tier}</div><div style={{fontSize:8.5,color:C.textDim,marginTop:2}}>{avg!==null?`avg ${(avg/1000).toFixed(3)}s • acc ${acc}% • net ${stats.score}`:"no data yet"}</div></div></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"0 16px 12px",flexShrink:0}}>{[["SESSION",`${stats.score}`,stats.score>0?C.green:C.textDim],["ACCURACY",`${acc}%`,acc>=80?C.green:acc>=50?C.yellow:C.red],["BEST RT",stats.bestTime!==null?`${(stats.bestTime/1000).toFixed(3)}s`:"—",C.cyan],["STREAK",stats.streak>0?`${stats.streak}`:"—",stats.streak>=8?C.orange:stats.streak>=4?C.yellow:C.textDim]].map(([l,v,c])=>(<div key={l} style={{padding:"8px 10px",borderRadius:8,background:`linear-gradient(145deg,${C.bgCard},${C.bg})`,border:`1px solid ${C.border}`,boxShadow:`inset 0 1px 0 rgba(255,255,255,0.015),0 2px 8px rgba(0,0,0,0.15)`,position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:`linear-gradient(90deg,transparent,${c}30,transparent)`}}/><div style={{fontSize:7,color:C.textDim,letterSpacing:2.5,marginBottom:3}}>{l}</div><div style={{fontSize:14,fontWeight:800,color:c,fontFamily:"var(--mono)",transition:"color 0.2s"}}>{v}</div></div>))}</div><div style={{height:1,background:`linear-gradient(90deg,transparent,${C.border},transparent)`,margin:"0 16px",flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 16px",minHeight:0,overflow:"hidden"}}><div style={{fontSize:7.5,color:C.textDim,letterSpacing:2.5,marginBottom:10,flexShrink:0}}>REACTION TIMELINE</div>{tl.length===0?(<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:9,color:C.textGhost,textAlign:"center",lineHeight:1.6}}>Attempts appear here<br/>as you play</div></div>):(<div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>{tl.map((e,i)=>{const im=e.type==="miss"||e.type==="penalty"||e.type==="wrong"||e.type==="timeout";const col=im?C.red:getRC(e.rt);const lb=im?(e.type==="penalty"?"EARLY":e.type==="timeout"?"TIMEOUT":"MISS"):`${(e.rt/1000).toFixed(2)}s`;const il=i===tl.length-1;return(<div key={e.id||i} style={{display:"flex",alignItems:"center",gap:8,opacity:il?1:.5+(i/tl.length)*.5,animation:il?"slideUp 0.3s ease forwards":"none"}}><span style={{fontSize:8,color:C.textGhost,width:18,textAlign:"right",flexShrink:0,fontFamily:"var(--mono)"}}>{e.round||i+1}</span><div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3.5px 10px",borderRadius:12,background:`${col}0a`,border:`1px solid ${col}20`}}><div style={{width:5,height:5,borderRadius:"50%",background:col,flexShrink:0,boxShadow:il?`0 0 8px ${col}50`:"none"}}/><span style={{fontSize:10.5,fontWeight:700,color:col,fontFamily:"var(--mono)"}}>{lb}</span></div>{!im&&e.rt&&<div style={{flex:1,height:3,background:C.border,borderRadius:2,overflow:"hidden",minWidth:20}}><div style={{height:"100%",borderRadius:2,background:`linear-gradient(90deg,${col},${col}60)`,width:`${Math.max(5,Math.min(100,(1-e.rt/3000)*100))}%`,opacity:.6}}/></div>}</div>);})}</div>)}</div><div style={{padding:"8px 16px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"center",gap:16,fontSize:8.5,color:C.textDim,flexShrink:0}}><span>H {stats.hits}</span><span>M {stats.misses}</span><span>E {stats.penalties}</span></div></div>);}

/* ═══════════════════════════════════════════
   SESSION SUMMARY
═══════════════════════════════════════════ */
function SessionSummary({stats,onBack,onProfile,onPlayAgain,rankImpact=null}){
  const [isWideSummary,setIsWideSummary]=useState(false);
  useEffect(()=>{
    if(typeof window==="undefined")return;
    const media=window.matchMedia("(min-width: 1024px)");
    const sync=()=>setIsWideSummary(media.matches);
    sync();
    if(typeof media.addEventListener==="function"){
      media.addEventListener("change",sync);
      return()=>media.removeEventListener("change",sync);
    }
    media.addListener(sync);
    return()=>media.removeListener(sync);
  },[]);
  const avg=stats.times.length>0?stats.times.reduce((a,b)=>a+b,0)/stats.times.length:null;
  const rounds=stats.hits+stats.misses+stats.penalties;
  const acc=rounds>0?Math.round((stats.hits/rounds)*100):0;
  const rank=getPracticeSessionTier({avgRtMs:avg,accuracyPct:acc,bestRtMs:stats.bestTime,hits:stats.hits,misses:stats.misses,penalties:stats.penalties,rounds,roundTimeLimitMs:isEndlessImpact?null:Number(rankImpact?.roundTimeLimitMs||SOLO_TIMER_LIMIT_MS)});
  const isEndlessImpact=rankImpact?.mode==="endless";
  const hasDifficultyBonus=rankImpact?.mode==="solo"&&Number.isFinite(Number(rankImpact?.difficultyMultiplier))&&Number.isFinite(Number(rankImpact?.delta));
  const difficultyMultiplier=Number(rankImpact?.difficultyMultiplier||1);
  const finalDelta=Number(rankImpact?.delta||0);
  const progressPercent=Math.round(Math.max(0,Math.min(100,Number(rankImpact?.progressPercent)||0)));
  const avgLabel=avg!==null?`${(avg/1000).toFixed(3)}s`:"—";
  const endlessEndReasonMap={
    miss:"WRONG CLICK",
    timeout:"TIMEOUT",
    exit:"MANUAL EXIT",
  };
  const metricCards=isEndlessImpact
    ?[
      ["ROUNDS",Number(rankImpact?.peakRound||stats.hits||0),C.cyan],
      ["FASTEST",stats.bestTime!==null?`${(stats.bestTime/1000).toFixed(3)}s`:"—",C.cyan],
    ]
    :[
      ["SCORE",stats.score,C.green],
      ["ACCURACY",`${acc}%`,acc>=80?C.green:acc>=50?C.yellow:C.red],
      ["FASTEST",stats.bestTime!==null?`${(stats.bestTime/1000).toFixed(3)}s`:"—",C.cyan],
      ["MISSES",stats.misses+stats.penalties,C.red],
    ];
  const summaryTitle=isEndlessImpact?"ENDLESS RUN COMPLETE":"SESSION COMPLETE";
  const summarySubtitle=isEndlessImpact?`${Number(rankImpact?.peakRound||stats.hits||0)} PEAK ROUND`:`${rounds} ROUNDS COMPLETED`;
  return (
    <div className="menu-bg" style={{justifyContent:"flex-start",overflowY:"auto",overflowX:"hidden",paddingTop:isWideSummary?20:16,paddingBottom:isWideSummary?18:14}}>
      <div className="grid-bg" />
      <div className="menu-inner" style={{maxWidth:isWideSummary?980:760,paddingBottom:isWideSummary?18:14}}>
        <div style={{textAlign:"center",marginBottom:isWideSummary?32:22}}>
          <h2 style={{fontSize:isWideSummary?46:38,fontWeight:900,color:C.text,marginBottom:6,letterSpacing:-1.5,textShadow:"0 0 20px rgba(255,255,255,0.1)"}}>{summaryTitle}</h2>
          <div style={{fontSize:isWideSummary?15:13,fontWeight:700,color:C.textDim,letterSpacing:4,textTransform:"uppercase"}}>{summarySubtitle}</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:isWideSummary?"minmax(0,1fr) minmax(0,1fr)":"1fr",gap:isWideSummary?24:16,alignItems:"stretch"}}>
          <div style={{display:"flex",flexDirection:"column",gap:isWideSummary?22:16,minWidth:0,height:"100%"}}>
            <div className="glass-card" style={{padding:isWideSummary?34:26,border:`1px solid ${rank.color}30`,boxShadow:`0 0 20px ${rank.color}12,inset 0 1px 0 rgba(255,255,255,0.02)`}}>
              <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                <div style={{fontSize:isWideSummary?58:50,filter:`drop-shadow(0 0 12px ${rank.color}40)`}}>{rank.icon}</div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:isWideSummary?13:11,fontWeight:800,color:C.textMuted,letterSpacing:2.2,marginBottom:3}}>SESSION TIER</div>
                  <div style={{fontSize:isWideSummary?58:46,fontWeight:900,color:rank.color,letterSpacing:1,lineHeight:1}}>{rank.tier}</div>
                  <div style={{fontSize:isWideSummary?16:14,color:C.textDim,marginTop:8,fontFamily:"var(--mono)"}}>
                    <span style={{color:C.text}}>avg {avgLabel}</span> • <span style={{color:C.text}}>{acc}% acc</span>
                  </div>
                  {isEndlessImpact&&(
                    <div style={{fontSize:isWideSummary?12:10.5,color:C.textMuted,marginTop:7,fontFamily:"var(--mono)",letterSpacing:1}}>
                      ENDED BY {endlessEndReasonMap[rankImpact?.endedBy]||"RUN END"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="glass-card" style={{padding:isWideSummary?"22px 24px":"20px 20px"}}>
              <div style={{fontSize:isWideSummary?11:10,color:C.textDim,letterSpacing:1.8,fontWeight:800,marginBottom:isWideSummary?16:12,textAlign:"left"}}>KEY STATS</div>
              <div style={{display:"grid",gridTemplateColumns:isWideSummary?`repeat(${metricCards.length},minmax(0,1fr))`:"repeat(2,minmax(0,1fr))",gap:10}}>
              {metricCards.map(([l,v,c])=>(
                  <div key={l} style={{padding:isWideSummary?"16px 14px":"14px 12px",textAlign:"center",background:C.bgAlt,border:`1px solid ${C.border}`,borderRadius:10,minHeight:isWideSummary?140:112,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                  <div style={{fontSize:isWideSummary?10:9,fontWeight:700,color:C.textDim,letterSpacing:1.4,marginBottom:6}}>{l}</div>
                  <div
                    style={{
                      fontSize:isWideSummary?(l==="FASTEST"?20:24):(l==="FASTEST"?16:20),
                      fontWeight:900,
                      color:c,
                      fontFamily:"var(--mono)",
                      lineHeight:1.1,
                      whiteSpace:"nowrap",
                      overflow:"hidden",
                      textOverflow:"ellipsis",
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:isWideSummary?22:16,minWidth:0,height:"100%"}}>
            <div className="glass-card" style={{padding:isWideSummary?"30px 32px":"24px 26px",textAlign:"left",display:"flex",flexDirection:"column",flex:1}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:isWideSummary?18:12,gap:10,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:4,height:12,background:C.green,borderRadius:2}} />
                  <div style={{fontSize:isWideSummary?12:11,fontWeight:800,color:C.text,letterSpacing:2}}>RANK IMPACT</div>
                </div>
                {rankImpact?.delta!==undefined&&(
                  <div style={{fontSize:isWideSummary?17:14,fontWeight:900,color:finalDelta>=0?C.green:C.red,fontFamily:"var(--mono)",padding:isWideSummary?"8px 16px":"6px 14px",borderRadius:6,background:finalDelta>=0?`${C.green}10`:`${C.red}10`,border:`1px solid ${finalDelta>=0?C.green:C.red}20`}}>
                    {finalDelta>=0?`+${finalDelta}`:finalDelta} RP
                  </div>
                )}
              </div>

              {!rankImpact?(
                <div style={{fontSize:isWideSummary?13:11,color:C.textMuted,padding:"14px 0",textAlign:"center",background:C.bgAlt,borderRadius:10}}>Calculating rank progress...</div>
              ):(
                <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
                  <div style={{background:C.bgAlt,padding:isWideSummary?"20px 22px":"18px 20px",borderRadius:10,border:`1px solid ${C.border}`}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 34px 1fr",alignItems:"center"}}>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontSize:isWideSummary?10:9,fontWeight:700,color:C.textDim,letterSpacing:1.2,marginBottom:2}}>BEFORE</div>
                        <div style={{fontSize:isWideSummary?17:15,fontWeight:900,color:C.text}}>{rankImpact.beforeTier}</div>
                        <div style={{fontSize:isWideSummary?14:12,color:C.textMuted,fontFamily:"var(--mono)"}}>RP {rankImpact.beforeRating}</div>
                      </div>
                      <div style={{textAlign:"center",fontSize:isWideSummary?14:12,color:C.textDim}}>→</div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:isWideSummary?10:9,fontWeight:700,color:C.textDim,letterSpacing:1.2,marginBottom:2}}>AFTER</div>
                        <div style={{fontSize:isWideSummary?17:15,fontWeight:900,color:rankImpact.afterTier!==rankImpact.beforeTier?C.green:C.text}}>{rankImpact.afterTier}</div>
                        <div style={{fontSize:isWideSummary?14:12,color:C.textMuted,fontFamily:"var(--mono)"}}>RP {rankImpact.afterRating}</div>
                      </div>
                    </div>
                    <div style={{marginTop:isWideSummary?14:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:isWideSummary?12:11,fontWeight:700}}>
                        <span style={{color:C.textMuted,letterSpacing:0.5}}>{rankImpact.nextTier?`${rankImpact.pointsToNext} RP TO ${rankImpact.nextTier}`:"MAX RANK REACHED"}</span>
                        <span style={{color:C.textDim}}>{progressPercent}%</span>
                      </div>
                      <div style={{height:8,borderRadius:999,background:C.bg,overflow:"hidden",border:`1px solid ${C.border}`}}>
                        <div style={{height:"100%",width:`${Math.max(2,Math.min(100,progressPercent))}%`,background:`linear-gradient(90deg,${C.green},${C.greenBright})`,boxShadow:`0 0 12px ${C.green}30`,transition:"width 1s cubic-bezier(0.34,1.56,0.64,1)"}} />
                      </div>
                    </div>
                  </div>

                  {hasDifficultyBonus&&(
                    <div style={{marginTop:isWideSummary?16:12,padding:isWideSummary?"13px 16px":"11px 14px",borderRadius:10,border:`1px solid ${C.yellow}25`,background:`linear-gradient(90deg,${C.yellow}08,transparent)`}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                        <span style={{fontSize:isWideSummary?11:10,fontWeight:800,color:C.yellow,letterSpacing:1.3}}>SOLO DIFFICULTY MULTIPLIER</span>
                        <span style={{fontSize:isWideSummary?12:11,fontWeight:900,color:C.yellow,fontFamily:"var(--mono)"}}>Lv{rankImpact?.difficultyLevel||1} (x{difficultyMultiplier.toFixed(2)})</span>
                      </div>
                    </div>
                  )}

                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,marginTop:isWideSummary?18:14,marginBottom:isWideSummary?18:14}}>
                    {[["ROUNDS",rounds,C.text],["ACCURACY",`${acc}%`,acc>=80?C.green:C.text],["NET",stats.score,C.green]].map(([l,v,c])=>(
                      <div key={l} style={{padding:isWideSummary?"14px 14px":"12px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bgAlt,textAlign:"center"}}>
                        <div style={{fontSize:isWideSummary?9:8.5,color:C.textDim,letterSpacing:1.3,marginBottom:3}}>{l}</div>
                        <div style={{fontSize:isWideSummary?16:14,fontWeight:900,color:c,fontFamily:"var(--mono)"}}>{v}</div>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display:"flex",
            flexDirection:"column",
            gap:10,
            marginTop:isWideSummary?16:12,
            width:"100%",
            maxWidth:isWideSummary?430:320,
            marginInline:"auto",
            alignSelf:"center",
          }}
        >
          {onPlayAgain&&(
            <button 
              onClick={onPlayAgain} 
              className="btn-primary btn-green" 
              style={{
                height:isWideSummary?48:42,
                fontSize:isWideSummary?13:11,
                fontWeight:900,
                letterSpacing:2.2,
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                gap:8,
                boxShadow:`0 8px 32px ${C.green}25`
              }}
            >
              PLAY AGAIN
            </button>
          )}
          
          <div style={{display:"flex",gap:10}}>
            <button 
              onClick={onBack} 
              className="glass-card" 
              style={{
                flex:1,
                padding:0,
                height:isWideSummary?42:38,
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                gap:8,
                fontSize:10,
                fontWeight:800,
                letterSpacing:1.5,
                color:C.textMuted,
                cursor:"pointer",
                transition:"all 0.2s",
                background:C.bgAlt,
                border:`1px solid ${C.borderLight}`
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = C.textDim;
                e.currentTarget.style.color = C.text;
                e.currentTarget.style.background = C.bgElevated;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.borderLight;
                e.currentTarget.style.color = C.textMuted;
                e.currentTarget.style.background = C.bgAlt;
              }}
            >
              MENU
            </button>
            
            {onProfile && (
              <button 
                onClick={onProfile} 
                className="glass-card" 
                style={{
                  flex:1,
                  padding:0,
                  height:isWideSummary?42:38,
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  gap:8,
                  fontSize:10,
                  fontWeight:800,
                  letterSpacing:1.5,
                  color:C.textMuted,
                  cursor:"pointer",
                  transition:"all 0.2s",
                  background:C.bgAlt,
                  border:`1px solid ${C.borderLight}`
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = C.blue;
                  e.currentTarget.style.color = C.text;
                  e.currentTarget.style.background = C.bgElevated;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = C.borderLight;
                  e.currentTarget.style.color = C.textMuted;
                  e.currentTarget.style.background = C.bgAlt;
                }}
              >
                PROFILE
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   GAME VIEW
═══════════════════════════════════════════ */
function GameView({engine,onExit,rightPanel,exitLabel="END",onExitConfirmMessage=null,timerMode="elapsed",timerLimitMs=15000,timerLabel=null,showPnl=true,rankRoundTimeLimitMs=null}){
  const g=engine;
  const [searchQuery,setSearchQuery]=useState("");
  const [showExitConfirm,setShowExitConfirm]=useState(false);
  const normalizedSearch=searchQuery.trim().toLowerCase();
  const visibleFeed=normalizedSearch?g.liveFeed.filter((coin)=>{
    const name=String(coin?.name??"").toLowerCase();
    return name.includes(normalizedSearch);
  }):g.liveFeed;
  const handleExit=useCallback(()=>{
    if(!onExit)return;
    if(onExitConfirmMessage){
      setShowExitConfirm(true);
      return;
    }
    onExit();
  },[onExit,onExitConfirmMessage]);
  const cancelExit=useCallback(()=>setShowExitConfirm(false),[]);
  const confirmExit=useCallback(()=>{
    setShowExitConfirm(false);
    onExit?.();
  },[onExit]);
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"var(--mono)",color:C.text,overflow:"hidden",position:"relative"}} className={g.screenShake?"shake":""}>
      {g.screenFlash&&<div className="screen-flash" style={{background:g.screenFlash==="green"?`radial-gradient(ellipse at center,rgba(72,187,120,0.1) 0%,transparent 65%)`:`radial-gradient(ellipse at center,rgba(245,101,101,0.1) 0%,transparent 65%)`}}/>}
      {g.comboBurst&&<div className="combo-burst"><div className="combo-text">{g.comboBurst}</div></div>}
      <div className="grid-bg"/>
      {/* HUD */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"8px 12px",gap:0,borderBottom:`1px solid ${C.border}`,background:`linear-gradient(180deg,${C.bgAlt},${C.bg})`,flexShrink:0,zIndex:10,flexWrap:"wrap",position:"relative"}}>
        <div style={{position:"absolute",bottom:0,left:"10%",right:"10%",height:1,background:`linear-gradient(90deg,transparent,${C.green}15,transparent)`,pointerEvents:"none"}}/>
        <HudStat label="SCORE" value={g.stats.score} color={C.green} large/>
        <div className="hud-div"/>
        {showPnl&&(<>
          <HudStat label="PNL" value={g.pnl.toLocaleString()} color={g.pnl>0?C.green:C.textMuted}/>
          <div style={{fontSize:10,fontWeight:900,color:g.multColor,padding:"3px 8px",borderRadius:5,background:`${g.multColor}10`,border:`1px solid ${g.multColor}25`,margin:"0 4px",transition:"all 0.25s"}}>{g.multLabel}</div>
          <div className="hud-div"/>
        </>)}
        <ElapsedTimer startTime={g.timerStart} running={g.timerRunning} mode={timerMode} limitMs={timerLimitMs} label={timerLabel}/>
        <div className="hud-div"/>
        <HudStat label="STREAK" value={g.stats.streak>0?g.stats.streak:"—"} color={g.stats.streak>=13?C.red:g.stats.streak>=8?C.orange:g.stats.streak>=4?C.yellow:C.textDim}/>
        <div className="hud-div"/>
        <HudStat label="BEST" value={g.stats.bestTime!==null?`${(g.stats.bestTime/1000).toFixed(2)}s`:"—"} color={C.cyan}/>
        <div className="hud-div"/>
        <HudStat label="LAST" value={g.stats.lastTime!==null?`${(g.stats.lastTime/1000).toFixed(2)}s`:"—"} color={C.blue}/>
        <div className="hud-div"/>
        <HudStat label="RND" value={g.roundNum+1} color={C.textMuted}/>
        <div className="hud-div"/>
        <HudStat label="DIFF" value={`Lv${g.difficulty}`} color={g.difficulty>=8?C.red:g.difficulty>=5?C.yellow:C.green}/>
        {onExit&&<div style={{marginLeft:10}}><button onClick={handleExit} className="btn-ghost">{exitLabel}</button></div>}
      </div>
      {/* 3 COLS */}
      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
        {/* COL1 */}
        <div style={{width:"37%",minWidth:300,maxWidth:460,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",background:C.bg,flexShrink:0}}>
          <div className="col-header" style={{gap:8}}>
            <span style={{fontWeight:800,fontSize:12,color:C.text}}>𝕏 Tracker</span>
          </div>
          <div style={{flex:1,overflowY:"auto"}}>{g.tweetVis&&g.roundData?<><XTweet data={g.roundData.tweet} isSignal animDelay={0}/>{g.roundData.fillers.map((ft,i)=><XTweet key={i} data={ft} isSignal={false} animDelay={300+i*350}/>)}</>:<div className="empty-msg">Arm the holster to<br/>start a round</div>}</div>
        </div>
        {/* COL2 */}
        <div style={{flex:1,minWidth:300,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",background:C.bg,flexShrink:0}} onMouseEnter={g.handlePauseEnter} onMouseLeave={g.handlePauseLeave}>
          {/* Trenches header */}
          <div className="col-header" style={{padding:"8px 12px"}}>
            <span style={{fontWeight:900,fontSize:14,color:C.text}}>Trenches</span>
            <span className="badge-beta">Beta</span>
            <div style={{flex:1}}/>
            {g.isPaused&&<span style={{fontSize:9,fontWeight:800,letterSpacing:1.8,color:C.yellow,padding:"3px 7px",borderRadius:6,border:`1px solid ${C.yellow}40`,background:`${C.yellow}12`}}>PAUSED</span>}
          </div>
          {/* Sub nav */}
          <div style={{display:"flex",alignItems:"center",padding:"5px 12px",borderBottom:`1px solid ${C.border}`,gap:8,flexShrink:0}}>
            <span style={{color:C.text,fontSize:10.5,fontWeight:700}}>New</span>
            <div style={{flex:1}}/>
            <input
              value={searchQuery}
              onChange={e=>setSearchQuery(e.target.value)}
              placeholder="Search"
              style={{width:120,height:24,padding:"0 8px",borderRadius:6,border:`1px solid ${C.border}`,background:C.bgCard,color:C.text,fontSize:10,fontFamily:"var(--mono)",outline:"none"}}
            />
          </div>
          <div style={{flex:1,overflowY:"auto",position:"relative"}}>{g.pairsVis&&visibleFeed.length>0?visibleFeed.map(coin=><TokenRow key={coin.id} coin={coin} spawned={g.spawned.has(coin.id)} revealed={g.revealed} clickedId={g.clickedId} onBuy={g.handleBuy} showCorrect={g.showCorrect}/>):g.pairsVis&&g.liveFeed.length>0&&normalizedSearch?<div className="empty-msg">No matches found</div>:<div className="empty-msg">Tokens appear here<br/>once round is armed</div>}{g.feedback&&<div className="feedback-wrap"><div className={`feedback-pill ${g.feedback.type==="hit"?"fb-hit":"fb-miss"}`}>{g.feedback.type==="hit"?`SNIPED ${(g.feedback.rt/1000).toFixed(2)}s ✅`:g.feedback.type==="penalty"?"TOO EARLY ⛔":g.feedback.type==="timeout"?"TIMEOUT ⏱️":g.feedback.rt?`WRONG ${(g.feedback.rt/1000).toFixed(2)}s ❌`:"WRONG ❌"}</div></div>}</div>
        </div>
        {/* COL3 */}
        <div style={{flex:1,display:"flex",flexDirection:"column",background:C.bg,position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"14px 16px 12px",gap:14,flexShrink:0,borderBottom:`1px solid ${C.border}`,cursor:"crosshair",background:g.isPaused?`radial-gradient(ellipse at center,rgba(236,201,75,0.06) 0%,transparent 70%)`:g.holsterPhase==="armed"?`radial-gradient(ellipse at center,rgba(72,187,120,0.06) 0%,transparent 70%)`:g.holsterPhase==="arming"?`radial-gradient(ellipse at center,rgba(236,201,75,0.04) 0%,transparent 70%)`:"none",position:"relative",overflow:"hidden"}} onMouseEnter={g.handleHolsterEnter} onMouseLeave={g.handleHolsterLeave}>
            {g.holsterPhase==="armed"&&<div style={{position:"absolute",inset:0,background:`linear-gradient(0deg,transparent 49.5%,rgba(72,187,120,0.03) 50%,transparent 50.5%)`,backgroundSize:"100% 4px",pointerEvents:"none",animation:"fadeIn 0.3s ease"}}/>}
            <div style={{width:46,height:46,position:"relative",flexShrink:0,opacity:g.holsterPhase==="arming"||g.holsterPhase==="armed"?1:g.holsterPhase==="live"?.3:.12,transition:"opacity 0.4s"}}><svg width={46} height={46} style={{position:"absolute",top:0,left:0}}><circle cx={23} cy={23} r={19} fill="none" stroke={g.holsterPhase==="armed"?C.green:g.holsterPhase==="arming"?C.yellow:C.border} strokeWidth={1.5} strokeDasharray={g.holsterPhase==="arming"?`${g.armProgress*119.4} 119.4`:"119.4 0"} strokeLinecap="round" style={{transition:"stroke 0.2s",transform:"rotate(-90deg)",transformOrigin:"center",filter:g.holsterPhase==="armed"?`drop-shadow(0 0 6px ${C.green}50)`:"none"}}/></svg><div style={{position:"absolute",top:"50%",left:7,right:7,height:1,background:g.holsterPhase==="armed"?C.green:g.holsterPhase==="arming"?`${C.yellow}60`:C.border}}/><div style={{position:"absolute",left:"50%",top:7,bottom:7,width:1,background:g.holsterPhase==="armed"?C.green:g.holsterPhase==="arming"?`${C.yellow}60`:C.border}}/><div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:g.holsterPhase==="armed"?7:4,height:g.holsterPhase==="armed"?7:4,borderRadius:"50%",background:g.holsterPhase==="armed"?C.green:g.holsterPhase==="arming"?C.yellow:C.border,boxShadow:g.holsterPhase==="armed"?`0 0 12px ${C.green}60`:"none",transition:"all 0.2s",animation:g.holsterPhase==="armed"?"holsterPulse 1s ease-in-out infinite":"none"}}/></div>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:8,color:C.textDim,letterSpacing:2,marginBottom:2,textTransform:"uppercase"}}>HOLSTER</div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:2.5,color:g.isPaused?C.yellow:g.holsterPhase==="armed"?C.green:g.holsterPhase==="arming"?C.yellow:g.holsterPhase==="cooldown"?C.red:g.holsterPhase==="live"?`${C.green}70`:C.textGhost,textTransform:"uppercase",transition:"color 0.25s",textShadow:g.holsterPhase==="armed"&&!g.isPaused?`0 0 10px ${C.green}30`:"none"}}>{g.isPaused?"PAUSED":g.holsterPhase==="armed"?"ARMED — GO":g.holsterPhase==="arming"?`ARMING ${Math.round(g.armProgress*100)}%`:g.holsterPhase==="cooldown"?"COOLDOWN":g.holsterPhase==="live"?"ROUND LIVE":"HOVER TO ARM"}</div>
              {g.isPaused?<div style={{fontSize:8.5,color:C.textDim,marginTop:3}}>Leave HOLSTER zone to resume</div>:g.holsterPhase==="idle"&&<div style={{fontSize:8.5,color:C.textGhost,marginTop:3}}>Hold in HOLSTER for 0.8s to arm</div>}
            </div>
          </div>
          {rightPanel||<PerfPanel stats={g.stats} history={g.attemptHistory} roundTimeLimitMs={rankRoundTimeLimitMs}/>}
        </div>
      </div>
      {showExitConfirm&&(
        <div style={{position:"absolute",inset:0,zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"rgba(0,0,0,0.72)"}} onClick={cancelExit}>
          <div className="glass-card" style={{width:"100%",maxWidth:460,padding:18,border:`1px solid ${C.red}55`,boxShadow:`0 0 28px ${C.red}25`}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:9,fontWeight:800,letterSpacing:2.2,color:C.red,marginBottom:10}}>CONFIRM LEAVE</div>
            <div style={{fontSize:12,lineHeight:1.6,color:C.text,marginBottom:16}}>{onExitConfirmMessage||"Are you sure you want to leave?"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={cancelExit} className="btn-ghost" style={{height:36,fontSize:10,letterSpacing:1.3}}>CANCEL</button>
              <button onClick={confirmExit} className="btn-primary btn-orange btn-static" style={{height:36,fontSize:10,letterSpacing:1.3}}>LEAVE MATCH</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { HudStat, ElapsedTimer, VerifiedBadge, MediaThumb, XTweet, TokenRow, PerfPanel, SessionSummary, GameView };
