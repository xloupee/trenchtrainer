"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

/* ═══════════════════════════════════════════
   SOUND ENGINE (Web Audio API)
═══════════════════════════════════════════ */
const SFX = (() => {
  let ctx = null;
  const getCtx = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; };
  const play = (freq, type, dur, vol = 0.12) => {
    try { const c = getCtx(), o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, c.currentTime); g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur); o.connect(g); g.connect(c.destination); o.start(c.currentTime); o.stop(c.currentTime + dur); } catch (e) {}
  };
  return {
    hit: () => { play(880, "sine", 0.08, 0.15); setTimeout(() => play(1320, "sine", 0.12, 0.12), 50); setTimeout(() => play(1760, "sine", 0.15, 0.08), 100); },
    miss: () => { play(220, "sawtooth", 0.2, 0.1); setTimeout(() => play(165, "sawtooth", 0.25, 0.08), 80); },
    penalty: () => { play(110, "square", 0.3, 0.08); },
    click: () => { play(660, "sine", 0.04, 0.06); },
    arm: () => { play(440, "sine", 0.06, 0.04); },
    armed: () => { play(880, "triangle", 0.15, 0.08); setTimeout(() => play(1100, "triangle", 0.1, 0.06), 60); },
    combo: () => { [0, 60, 120, 180].forEach((d, i) => setTimeout(() => play(660 + i * 220, "sine", 0.1, 0.07), d)); },
    countdown: (n) => { play(n === 0 ? 880 : 440, n === 0 ? "triangle" : "sine", n === 0 ? 0.2 : 0.1, 0.1); },
  };
})();

/* seeded RNG for 1v1 same-round generation */
function seededRng(seed) { let s = seed; return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; }; }
function seededPick(a, rng) { return a[Math.floor(rng() * a.length)]; }
function seededShuffle(a, rng) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[b[i], b[j]] = [b[j], b[i]]; } return b; }

/* ═══════════════════════════════════════════
   ENGINE + SHARED DATA
═══════════════════════════════════════════ */
const CFG = { antiSpamMin: 150, antiSpamMax: 300, holsterArm: 800 };
const getMult = s => s >= 13 ? 3 : s >= 8 ? 2 : s >= 4 ? 1.5 : 1;
const getMultLabel = s => s >= 13 ? "x3" : s >= 8 ? "x2" : s >= 4 ? "x1.5" : "x1";
const getMultTier = s => s >= 13 ? 3 : s >= 8 ? 2 : s >= 4 ? 1 : 0;
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[b[i], b[j]] = [b[j], b[i]]; } return b; };

const THEMES = [
  { kw:"apple",emoji:"🍎",de:["🍊","🍇","🍌","🥭","🍐","🍒","🫐","🥝","🍑","🍋"],names:["AppleCoin","APPLE","AppleToken","APPLX"],decoys:["GrapeCoin","BananaToken","MangoDAO","OrangeCoin","PearToken","CHERRY","KiwiCoin","BlueberryDAO","CitrusCoin","MelonToken","PLUM","FruitDAO"],tweets:[{text:"Apples are at an all-time high right now. 🍎",user:"CryptoAlerts",handle:"@cryptoalerts",time:"27s"},{text:"Farmers reporting apples falling everywhere. Bullish 📈",user:"DeFi Degen",handle:"@defidegen",time:"14s"},{text:"Apple demand exploding!! Narrative is CLEAR.",user:"AlphaLeaks",handle:"@alphaleaks",time:"45s"},{text:"Breaking: Global apple shortage 🍎🍎🍎",user:"Whale Watch",handle:"@whalewatcher",time:"8s"}]},
  { kw:"rocket",emoji:"🚀",de:["✈️","🛸","🎆","💫","⭐","🌙","🛩️","🎯","🌟","💥"],names:["RocketCoin","ROCKET","RocketDAO","RKTX"],decoys:["PlaneCoin","UFOToken","StarDAO","MoonCoin","JetToken","COMET","SpaceCoin","OrbitDAO","SaturnCoin","NebulaTkn"],tweets:[{text:"NASA just announced a new rocket launch window 🚀",user:"SpaceNews",handle:"@spacenews",time:"12s"},{text:"Rockets trending #1 worldwide.",user:"TrendBot",handle:"@trendbot",time:"31s"},{text:"SpaceX competitor revealed new design. CT going crazy",user:"TechAlpha",handle:"@techalpha",time:"5s"}]},
  { kw:"dog",emoji:"🐕",de:["🐱","🐻","🐰","🦊","🐺","🐹","🦁","🐯","🐼","🐵"],names:["DogCoin","DOG","DogToken","DOGX"],decoys:["CatCoin","BearToken","BunnyDAO","FoxCoin","WolfToken","HAMSTER","LionCoin","TigerDAO","PandaCoin","MonkeyTkn"],tweets:[{text:"Dogs are dominating social media today 🐕",user:"ViralTracker",handle:"@viraltracker",time:"19s"},{text:"World's largest dog show breaks all records.",user:"NewsWire",handle:"@newswire",time:"42s"},{text:"Dog adoption rates hit all-time high 🐶📈",user:"DataPulse",handle:"@datapulse",time:"7s"}]},
  { kw:"fire",emoji:"🔥",de:["💧","❄️","⚡","🌊","💨","🌋","☀️","🌈","🌪️","🧊"],names:["FireCoin","FIRE","FireToken","FIRX"],decoys:["WaterCoin","IceToken","ThunderDAO","WaveCoin","WindToken","VOLCANO","SunCoin","StormDAO","BlazeCoin","FlameTkn"],tweets:[{text:"This market is on FIRE 🔥🔥🔥",user:"MarketPulse",handle:"@marketpulse",time:"3s"},{text:"Wildfire narrative spreading across CT.",user:"AlphaSignals",handle:"@alphasignals",time:"22s"},{text:"Fire emojis everywhere. You know what that means. 🔥",user:"DegenAlerts",handle:"@degenalerts",time:"16s"}]},
  { kw:"diamond",emoji:"💎",de:["💰","🪙","👑","💍","🏆","🔮","🪨","💵","🎰","🏅"],names:["DiamondCoin","DIAMOND","DiamondDAO","DMDX"],decoys:["GoldCoin","CoinToken","CrownDAO","RingCoin","TrophyTkn","PEARL","CrystalCoin","RubyDAO","EmeraldCoin","SapphireTkn"],tweets:[{text:"Diamond hands are winning today 💎",user:"HODLKing",handle:"@hodlking",time:"9s"},{text:"Diamond prices surge to record levels.",user:"MarketWatch",handle:"@mktwatch",time:"33s"},{text:"CT can't stop talking about diamonds 💎💎",user:"GemHunter",handle:"@gemhunter",time:"21s"}]},
  { kw:"frog",emoji:"🐸",de:["🐍","🦎","🐢","🐊","🦖","🐛","🦗","🐞","🦋","🐝"],names:["FrogCoin","FROG","FrogToken","FRGX"],decoys:["SnakeCoin","LizardTkn","TurtleDAO","CrocCoin","DinoToken","GECKO","ToadCoin","NewtDAO","BugCoin","BeetleTkn"],tweets:[{text:"Frogs taking over the timeline again 🐸",user:"MemeRadar",handle:"@memeradar",time:"6s"},{text:"The frog meta is BACK 🐸🐸",user:"AlphaFrog",handle:"@alphafrog",time:"28s"},{text:"Frog memes everywhere. Crystal clear.",user:"DegenPulse",handle:"@degenpulse",time:"11s"}]},
  { kw:"penguin",emoji:"🐧",de:["🦅","🦆","🦉","🐦","🦜","🕊️","🦩","🐔","🦚","🦢"],names:["PenguinCoin","PENGUIN","PenguinDAO","PNGX"],decoys:["EagleCoin","DuckToken","OwlDAO","BirdCoin","ParrotTkn","DOVE","FlamingoC","ChickenDAO","PeacockCoin","SwanTkn"],tweets:[{text:"Penguins trending everywhere 🐧 Load up.",user:"TrendAlpha",handle:"@trendalpha",time:"15s"},{text:"Antarctic penguin population hits record.",user:"SciAlerts",handle:"@scialerts",time:"38s"},{text:"Penguin szn is here. Don't sleep. 🐧🐧",user:"NarrativeBot",handle:"@narrativebot",time:"4s"}]},
  { kw:"moon",emoji:"🌕",de:["⭐","☀️","🪐","🌍","💫","🌌","☄️","🔭","🌟","✨"],names:["MoonCoin","MOON","MoonToken","MOONX"],decoys:["StarCoin","SunToken","PlanetDAO","EarthCoin","CosmosTkn","GALAXY","CometCoin","NovaCoin","AuroraCoin","NeptuneTkn"],tweets:[{text:"Going to the MOON tonight 🌕 Buckle up.",user:"MoonBoi",handle:"@moonboi",time:"2s"},{text:"Lunar eclipse — moon mania 🌙",user:"AstroAlerts",handle:"@astroalerts",time:"25s"},{text:"Moon content flooding every timeline.",user:"NarrativeHQ",handle:"@narrativehq",time:"18s"}]},
];

const FILLER=[
  {text:"scam proposal.",user:"billymeth.eth",handle:"@biiiymeister",time:"13s",verified:true,reply:"@jup_uplink",
    quote:{user:"Jupiter Uplink",handle:"@jup_uplink",time:"26m",verified:true,text:"To Jupuary or not to Jupuary.\n\nHigh-level overview of the upcoming DAO vote.",media:{type:"video",dur:"0:38"}}},
  {text:"Lots of X accounts hacked. DO NOT click DM links.",user:"Security Alert",handle:"@secalert",time:"2m",warn:true,verified:true},
  {text:"gm. another day another narrative.\n\nif you're not in the trenches rn wyd",user:"degen_steve",handle:"@degensteve",time:"1m",media:{type:"image"}},
  {text:"New pairs flying. Stay sharp 👀\n\nAlready 3 10x plays today.",user:"TrenchWatch",handle:"@trenchwatch",time:"4m",verified:true,
    quote:{user:"Raydium",handle:"@RaydiumProtocol",time:"1h",verified:true,text:"24h volume just crossed $2.1B.\n\nNew ATH for the protocol.",media:{type:"image"}}},
  {text:"not watching memescope rn? ngmi",user:"based_trader",handle:"@basedtrader",time:"5m"},
  {text:"Volume insane on Raydium today.",user:"DEX Analytics",handle:"@dexanalytics",time:"6m",verified:true,media:{type:"image"}},
  {text:"this is the play. not financial advice.",user:"whale_alert",handle:"@whale_alert_",time:"30s",reply:"@pumpdotfun",
    quote:{user:"pump.fun",handle:"@pumpdotfun",time:"12m",verified:true,text:"Introducing graduated tokens — LP migration is now live."}},
  {text:"someone just aped $50K into a 2 minute old token lol",user:"onchain_lens",handle:"@onchain_lens",time:"45s",verified:true,media:{type:"image"}},
];
const NOISE_TICKERS=["BONK","WIF","PEPE","BRETT","ANDY","CHAD","GIGA","SMOL","BASED","SEND","COPE","SLERF","MEW","MYRO","SAMO","TURBO","SNEK","HONK","NEIRO","GOAT","PNUT","SPX","MOG","TOSHI","SIGMA","GRIND","PUMP","YOLO","WAGMI","NGMI","HODL","MONKE","VIBE"];
const NOISE_EMOJIS=["🐶","🐱","🐻","🦊","🐸","🐧","🎭","🗿","🧠","💊","🫡","👑","💀","🤡","🎪","🦍","🐍","🦈","🐋","🌊","🔮","🪙","💰","🎰","⭐","🌶️","🍄","🧊","🫧","🪐","☄️","🌋","🦎","🎯","⚡","🔥","💎"];

const rA=()=>{const c="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";let s="";for(let i=0;i<3;i++)s+=c[Math.floor(Math.random()*c.length)];return s+".."+c[Math.floor(Math.random()*c.length)]+"mp";};
const rH2=()=>"@"+pick(["degen","alpha","dev","trader","whale","ape","moon","based","pump","ser"])+"_"+pick(["alpha","dev","trader","whale","moon"]);
const rV=()=>Math.random()<.3?`$${Math.floor(Math.random()*90+1)}`:`$${Math.floor(Math.random()*12+1)}K`;
const rM2=()=>`$${Math.floor(Math.random()*9+1)}K`;const rAg=()=>`${Math.floor(Math.random()*58+1)}s`;
const rHo=()=>Math.floor(Math.random()*200);const rDP=()=>`${Math.floor(Math.random()*25)}%`;
const rDA=()=>pick(["1h","3mo","10d","27d","1yr","51m","2mo"]);const rBS=()=>`${Math.floor(Math.random()*8)} · ${Math.floor(Math.random()*5)}%`;
const rT2=()=>`${Math.floor(Math.random()*30)}%`;const rS2=()=>({web:Math.random()>.55,tg:Math.random()>.5,tw:Math.random()>.5,yt:Math.random()>.8});

function genNoiseToken(){return{name:pick(NOISE_TICKERS),emoji:pick(NOISE_EMOJIS),isCorrect:false,isTrap:false,isNoise:true,id:`noise-${Date.now()}-${Math.random()}`,addr:rA(),handle:rH2(),vol:rV(),mcap:rM2(),holders:rHo(),age:rAg(),devPct:rDP(),devAge:rDA(),buySell:rBS(),top10:rT2(),socials:rS2(),hasDS:Math.random()>.5};}

function genRound(num, seed = null) {
  const rng = seed !== null ? seededRng(seed + num * 7919) : null;
  const _pick = rng ? (a) => seededPick(a, rng) : pick;
  const _shuf = rng ? (a) => seededShuffle(a, rng) : shuffle;
  const diff=Math.min(10,Math.floor(num/2)+1),pc=Math.round(Math.min(5+diff*1.5,20));
  const th=_pick(THEMES),tw=_pick(th.tweets),cn=_pick(th.names);
  const ad=[...th.decoys,...NOISE_TICKERS.slice(0,10)],ae=[...th.de,...NOISE_EMOJIS.slice(0,10)];
  const ud=_shuf(ad).slice(0,pc-1),ue=_shuf(ae).slice(0,pc-1);
  const traps=[];if(diff>=3)traps.push({name:cn,emoji:_pick(th.de),isCorrect:false,isTrap:true});
  if(diff>=6)traps.push({name:_pick(th.decoys),emoji:th.emoji,isCorrect:false,isTrap:true});
  const ut=traps.slice(0,Math.min(traps.length,Math.floor(diff/3))),rc=pc-1-ut.length;
  const pairs=_shuf([{name:cn,emoji:th.emoji,isCorrect:true,isTrap:false},...ut,...Array.from({length:rc},(_,i)=>({name:ud[i]||_pick(ad),emoji:ue[i]||_pick(ae),isCorrect:false,isTrap:false}))]).map((p,i)=>({...p,isNoise:false,id:`${Date.now()}-${i}`,addr:rA(),handle:rH2(),vol:rV(),mcap:rM2(),holders:rHo(),age:rAg(),devPct:rDP(),devAge:rDA(),buySell:rBS(),top10:rT2(),socials:rS2(),hasDS:Math.random()>.5}));
  return{tweet:tw,pairs,correctName:cn,correctEmoji:th.emoji,fillers:shuffle(FILLER).slice(0,4),spawnDelay:Math.max(600-diff*55,80),diff,noiseInterval:diff>=8?600:diff>=5?1000:diff>=3?1800:3000};
}

function getRank(avgMs){if(avgMs===null)return{tier:"UNRANKED",color:"#4a5568",glow:"none",icon:"—"};const s=avgMs/1000;if(s<.45)return{tier:"CHALLENGER",color:"#f56565",glow:"0 0 18px rgba(245,101,101,0.35)",icon:"♛"};if(s<.6)return{tier:"DIAMOND",color:"#63b3ed",glow:"0 0 16px rgba(99,179,237,0.3)",icon:"◆"};if(s<.8)return{tier:"GOLD",color:"#ecc94b",glow:"0 0 14px rgba(236,201,75,0.3)",icon:"★"};if(s<1)return{tier:"SILVER",color:"#a0aec0",glow:"0 0 10px rgba(160,174,192,0.2)",icon:"☆"};return{tier:"BRONZE",color:"#c77c48",glow:"0 0 10px rgba(199,124,72,0.25)",icon:"●"};}
function getRC(ms){if(!ms)return"#f56565";const s=ms/1000;if(s<.5)return"#48bb78";if(s<.8)return"#68d391";if(s<1.2)return"#ecc94b";if(s<2)return"#ed8936";return"#f56565";}
const genCode=()=>{const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="";for(let i=0;i<6;i++)s+=c[Math.floor(Math.random()*c.length)];return s;};

/* ── Color Palette ── */
const C = {
  bg: "#060911", bgAlt: "#0c1120", bgCard: "#111827", bgElevated: "#1a2234",
  border: "#1e2d47", borderLight: "#2a3f5f",
  green: "#4ade80", greenBright: "#86efac", greenDim: "#166534",
  orange: "#fb923c", orangeBright: "#fdba74", red: "#f87171",
  yellow: "#fbbf24", cyan: "#22d3ee", blue: "#60a5fa",
  text: "#f1f5f9", textMuted: "#94a3b8", textDim: "#475569", textGhost: "#1e293b",
};

const MODE_KEYS = ["practice", "1v1", "profile"];
const isModeKey = (value) => MODE_KEYS.includes(value);
const normalizeModeKey = (value) => (isModeKey(value) ? value : "practice");

const EMPTY_PROFILE_STATS = {
  preferred_mode: "practice",
  practice_sessions: 0,
  practice_rounds: 0,
  practice_hits: 0,
  practice_misses: 0,
  practice_penalties: 0,
  practice_best_time: null,
  practice_best_streak: 0,
  duel_matches: 0,
  duel_wins: 0,
  duel_losses: 0,
  duel_draws: 0,
  duel_score_for: 0,
  duel_score_against: 0,
  duel_best_score: 0,
};

const PROFILE_SELECT = "user_id,preferred_mode,practice_sessions,practice_rounds,practice_hits,practice_misses,practice_penalties,practice_best_time,practice_best_streak,duel_matches,duel_wins,duel_losses,duel_draws,duel_score_for,duel_score_against,duel_best_score";
const normalizeProfileStats = (raw = {}) => ({
  ...EMPTY_PROFILE_STATS,
  ...raw,
  preferred_mode: normalizeModeKey(raw?.preferred_mode),
  practice_sessions: Number(raw?.practice_sessions || 0),
  practice_rounds: Number(raw?.practice_rounds || 0),
  practice_hits: Number(raw?.practice_hits || 0),
  practice_misses: Number(raw?.practice_misses || 0),
  practice_penalties: Number(raw?.practice_penalties || 0),
  practice_best_time: raw?.practice_best_time ?? null,
  practice_best_streak: Number(raw?.practice_best_streak || 0),
  duel_matches: Number(raw?.duel_matches || 0),
  duel_wins: Number(raw?.duel_wins || 0),
  duel_losses: Number(raw?.duel_losses || 0),
  duel_draws: Number(raw?.duel_draws || 0),
  duel_score_for: Number(raw?.duel_score_for || 0),
  duel_score_against: Number(raw?.duel_score_against || 0),
  duel_best_score: Number(raw?.duel_best_score || 0),
});

/* ═══════════════════════════════════════════
   SHARED UI COMPONENTS
═══════════════════════════════════════════ */
function HudStat({label,value,color,large}){return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"0 8px",gap:2}}><span style={{fontSize:7,fontWeight:500,color:C.textDim,letterSpacing:2.5,textTransform:"uppercase"}}>{label}</span><span style={{fontSize:large?20:13,fontWeight:800,color:color||C.text,fontFamily:"var(--mono)",textShadow:large?`0 0 14px ${color}25`:"none",transition:"all 0.2s"}}>{value}</span></div>);}

function ElapsedTimer({startTime,running}){const[el,setEl]=useState(0);const raf=useRef(null);useEffect(()=>{if(!startTime){setEl(0);return;}if(!running){setEl(Date.now()-startTime);return;}const tick=()=>{setEl(Date.now()-startTime);raf.current=requestAnimationFrame(tick);};raf.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf.current);},[startTime,running]);const s=el/1000;const col=s<1?C.green:s<2?C.greenBright:s<3?C.yellow:s<5?C.orange:C.red;return(<div style={{display:"flex",alignItems:"center",gap:7}}><div style={{position:"relative",width:40,height:40,flexShrink:0}}><svg width={40} height={40} style={{transform:"rotate(-90deg)"}}><circle cx={20} cy={20} r={17} fill="none" stroke={C.border} strokeWidth={2}/><circle cx={20} cy={20} r={17} fill="none" stroke={col} strokeWidth={2} strokeDasharray={`${Math.min(s/10,1)*106.8} 106.8`} strokeLinecap="round" style={{transition:"stroke 0.3s",filter:`drop-shadow(0 0 4px ${col}40)`}}/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:col,fontFamily:"var(--mono)"}}>{s.toFixed(1)}</div></div><div><div style={{fontSize:7,color:C.textDim,letterSpacing:2}}>ELAPSED</div><div style={{fontSize:12,fontWeight:800,color:col,fontFamily:"var(--mono)",transition:"color 0.3s"}}>{s.toFixed(2)}s</div></div></div>);}

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

function TokenRow({coin,txState,onBuy,spawned,revealed,clickedId,showCorrect}){
  const wc=clickedId===coin.id,iw=wc&&!coin.isCorrect;
  const isRevealCorrect=showCorrect&&revealed&&coin.isCorrect;
  let bl="transparent",bg="transparent";if(iw){bl=C.red;bg="rgba(245,101,101,0.03)";}else if(isRevealCorrect){bl=C.green;bg="rgba(72,187,120,0.04)";}
  const ia=txState==="active"&&!revealed,iwa=(txState==="waiting"||txState==="spawning")&&!revealed,sb=!revealed&&!coin.isNoise;
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
          {iwa?<><span className="blink-dot"/>WAIT</>:ia?<><span style={{color:C.yellow,fontSize:9}}>⚡</span> TX NOW</>:<><span style={{color:C.yellow,fontSize:9}}>⚡</span> 3.30</>}
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

function PerfPanel({stats,history}){const avg=stats.times.length>0?stats.times.reduce((a,b)=>a+b,0)/stats.times.length:null;const rank=getRank(avg);const acc=(stats.hits+stats.misses+stats.penalties)>0?Math.round((stats.hits/(stats.hits+stats.misses+stats.penalties))*100):0;const tl=(history||[]).slice(-15);return(<div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"16px 16px 12px",flexShrink:0}}><div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 22px",borderRadius:12,background:`linear-gradient(145deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${rank.color}20`,boxShadow:rank.tier!=="UNRANKED"?`${rank.glow},inset 0 1px 0 rgba(255,255,255,0.02)`:"inset 0 1px 0 rgba(255,255,255,0.02)",transition:"all 0.4s"}}><span style={{fontSize:24,color:rank.color,filter:rank.tier!=="UNRANKED"?`drop-shadow(0 0 10px ${rank.color}50)`:"none",transition:"filter 0.4s"}}>{rank.icon}</span><div><div style={{fontSize:12.5,fontWeight:900,color:rank.color,letterSpacing:2.5,transition:"color 0.3s"}}>{rank.tier}</div><div style={{fontSize:8.5,color:C.textDim,marginTop:2}}>{avg!==null?`avg ${(avg/1000).toFixed(3)}s`:"no data yet"}</div></div></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"0 16px 12px",flexShrink:0}}>{[["SESSION",`${stats.score}`,stats.score>0?C.green:C.textDim],["ACCURACY",`${acc}%`,acc>=80?C.green:acc>=50?C.yellow:C.red],["BEST RT",stats.bestTime!==null?`${(stats.bestTime/1000).toFixed(3)}s`:"—",C.cyan],["STREAK",stats.streak>0?`${stats.streak}`:"—",stats.streak>=8?C.orange:stats.streak>=4?C.yellow:C.textDim]].map(([l,v,c])=>(<div key={l} style={{padding:"8px 10px",borderRadius:8,background:`linear-gradient(145deg,${C.bgCard},${C.bg})`,border:`1px solid ${C.border}`,boxShadow:`inset 0 1px 0 rgba(255,255,255,0.015),0 2px 8px rgba(0,0,0,0.15)`,position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:0,left:"15%",right:"15%",height:1,background:`linear-gradient(90deg,transparent,${c}30,transparent)`}}/><div style={{fontSize:7,color:C.textDim,letterSpacing:2.5,marginBottom:3}}>{l}</div><div style={{fontSize:14,fontWeight:800,color:c,fontFamily:"var(--mono)",transition:"color 0.2s"}}>{v}</div></div>))}</div><div style={{height:1,background:`linear-gradient(90deg,transparent,${C.border},transparent)`,margin:"0 16px",flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 16px",minHeight:0,overflow:"hidden"}}><div style={{fontSize:7.5,color:C.textDim,letterSpacing:2.5,marginBottom:10,flexShrink:0}}>REACTION TIMELINE</div>{tl.length===0?(<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:9,color:C.textGhost,textAlign:"center",lineHeight:1.6}}>Attempts appear here<br/>as you play</div></div>):(<div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>{tl.map((e,i)=>{const im=e.type==="miss"||e.type==="penalty"||e.type==="wrong";const col=im?C.red:getRC(e.rt);const lb=im?(e.type==="penalty"?"EARLY":"MISS"):`${(e.rt/1000).toFixed(2)}s`;const il=i===tl.length-1;return(<div key={e.id||i} style={{display:"flex",alignItems:"center",gap:8,opacity:il?1:.5+(i/tl.length)*.5,animation:il?"slideUp 0.3s ease forwards":"none"}}><span style={{fontSize:8,color:C.textGhost,width:18,textAlign:"right",flexShrink:0,fontFamily:"var(--mono)"}}>{e.round||i+1}</span><div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3.5px 10px",borderRadius:12,background:`${col}0a`,border:`1px solid ${col}20`}}><div style={{width:5,height:5,borderRadius:"50%",background:col,flexShrink:0,boxShadow:il?`0 0 8px ${col}50`:"none"}}/><span style={{fontSize:10.5,fontWeight:700,color:col,fontFamily:"var(--mono)"}}>{lb}</span></div>{!im&&e.rt&&<div style={{flex:1,height:3,background:C.border,borderRadius:2,overflow:"hidden",minWidth:20}}><div style={{height:"100%",borderRadius:2,background:`linear-gradient(90deg,${col},${col}60)`,width:`${Math.max(5,Math.min(100,(1-e.rt/3000)*100))}%`,opacity:.6}}/></div>}</div>);})}</div>)}</div><div style={{padding:"8px 16px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"center",gap:16,fontSize:8.5,color:C.textDim,flexShrink:0}}><span>H {stats.hits}</span><span>M {stats.misses}</span><span>E {stats.penalties}</span></div></div>);}

/* ═══════════════════════════════════════════
   SESSION SUMMARY
═══════════════════════════════════════════ */
function SessionSummary({stats,history,onBack}){
  const avg=stats.times.length>0?stats.times.reduce((a,b)=>a+b,0)/stats.times.length:null;const rank=getRank(avg);
  const acc=(stats.hits+stats.misses+stats.penalties)>0?Math.round((stats.hits/(stats.hits+stats.misses+stats.penalties))*100):0;
  const slowest=stats.times.length>0?Math.max(...stats.times):null;
  const buckets=[{l:"<0.5s",min:0,max:500,c:C.green},{l:"0.5-1s",min:500,max:1000,c:C.greenBright},{l:"1-2s",min:1000,max:2000,c:C.yellow},{l:"2-3s",min:2000,max:3000,c:C.orange},{l:">3s",min:3000,max:Infinity,c:C.red}];
  const bc=buckets.map(b=>({...b,n:stats.times.filter(t=>t>=b.min&&t<b.max).length}));const mx=Math.max(...bc.map(b=>b.n),1);
  return(<div className="menu-bg"><div className="grid-bg"/><div className="menu-inner" style={{maxWidth:500}}>
    <div style={{fontSize:36,marginBottom:8}}>📊</div>
    <h2 style={{fontSize:28,fontWeight:900,color:C.text,marginBottom:6,letterSpacing:-1}}>SESSION COMPLETE</h2>
    <div style={{fontSize:10,color:C.textDim,letterSpacing:4,marginBottom:24}}>{stats.hits+stats.misses+stats.penalties} ROUNDS PLAYED</div>
    <div style={{display:"flex",justifyContent:"center",marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 24px",borderRadius:12,background:`linear-gradient(145deg,${C.bgCard},${C.bgElevated})`,border:`1px solid ${rank.color}20`,boxShadow:rank.glow}}><span style={{fontSize:28,color:rank.color}}>{rank.icon}</span><div><div style={{fontSize:14,fontWeight:900,color:rank.color,letterSpacing:2}}>{rank.tier}</div><div style={{fontSize:9,color:C.textDim,marginTop:2}}>{avg!==null?`avg ${(avg/1000).toFixed(3)}s`:"—"}</div></div></div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
      {[["SCORE",stats.score,C.green],["ACCURACY",`${acc}%`,acc>=80?C.green:acc>=50?C.yellow:C.red],["BEST STREAK",stats.bestStreak,C.orange],["FASTEST",stats.bestTime!==null?`${(stats.bestTime/1000).toFixed(3)}s`:"—",C.cyan],["SLOWEST",slowest!==null?`${(slowest/1000).toFixed(2)}s`:"—",C.red],["MISSES",stats.misses+stats.penalties,C.red]].map(([l,v,c])=>(<div key={l} className="glass-card" style={{padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:7,color:C.textDim,letterSpacing:2,marginBottom:4}}>{l}</div><div style={{fontSize:16,fontWeight:900,color:c,fontFamily:"var(--mono)"}}>{v}</div></div>))}
    </div>
    <div className="glass-card" style={{marginBottom:20}}><div style={{fontSize:8,color:C.textDim,letterSpacing:2,marginBottom:12}}>RT DISTRIBUTION</div><div style={{display:"flex",alignItems:"flex-end",gap:6,height:80}}>{bc.map(b=>(<div key={b.l} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><span style={{fontSize:9,fontWeight:700,color:b.c,fontFamily:"var(--mono)"}}>{b.n}</span><div style={{width:"100%",height:`${Math.max(4,(b.n/mx)*60)}px`,borderRadius:4,background:`linear-gradient(180deg,${b.c},${b.c}60)`}}/><span style={{fontSize:7.5,color:C.textDim}}>{b.l}</span></div>))}</div></div>
    <button onClick={onBack} className="btn-primary btn-green">Back to Menu</button>
  </div></div>);
}

/* ═══════════════════════════════════════════
   useGameEngine
═══════════════════════════════════════════ */
function useGameEngine(startDiff=1,seed=null){
  const[stats,setStats]=useState({score:0,streak:0,bestStreak:0,bestTime:null,lastTime:null,hits:0,misses:0,penalties:0,times:[]});
  const[roundNum,setRoundNum]=useState(0);const[roundData,setRoundData]=useState(null);
  const[spawned,setSpawned]=useState(new Set());const[txState,setTxState]=useState("idle");
  const[revealed,setRevealed]=useState(false);const[clickedId,setClickedId]=useState(null);
  const[feedback,setFeedback]=useState(null);const[screenFlash,setScreenFlash]=useState(null);
  const[screenShake,setScreenShake]=useState(false);const[comboBurst,setComboBurst]=useState(null);
  const[tweetVis,setTweetVis]=useState(false);const[pairsVis,setPairsVis]=useState(false);
  const[timerRunning,setTimerRunning]=useState(false);const[timerStart,setTimerStart]=useState(null);
  const[liveFeed,setLiveFeed]=useState([]);const[attemptHistory,setAttemptHistory]=useState([]);
  const[holsterPhase,setHolsterPhase]=useState("idle");const[armProgress,setArmProgress]=useState(0);
  const[showCorrect,setShowCorrect]=useState(false);const[isPaused,setIsPaused]=useState(false);
  const armStartRef=useRef(null);const armRafRef=useRef(null);const armTimeoutRef=useRef(null);
  const spawnRef=useRef([]);const fbRef=useRef(null);const nextRef=useRef(null);
  const roundNumRef=useRef(0);const holsterPhaseRef=useRef("idle");const noiseRef=useRef(null);
  const pausedRef=useRef(false);const revealedRef=useRef(false);const pauseStartedRef=useRef(null);
  const pausedSpawnQueueRef=useRef([]);
  const prevMultTier=useRef(0);const seedRef=useRef(seed);seedRef.current=seed;
  useEffect(()=>{roundNumRef.current=roundNum;},[roundNum]);
  useEffect(()=>{holsterPhaseRef.current=holsterPhase;},[holsterPhase]);
  useEffect(()=>{pausedRef.current=isPaused;},[isPaused]);
  useEffect(()=>{revealedRef.current=revealed;},[revealed]);
  const mult=getMult(stats.streak);const multLabel=getMultLabel(stats.streak);const multTier=getMultTier(stats.streak);
  const multColor=multTier>=3?C.red:multTier>=2?C.orange:multTier>=1?C.yellow:C.textDim;
  const pnl=stats.score*mult;const difficulty=roundData?roundData.diff:startDiff;
  // Combo burst on multiplier tier change
  useEffect(()=>{if(multTier>prevMultTier.current&&multTier>0){SFX.combo();setComboBurst(multLabel);setTimeout(()=>setComboBurst(null),900);}prevMultTier.current=multTier;},[multTier,multLabel]);
  const clearAll=useCallback(()=>{spawnRef.current.forEach(clearTimeout);spawnRef.current=[];clearTimeout(fbRef.current);clearTimeout(nextRef.current);clearInterval(noiseRef.current);},[]);
  const flash=useCallback(c=>{setScreenFlash(c);setTimeout(()=>setScreenFlash(null),300);},[]);
  const shake=useCallback(()=>{setScreenShake(true);setTimeout(()=>setScreenShake(false),350);},[]);
  const showFB=useCallback((type,rt=null)=>{setFeedback({id:Date.now(),type,rt});clearTimeout(fbRef.current);fbRef.current=setTimeout(()=>setFeedback(null),1200);},[]);
  const startNoiseFeed=useCallback(interval=>{clearInterval(noiseRef.current);noiseRef.current=setInterval(()=>{if(pausedRef.current)return;const n=genNoiseToken();setLiveFeed(p=>{const nx=[n,...p];return nx.length>40?nx.slice(0,40):nx;});setSpawned(p=>new Set([...p,n.id]));},interval);},[]);
  const launchRound=useCallback(()=>{clearAll();setIsPaused(false);pausedRef.current=false;pauseStartedRef.current=null;pausedSpawnQueueRef.current=[];const num=roundNumRef.current,data=genRound(num+Math.max(0,startDiff-1)*2,seedRef.current);setRoundData(data);setSpawned(new Set());setRevealed(false);setClickedId(null);setShowCorrect(false);setTxState("spawning");setTweetVis(false);setPairsVis(false);setTimerRunning(false);setTimerStart(null);setHolsterPhase("live");setLiveFeed([]);setTimeout(()=>setTweetVis(true),100);setTimeout(()=>{setPairsVis(true);let si=0;const sn=()=>{if(si>=data.pairs.length){startNoiseFeed(data.noiseInterval);return;}const c=data.pairs[si];si++;if(pausedRef.current){pausedSpawnQueueRef.current.push(c);}else{setLiveFeed(p=>[c,...p]);setSpawned(p=>new Set([...p,c.id]));}const t=setTimeout(sn,data.spawnDelay);spawnRef.current.push(t);};sn();const dl=CFG.antiSpamMin+Math.random()*(CFG.antiSpamMax-CFG.antiSpamMin);setTimeout(()=>{setTxState("waiting");setTimeout(()=>{setTxState("active");setTimerRunning(true);setTimerStart(Date.now());},80);},dl);},400);},[clearAll,startNoiseFeed,startDiff]);
  const cancelArm=useCallback(()=>{cancelAnimationFrame(armRafRef.current);clearTimeout(armTimeoutRef.current);armStartRef.current=null;setArmProgress(0);if(holsterPhaseRef.current==="arming")setHolsterPhase("idle");},[]);
  const startArming=useCallback(()=>{if(holsterPhaseRef.current!=="idle")return;setHolsterPhase("arming");SFX.arm();armStartRef.current=Date.now();const tick=()=>{if(!armStartRef.current)return;const el=Date.now()-armStartRef.current,prog=Math.min(el/CFG.holsterArm,1);setArmProgress(prog);if(prog<1){armRafRef.current=requestAnimationFrame(tick);}else{setHolsterPhase("armed");SFX.armed();armTimeoutRef.current=setTimeout(()=>launchRound(),200);}};armRafRef.current=requestAnimationFrame(tick);},[launchRound]);
  const handleHolsterEnter=useCallback(()=>{if(holsterPhaseRef.current==="idle")startArming();},[startArming]);
  const handleHolsterLeave=useCallback(()=>{if(holsterPhaseRef.current==="arming")cancelArm();},[cancelArm]);
  const handlePauseEnter=useCallback(()=>{if(holsterPhaseRef.current!=="live"||revealedRef.current||pausedRef.current)return;setIsPaused(true);pausedRef.current=true;pauseStartedRef.current=Date.now();},[]);
  const handlePauseLeave=useCallback(()=>{if(!pausedRef.current)return;pausedRef.current=false;pauseStartedRef.current=null;setIsPaused(false);if(pausedSpawnQueueRef.current.length){const queued=pausedSpawnQueueRef.current;pausedSpawnQueueRef.current=[];setLiveFeed(p=>[...queued.slice().reverse(),...p]);setSpawned(p=>new Set([...p,...queued.map(c=>c.id)]));}},[]);
  const finishRound=useCallback(ok=>{clearInterval(noiseRef.current);setIsPaused(false);pausedRef.current=false;pauseStartedRef.current=null;pausedSpawnQueueRef.current=[];if(!ok)setShowCorrect(true);setHolsterPhase("cooldown");setTimeout(()=>{setRoundNum(p=>p+1);setHolsterPhase("idle");setArmProgress(0);setShowCorrect(false);},ok?1000:2000);},[]);
  const handleBuy=useCallback((coin,e)=>{if(revealed)return;SFX.click();if(txState==="waiting"||txState==="spawning"){clearAll();setTxState("penalty");setRevealed(true);setTimerRunning(false);setClickedId(coin.id);showFB("penalty");flash("red");shake();SFX.penalty();setStats(p=>({...p,streak:0,penalties:p.penalties+1}));setAttemptHistory(p=>[...p,{id:Date.now(),type:"penalty",rt:null,round:roundNumRef.current+1}]);finishRound(false);return;}if(txState!=="active")return;const rt=Math.max(0,Date.now()-timerStart);setTimerRunning(false);setRevealed(true);setClickedId(coin.id);clearAll();if(coin.isCorrect){setTxState("hit");showFB("hit",rt);flash("green");SFX.hit();setStats(p=>{const ns=p.streak+1;return{...p,score:p.score+1,streak:ns,bestStreak:Math.max(p.bestStreak,ns),bestTime:p.bestTime===null?rt:Math.min(p.bestTime,rt),lastTime:rt,hits:p.hits+1,times:[...p.times,rt]};});setAttemptHistory(p=>[...p,{id:Date.now(),type:"hit",rt,round:roundNumRef.current+1}]);finishRound(true);}else{setTxState("missed");showFB("wrong",rt);flash("red");shake();SFX.miss();setStats(p=>({...p,streak:0,misses:p.misses+1,lastTime:rt}));setAttemptHistory(p=>[...p,{id:Date.now(),type:"wrong",rt,round:roundNumRef.current+1}]);finishRound(false);}},[txState,revealed,timerStart,clearAll,showFB,flash,shake,finishRound]);
  const reset=useCallback(()=>{clearAll();cancelAnimationFrame(armRafRef.current);clearTimeout(armTimeoutRef.current);clearInterval(noiseRef.current);setStats({score:0,streak:0,bestStreak:0,bestTime:null,lastTime:null,hits:0,misses:0,penalties:0,times:[]});setRoundNum(0);roundNumRef.current=0;setRoundData(null);setSpawned(new Set());setTxState("idle");setRevealed(false);setClickedId(null);setFeedback(null);setScreenFlash(null);setScreenShake(false);setComboBurst(null);setTweetVis(false);setPairsVis(false);setTimerRunning(false);setTimerStart(null);setLiveFeed([]);setAttemptHistory([]);setHolsterPhase("idle");setArmProgress(0);setShowCorrect(false);setIsPaused(false);pausedRef.current=false;pauseStartedRef.current=null;pausedSpawnQueueRef.current=[];},[clearAll]);
  useEffect(()=>()=>{clearAll();cancelAnimationFrame(armRafRef.current);clearTimeout(armTimeoutRef.current);},[clearAll]);
  return{stats,roundData,spawned,txState,revealed,clickedId,feedback,screenFlash,screenShake,comboBurst,showCorrect,isPaused,tweetVis,pairsVis,timerRunning,timerStart,liveFeed,attemptHistory,holsterPhase,armProgress,mult,multLabel,multColor,pnl,difficulty,roundNum,handleHolsterEnter,handleHolsterLeave,handlePauseEnter,handlePauseLeave,handleBuy,reset};
}

/* ═══════════════════════════════════════════
   GAME VIEW
═══════════════════════════════════════════ */
function GameView({engine,onExit,rightPanel}){
  const g=engine;
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"var(--mono)",color:C.text,overflow:"hidden",position:"relative"}} className={g.screenShake?"shake":""}>
      {g.screenFlash&&<div className="screen-flash" style={{background:g.screenFlash==="green"?`radial-gradient(ellipse at center,rgba(72,187,120,0.1) 0%,transparent 65%)`:`radial-gradient(ellipse at center,rgba(245,101,101,0.1) 0%,transparent 65%)`}}/>}
      {g.comboBurst&&<div className="combo-burst"><div className="combo-text">{g.comboBurst}</div></div>}
      <div className="grid-bg"/>
      {/* HUD */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"8px 12px",gap:0,borderBottom:`1px solid ${C.border}`,background:`linear-gradient(180deg,${C.bgAlt},${C.bg})`,flexShrink:0,zIndex:10,flexWrap:"wrap",position:"relative"}}>
        <div style={{position:"absolute",bottom:0,left:"10%",right:"10%",height:1,background:`linear-gradient(90deg,transparent,${C.green}15,transparent)`,pointerEvents:"none"}}/>
        <HudStat label="SCORE" value={g.stats.score} color={C.green} large/><div className="hud-div"/><HudStat label="PNL" value={g.pnl.toLocaleString()} color={g.pnl>0?C.green:C.textMuted}/><div style={{fontSize:10,fontWeight:900,color:g.multColor,padding:"3px 8px",borderRadius:5,background:`${g.multColor}10`,border:`1px solid ${g.multColor}25`,margin:"0 4px",transition:"all 0.25s"}}>{g.multLabel}</div><div className="hud-div"/><ElapsedTimer startTime={g.timerStart} running={g.timerRunning}/><div className="hud-div"/><HudStat label="STREAK" value={g.stats.streak>0?g.stats.streak:"—"} color={g.stats.streak>=13?C.red:g.stats.streak>=8?C.orange:g.stats.streak>=4?C.yellow:C.textDim}/><div className="hud-div"/><HudStat label="BEST" value={g.stats.bestTime!==null?`${(g.stats.bestTime/1000).toFixed(2)}s`:"—"} color={C.cyan}/><div className="hud-div"/><HudStat label="LAST" value={g.stats.lastTime!==null?`${(g.stats.lastTime/1000).toFixed(2)}s`:"—"} color={C.blue}/><div className="hud-div"/><HudStat label="RND" value={g.roundNum+1} color={C.textMuted}/><div className="hud-div"/><HudStat label="DIFF" value={`Lv${g.difficulty}`} color={g.difficulty>=8?C.red:g.difficulty>=5?C.yellow:C.green}/>
        {onExit&&<div style={{marginLeft:10}}><button onClick={onExit} className="btn-ghost">END</button></div>}
      </div>
      {/* 3 COLS */}
      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
        {/* COL1 */}
        <div style={{width:"37%",minWidth:300,maxWidth:460,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",background:C.bg,flexShrink:0}}>
          <div className="col-header" style={{gap:8}}>
            <span style={{fontWeight:800,fontSize:12,color:C.text}}>𝕏 Tracker</span>
            <div style={{flex:1}}/>
            {["🔇","▽","📌","↗","✕"].map((s,i)=><span key={i} style={{color:C.textGhost,fontSize:10,cursor:"pointer",padding:"0 2px"}}>{s}</span>)}
          </div>
          <div style={{flex:1,overflowY:"auto"}}>{g.tweetVis&&g.roundData?<><XTweet data={g.roundData.tweet} isSignal animDelay={0}/>{g.roundData.fillers.map((ft,i)=><XTweet key={i} data={ft} isSignal={false} animDelay={300+i*350}/>)}</>:<div className="empty-msg">Arm the holster to<br/>start a round</div>}</div>
        </div>
        {/* COL2 */}
        <div style={{flex:1,minWidth:300,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",background:C.bg,flexShrink:0}} onMouseEnter={g.handlePauseEnter} onMouseLeave={g.handlePauseLeave}>
          {/* Trenches header */}
          <div className="col-header" style={{padding:"8px 12px"}}>
            <span style={{fontWeight:900,fontSize:14,color:C.text}}>Trenches</span>
            <span style={{fontSize:11,color:C.textDim,cursor:"pointer"}}>≡</span>
            <span className="badge-beta">Beta</span>
            <div style={{flex:1}}/>
            {g.isPaused&&<span style={{fontSize:9,fontWeight:800,letterSpacing:1.8,color:C.yellow,padding:"3px 7px",borderRadius:6,border:`1px solid ${C.yellow}40`,background:`${C.yellow}12`}}>PAUSED</span>}
          </div>
          {/* Sub nav */}
          <div style={{display:"flex",alignItems:"center",padding:"5px 12px",borderBottom:`1px solid ${C.border}`,gap:8,flexShrink:0}}>
            <span style={{color:C.text,fontSize:10.5,fontWeight:700}}>New</span>
            <div style={{flex:1}}/>
            <span style={{color:C.textDim,fontSize:10}}>Search</span>
            {["⚡","8","≡","📈","🔇","▽"].map((s,i)=><span key={i} style={{color:C.textGhost,fontSize:9,cursor:"pointer",padding:"0 1px"}}>{s}</span>)}
          </div>
          <div style={{flex:1,overflowY:"auto",position:"relative"}}>{g.pairsVis&&g.liveFeed.length>0?g.liveFeed.map(coin=><TokenRow key={coin.id} coin={coin} spawned={g.spawned.has(coin.id)} txState={g.txState} revealed={g.revealed} clickedId={g.clickedId} onBuy={g.handleBuy} showCorrect={g.showCorrect}/>):<div className="empty-msg">Tokens appear here<br/>once round is armed</div>}{g.feedback&&<div className="feedback-wrap"><div className={`feedback-pill ${g.feedback.type==="hit"?"fb-hit":"fb-miss"}`}>{g.feedback.type==="hit"?`SNIPED ${(g.feedback.rt/1000).toFixed(2)}s ✅`:g.feedback.type==="penalty"?"TOO EARLY ⛔":g.feedback.rt?`WRONG ${(g.feedback.rt/1000).toFixed(2)}s ❌`:"WRONG ❌"}</div></div>}</div>
        </div>
        {/* COL3 */}
        <div style={{flex:1,display:"flex",flexDirection:"column",background:C.bg,position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"14px 16px 12px",gap:14,flexShrink:0,borderBottom:`1px solid ${C.border}`,cursor:"crosshair",background:g.isPaused?`radial-gradient(ellipse at center,rgba(236,201,75,0.06) 0%,transparent 70%)`:g.holsterPhase==="armed"?`radial-gradient(ellipse at center,rgba(72,187,120,0.06) 0%,transparent 70%)`:g.holsterPhase==="arming"?`radial-gradient(ellipse at center,rgba(236,201,75,0.04) 0%,transparent 70%)`:"none",position:"relative",overflow:"hidden"}} onMouseEnter={g.handleHolsterEnter} onMouseLeave={g.handleHolsterLeave}>
            {g.holsterPhase==="armed"&&<div style={{position:"absolute",inset:0,background:`linear-gradient(0deg,transparent 49.5%,rgba(72,187,120,0.03) 50%,transparent 50.5%)`,backgroundSize:"100% 4px",pointerEvents:"none",animation:"fadeIn 0.3s ease"}}/>}
            <div style={{width:46,height:46,position:"relative",flexShrink:0,opacity:g.holsterPhase==="arming"||g.holsterPhase==="armed"?1:g.holsterPhase==="live"?.3:.12,transition:"opacity 0.4s"}}><svg width={46} height={46} style={{position:"absolute",top:0,left:0}}><circle cx={23} cy={23} r={19} fill="none" stroke={g.holsterPhase==="armed"?C.green:g.holsterPhase==="arming"?C.yellow:C.border} strokeWidth={1.5} strokeDasharray={g.holsterPhase==="arming"?`${g.armProgress*119.4} 119.4`:"119.4 0"} strokeLinecap="round" style={{transition:"stroke 0.2s",transform:"rotate(-90deg)",transformOrigin:"center",filter:g.holsterPhase==="armed"?`drop-shadow(0 0 6px ${C.green}50)`:"none"}}/></svg><div style={{position:"absolute",top:"50%",left:7,right:7,height:1,background:g.holsterPhase==="armed"?C.green:g.holsterPhase==="arming"?`${C.yellow}60`:C.border}}/><div style={{position:"absolute",left:"50%",top:7,bottom:7,width:1,background:g.holsterPhase==="armed"?C.green:g.holsterPhase==="arming"?`${C.yellow}60`:C.border}}/><div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:g.holsterPhase==="armed"?7:4,height:g.holsterPhase==="armed"?7:4,borderRadius:"50%",background:g.holsterPhase==="armed"?C.green:g.holsterPhase==="arming"?C.yellow:C.border,boxShadow:g.holsterPhase==="armed"?`0 0 12px ${C.green}60`:"none",transition:"all 0.2s",animation:g.holsterPhase==="armed"?"holsterPulse 1s ease-in-out infinite":"none"}}/></div>
            <div style={{textAlign:"left"}}><div style={{fontSize:10,fontWeight:700,letterSpacing:2.5,color:g.isPaused?C.yellow:g.holsterPhase==="armed"?C.green:g.holsterPhase==="arming"?C.yellow:g.holsterPhase==="cooldown"?C.red:g.holsterPhase==="live"?`${C.green}70`:C.textGhost,textTransform:"uppercase",transition:"color 0.25s",textShadow:g.holsterPhase==="armed"&&!g.isPaused?`0 0 10px ${C.green}30`:"none"}}>{g.isPaused?"PAUSED":g.holsterPhase==="armed"?"ARMED — GO":g.holsterPhase==="arming"?`ARMING ${Math.round(g.armProgress*100)}%`:g.holsterPhase==="cooldown"?"COOLDOWN":g.holsterPhase==="live"?"ROUND LIVE":"HOVER TO ARM"}</div>{g.isPaused?<div style={{fontSize:8.5,color:C.textDim,marginTop:3}}>Leave holster zone to resume</div>:g.holsterPhase==="idle"&&<div style={{fontSize:8.5,color:C.textGhost,marginTop:3}}>Rest mouse here for 0.8s</div>}</div>
          </div>
          {rightPanel||<PerfPanel stats={g.stats} history={g.attemptHistory}/>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PRACTICE MODE
═══════════════════════════════════════════ */
function PracticeMode({startDiff=1,onSessionComplete,onScreenChange}){
  const[screen,setScreen]=useState("menu"); // menu | playing | summary
  const engine=useGameEngine(startDiff);
  const summarySavedRef=useRef(false);
  const start=()=>{engine.reset();setScreen("playing");};
  const practiceSteps=[["01","Hold HOLSTER 0.8s to arm",C.text],["02","Read signal tweet first",C.text],["03","Tap TX NOW on match",C.green],["04","Traps use partial matches",C.yellow],["05","Clicking during WAIT = penalty",C.red],["06","Streaks boost PnL to x3",C.orange]];
  useEffect(()=>{onScreenChange?.(screen);},[screen,onScreenChange]);
  useEffect(()=>{
    if(screen==="menu"){summarySavedRef.current=false;return;}
    if(screen!=="summary"||summarySavedRef.current)return;
    const rounds=engine.stats.hits+engine.stats.misses+engine.stats.penalties;
    if(rounds>0){
      summarySavedRef.current=true;
      onSessionComplete?.(engine.stats);
    }
  },[screen,engine.stats,onSessionComplete]);
  if(screen==="summary")return <SessionSummary stats={engine.stats} history={engine.attemptHistory} onBack={()=>{engine.reset();setScreen("menu");}}/>;
  if(screen==="menu")return(
    <div className="menu-bg prac-page"><div className="grid-bg"/>
      <div className="menu-glow-orb green"/>
      <div className="prac-shell">

        {/* ── LEFT: Brand ── */}
        <div className="prac-brand">
          <div style={{fontSize:9,letterSpacing:4,color:C.green,fontWeight:700,textTransform:"uppercase",marginBottom:14}}>Solo Training</div>
          <div style={{fontSize:68,lineHeight:1,filter:`drop-shadow(0 0 40px rgba(74,222,128,0.5))`,animation:"float 3.2s ease-in-out infinite",marginBottom:16}}>⚔️</div>
          <h1 style={{fontSize:52,fontWeight:900,letterSpacing:-3,color:C.greenBright,lineHeight:1,marginBottom:8}}>TRENCHES</h1>
          <div style={{fontSize:10,color:C.textDim,letterSpacing:7,textTransform:"uppercase",marginBottom:20,fontWeight:600}}>Reaction Trainer</div>
          <p style={{fontSize:14,color:C.textMuted,lineHeight:1.8,marginBottom:28,maxWidth:300}}>
            Read the signal. Snipe the token.<br/>Build your streak. Climb the ranks.
          </p>
          {/* Stats row */}
          <div style={{display:"flex",width:"100%",maxWidth:320,background:`linear-gradient(145deg,${C.bgCard},${C.bgAlt})`,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
            {[["Lv"+startDiff,"START LEVEL",C.green],["x3","MAX MULT",C.orange],["10","LEVELS",C.cyan]].map(([val,lbl,col],i,arr)=>(
              <div key={lbl} style={{flex:1,padding:"16px 0",textAlign:"center",borderRight:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{fontSize:20,fontWeight:900,color:col,letterSpacing:-0.5}}>{val}</div>
                <div style={{fontSize:8,color:C.textDim,letterSpacing:1.8,marginTop:4,fontWeight:600}}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: How To Play + CTA ── */}
        <div className="prac-right">
          <div className="practice-card">
            <div className="practice-card-title">How To Play</div>
            <div className="practice-steps">
              {practiceSteps.map(([n,t,c],i)=>(
                <div key={i} className="practice-step" style={{animationDelay:`${100+i*60}ms`}}>
                  <span className="practice-step-num" style={{color:c}}>{n}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <div className="practice-card-foot">Speed beats hesitation</div>
          </div>
          <button onClick={start} className="btn-primary btn-green" style={{width:"100%",fontSize:14,padding:"16px 24px",letterSpacing:2.5,marginTop:4}}>
            Start Training →
          </button>
        </div>

      </div>
    </div>);
  return <GameView engine={engine} onExit={()=>setScreen("summary")}/>;
}

/* ═══════════════════════════════════════════
   1v1 MODE
═══════════════════════════════════════════ */
function OneVOneMode({onMatchComplete}){
  const[phase,setPhase]=useState("lobby");const[gameCode,setGameCode]=useState("");const[joinCode,setJoinCode]=useState("");const[isHost,setIsHost]=useState(false);const[playerName,setPlayerName]=useState("");const[opponentName,setOpponentName]=useState("");const[opponentStats,setOpponentStats]=useState(null);const[matchResult,setMatchResult]=useState(null);
  const[bestOf,setBestOf]=useState(10);const[gameSeed,setGameSeed]=useState(null);const[isPublicLobby,setIsPublicLobby]=useState(true);const[publicLobbies,setPublicLobbies]=useState([]);
  const[countdown,setCountdown]=useState(null);
  const countdownRef=useRef(null);
  const supabaseWarnedRef=useRef(false);const lobbyPollRef=useRef(null);
  const resultSavedRef=useRef(false);
  const engine=useGameEngine(1,gameSeed);const pollRef=useRef(null);
  const[playerId]=useState(()=>`player-${Date.now()}-${Math.random().toString(36).slice(2,6)}`);

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
    <div className="menu-bg" style={{minHeight:"100%",height:"100%",justifyContent:"flex-start",paddingTop:36,paddingBottom:140,overflowY:"auto",overflowX:"hidden",backgroundImage:`linear-gradient(rgba(74,222,128,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(74,222,128,0.022) 1px,transparent 1px)`,backgroundSize:"60px 60px"}}><div className="menu-inner" style={{maxWidth:560,paddingBottom:180}}>
      <div style={{fontSize:52,marginBottom:8}}>⚔️</div>
      <h1 className="title-text" style={{color:C.orange}}>1v1 DUEL</h1>
      <div style={{fontSize:10.5,color:C.textDim,letterSpacing:7,marginBottom:24,fontWeight:500}}>COMPETE HEAD TO HEAD</div>
      <div style={{marginBottom:16,opacity:0,animation:"slideUp 0.4s ease 100ms forwards"}}><div style={{fontSize:8,color:C.textDim,letterSpacing:2.5,marginBottom:6,textAlign:"left"}}>YOUR NAME</div><input value={playerName} onChange={e=>setPlayerName(e.target.value)} placeholder="Enter name..." className="input-field"/></div>
      <div style={{marginBottom:16,opacity:0,animation:"slideUp 0.4s ease 150ms forwards"}}><div style={{fontSize:8,color:C.textDim,letterSpacing:2.5,marginBottom:6,textAlign:"left"}}>FORMAT</div><div style={{display:"flex",gap:6}}>{[5,10,20].map(n=>{const ac=bestOf===n;return(<button key={n} onClick={()=>setBestOf(n)} style={{flex:1,padding:"8px 0",borderRadius:8,border:`1px solid ${ac?C.orange:C.border}`,background:ac?`${C.orange}12`:C.bgCard,color:ac?C.orange:C.textDim,fontSize:11,fontWeight:ac?800:600,fontFamily:"var(--mono)",cursor:"pointer"}}>Best of {n}</button>);})}</div></div>
      <div className="glass-card" style={{marginBottom:14,opacity:0,animation:"slideUp 0.4s ease 200ms forwards"}}><div style={{fontSize:8.5,color:C.orange,fontWeight:700,letterSpacing:2.5,marginBottom:10}}>CREATE GAME</div><p style={{fontSize:11,color:C.textMuted,marginBottom:10,lineHeight:1.6}}>Create a room and share the code with your opponent.</p><label style={{display:"flex",alignItems:"center",gap:8,fontSize:10,color:C.textMuted,marginBottom:12,cursor:"pointer"}}><input type="checkbox" checked={isPublicLobby} onChange={e=>setIsPublicLobby(e.target.checked)} style={{accentColor:C.green}}/><span>Public lobby (appears in live list)</span></label><button onClick={createGame} className="btn-primary btn-orange btn-static">Create Room</button></div>
      <div className="glass-card" style={{marginBottom:14,opacity:0,animation:"slideUp 0.4s ease 300ms forwards"}}>
        <div style={{fontSize:8.5,color:C.blue,fontWeight:700,letterSpacing:2.5,marginBottom:10}}>JOIN BY CODE</div>
        <div style={{display:"flex",gap:10,alignItems:"stretch"}}>
          <input
            value={joinCode}
            onChange={e=>setJoinCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            maxLength={6}
            className="input-field"
            style={{flex:1,textAlign:"center",fontSize:22,fontWeight:900,letterSpacing:6,height:52,lineHeight:1,padding:"0 14px"}}
          />
          <button onClick={joinGame} className="btn-primary btn-blue btn-static" style={{width:108,height:52,padding:0,fontSize:13,display:"inline-flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>
            JOIN
          </button>
        </div>
      </div>
      <div className="glass-card" style={{marginBottom:18,opacity:0,animation:"slideUp 0.4s ease 360ms forwards"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}><div style={{fontSize:8.5,color:C.green,fontWeight:700,letterSpacing:2.5}}>PUBLIC LOBBIES</div><button onClick={fetchPublicLobbies} className="btn-ghost" style={{fontSize:8,padding:"4px 8px"}}>Refresh</button></div>{publicLobbies.length===0?<div style={{fontSize:10,color:C.textGhost}}>No public lobbies right now.</div>:<div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:220,overflowY:"auto"}}>{publicLobbies.map((l)=>(<div key={l.code} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.bgCard}}><div style={{minWidth:0}}><div style={{fontSize:11,color:C.text,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l.host_name||"Host"}</div><div style={{fontSize:9,color:C.textDim,marginTop:2}}>Code {l.code} • Best of {l.best_of}</div></div><button onClick={()=>joinPublicLobby(l.code)} className="btn-primary btn-blue btn-static" style={{width:"auto",padding:"7px 12px",fontSize:10,letterSpacing:1}}>Join</button></div>))}</div>}</div>
    </div></div>);

  if(phase==="waiting")return(
    <div className="menu-bg"><div className="grid-bg"/><div className="menu-inner" style={{maxWidth:420}}>
      <div style={{fontSize:32,marginBottom:12}}>DUEL</div>
      <h2 style={{fontSize:24,fontWeight:900,color:C.text,marginBottom:24,letterSpacing:-0.5}}>WAITING ROOM</h2>
      <div className="glass-card" style={{marginBottom:22,textAlign:"center"}}><div style={{fontSize:8,color:C.textDim,letterSpacing:3,marginBottom:10}}>GAME CODE</div><div style={{fontSize:40,fontWeight:900,letterSpacing:10,color:C.orange,textShadow:`0 0 25px ${C.orange}30`,fontFamily:"var(--mono)"}}>{gameCode}</div><div style={{fontSize:9,color:C.textDim,marginTop:10}}>Share this code with your opponent</div><div style={{fontSize:9,color:C.orange,marginTop:6,fontWeight:700}}>Best of {bestOf} • {isPublicLobby?"Public":"Private"}</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:22}}><div className="glass-card" style={{textAlign:"center",borderColor:`${C.green}18`}}><div style={{fontSize:8,color:C.green,letterSpacing:2.5,marginBottom:8}}>YOU</div><div style={{fontSize:15,fontWeight:800,color:C.text}}>{playerName||"Player"}</div><div style={{fontSize:9,color:C.green,marginTop:5}}>✓ READY</div></div><div className="glass-card" style={{textAlign:"center",borderColor:opponentName?`${C.orange}18`:C.border}}><div style={{fontSize:8,color:C.orange,letterSpacing:2.5,marginBottom:8}}>OPPONENT</div>{opponentName?<><div style={{fontSize:15,fontWeight:800,color:C.text}}>{opponentName}</div><div style={{fontSize:9,color:C.green,marginTop:5}}>✓ CONNECTED</div></>:<><div style={{fontSize:15,color:C.textDim,marginTop:4}}>...</div><div style={{fontSize:9,color:C.textDim,marginTop:5,animation:"pulse 2s ease-in-out infinite"}}>Waiting</div></>}</div></div>
      {isHost&&opponentName&&<button onClick={startMatch} className="btn-primary btn-orange" style={{marginBottom:12}}>START DUEL</button>}
      <button onClick={backToLobby} className="btn-primary" style={{background:"transparent",color:C.textDim,border:`1px solid ${C.border}`,boxShadow:"none",fontSize:11}}>Leave</button>
    </div></div>);

  if(phase==="results"&&matchResult)return(
    <div className="menu-bg"><div className="grid-bg"/><div className="menu-inner" style={{maxWidth:440}}>
      <div style={{fontSize:64,marginBottom:12,animation:"float 2s ease-in-out infinite"}}>{matchResult.win?"🏆":"💀"}</div>
      <h2 style={{fontSize:32,fontWeight:900,color:matchResult.win?C.green:C.red,marginBottom:8,letterSpacing:-1}}>{matchResult.win?"VICTORY":"DEFEAT"}</h2>
      <div style={{fontSize:10.5,color:C.textDim,letterSpacing:4,marginBottom:28}}>{matchResult.myScore===matchResult.oppScore?"TIE GAME":matchResult.win?"YOU OUT-SNIPED THEM":"THEY WERE FASTER"}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:28}}><div className="glass-card" style={{textAlign:"center",borderColor:`${C.green}20`}}><div style={{fontSize:8,color:C.green,letterSpacing:2.5,marginBottom:8}}>YOU</div><div style={{fontSize:38,fontWeight:900,color:C.green,textShadow:`0 0 20px ${C.green}25`}}>{matchResult.myScore}</div><div style={{fontSize:9.5,color:C.textDim,marginTop:5}}>hits</div></div><div className="glass-card" style={{textAlign:"center",borderColor:`${C.orange}20`}}><div style={{fontSize:8,color:C.orange,letterSpacing:2.5,marginBottom:8}}>OPPONENT</div><div style={{fontSize:38,fontWeight:900,color:C.orange,textShadow:`0 0 20px ${C.orange}25`}}>{matchResult.oppScore}</div><div style={{fontSize:9.5,color:C.textDim,marginTop:5}}>hits</div></div></div>
      <button onClick={backToLobby} className="btn-primary btn-green">Back to Lobby</button>
    </div></div>);

  const oppPanel=(<div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}><div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}><div style={{fontSize:8.5,color:C.orange,letterSpacing:2.5,marginBottom:10,fontWeight:700}}>OPPONENT — {opponentName||"..."}</div>{opponentStats?(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[["SCORE",`${opponentStats.score}`,opponentStats.score>engine.stats.score?C.red:C.textDim],["STREAK",`${opponentStats.streak||"—"}`,opponentStats.streak>=4?C.yellow:C.textDim],["BEST",opponentStats.bestTime?`${(opponentStats.bestTime/1000).toFixed(2)}s`:"—",C.orange],["LAST",opponentStats.lastTime?`${(opponentStats.lastTime/1000).toFixed(2)}s`:"—",C.blue]].map(([l,v,c])=>(<div key={l} style={{padding:"6px 9px",borderRadius:6,background:C.bgCard,border:`1px solid ${C.border}`}}><div style={{fontSize:7,color:C.textDim,letterSpacing:2,marginBottom:2}}>{l}</div><div style={{fontSize:13,fontWeight:800,color:c,fontFamily:"var(--mono)"}}>{v}</div></div>))}</div>):(<div style={{fontSize:10,color:C.textGhost,animation:"pulse 2s ease-in-out infinite"}}>Syncing...</div>)}</div><div style={{height:1,background:C.border,flexShrink:0}}/><PerfPanel stats={engine.stats} history={engine.attemptHistory}/></div>);

  return <GameView engine={engine} onExit={endMatch} rightPanel={oppPanel}/>;
}

/* ═══════════════════════════════════════════
   APP
═══════════════════════════════════════════ */
function ProfileTab({session,stats,loading,msg,onRefresh}){
  const rounds=stats.practice_rounds;
  const practiceAcc=rounds>0?Math.round((stats.practice_hits/rounds)*100):0;
  const duelWinRate=stats.duel_matches>0?Math.round((stats.duel_wins/stats.duel_matches)*100):0;
  const avgDuelFor=stats.duel_matches>0?(stats.duel_score_for/stats.duel_matches).toFixed(1):"0.0";
  const username=session?.user?.user_metadata?.username||session?.user?.email?.split("@")[0]||"signed in";

  return(
    <div className="menu-bg practice-menu-bg">
      <div className="grid-bg"/>
      <div className="menu-glow-orb green"/>
      <div className="menu-inner" style={{maxWidth:1060,width:"100%",textAlign:"left",paddingBottom:24}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <div>
            <div style={{fontSize:10,color:C.textDim,letterSpacing:3,marginBottom:6}}>PLAYER PROFILE</div>
            <h2 style={{fontSize:34,fontWeight:900,color:C.text,letterSpacing:-1}}>{username}</h2>
          </div>
          <button onClick={onRefresh} className="btn-ghost" style={{fontSize:10,padding:"8px 12px"}}>REFRESH</button>
        </div>
        {msg&&<div className="glass-card" style={{marginBottom:12,padding:"10px 12px",color:C.red,fontSize:10}}>{msg}</div>}
        {loading?<div className="glass-card" style={{fontSize:11,color:C.textDim}}>Loading stats...</div>:<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
            <div className="glass-card" style={{padding:"20px 22px",minHeight:360}}>
              <div style={{fontSize:9,color:C.green,letterSpacing:2.2,marginBottom:12,fontWeight:800}}>PRACTICE</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["Sessions",stats.practice_sessions],["Rounds",stats.practice_rounds],["Accuracy",`${practiceAcc}%`],["Best RT",stats.practice_best_time!==null?`${(stats.practice_best_time/1000).toFixed(3)}s`:"—"],["Best Streak",stats.practice_best_streak],["Miss+Early",stats.practice_misses+stats.practice_penalties]].map(([l,v])=>(<div key={l} style={{padding:"14px 12px",borderRadius:8,background:C.bgCard,border:`1px solid ${C.border}`,minHeight:78}}><div style={{fontSize:8,color:C.textDim,letterSpacing:1.4,marginBottom:6}}>{l}</div><div style={{fontSize:16,fontWeight:800,color:C.text}}>{v}</div></div>))}
              </div>
            </div>
            <div className="glass-card" style={{padding:"20px 22px",minHeight:360}}>
              <div style={{fontSize:9,color:C.orange,letterSpacing:2.2,marginBottom:12,fontWeight:800}}>1V1</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["Matches",stats.duel_matches],["Wins",stats.duel_wins],["Losses",stats.duel_losses],["Draws",stats.duel_draws],["Win Rate",`${duelWinRate}%`],["Avg Score",avgDuelFor],["Best Score",stats.duel_best_score],["Score Diff",stats.duel_score_for-stats.duel_score_against]].map(([l,v])=>(<div key={l} style={{padding:"14px 12px",borderRadius:8,background:C.bgCard,border:`1px solid ${C.border}`,minHeight:78}}><div style={{fontSize:8,color:C.textDim,letterSpacing:1.4,marginBottom:6}}>{l}</div><div style={{fontSize:16,fontWeight:800,color:C.text}}>{v}</div></div>))}
              </div>
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}

function ModePickerScreen({session,onSelect,onLogOut}){
  const username=session?.user?.user_metadata?.username||session?.user?.email?.split("@")[0]||"signed in";
  const pickerAccent=C.yellow;
  const cards=[
    {key:"practice",label:"Practice",desc:"Train reaction speed solo and improve consistency.",icon:"⚡"},
    {key:"1v1",label:"1v1 Duel",desc:"Face another player with synchronized rounds.",icon:"⚔️"},
    {key:"profile",label:"Profile",desc:"Check your stats, records, and progression.",icon:"📊"},
  ];

  return(
    <div className="menu-bg mode-picker-page">
      <div className="grid-bg"/>
      <div className="menu-glow-orb yellow"/>
      <div className="mode-picker-shell">
        <div className="mode-picker-head">
          <div className="mode-picker-kicker">WELCOME BACK</div>
          <h2 className="title-text mode-picker-title">{username}</h2>
          <p className="mode-picker-subtitle">Choose how you want to start. We will remember this and open it automatically next time.</p>
        </div>
        <div className="mode-picker-grid">
          {cards.map((card)=>(
            <button key={card.key} onClick={()=>onSelect(card.key)} className="mode-picker-card" style={{"--pick-accent":pickerAccent}}>
              <div className="mode-picker-icon">{card.icon}</div>
              <div className="mode-picker-label">{card.label}</div>
              <div className="mode-picker-desc">{card.desc}</div>
            </button>
          ))}
        </div>
        <button onClick={onLogOut} className="btn-ghost" style={{fontSize:9,padding:"7px 10px",marginTop:16}}>LOGOUT</button>
      </div>
    </div>
  );
}

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
    }catch(e){setMsg(e?.message||"Auth request failed.");}
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
            <div style={{fontSize:9,color:C.textGhost,letterSpacing:1.5}}>{isLogin?"WELCOME BACK":"CODE REQUIRED"}</div>
          </div>
          <div className="auth-mode-switch">
            <button onClick={()=>setMode("login")} className="auth-mode-btn" style={{background:isLogin?`linear-gradient(135deg,${C.green},${C.greenDim})`:"transparent",color:isLogin?C.bg:C.textDim,borderColor:isLogin?"transparent":C.border}}>Login</button>
            <button onClick={()=>setMode("signup")} className="auth-mode-btn" style={{background:!isLogin?`linear-gradient(135deg,${C.blue},${C.cyan})`:"transparent",color:!isLogin?C.bg:C.textDim,borderColor:!isLogin?"transparent":C.border}}>Sign Up</button>
          </div>
          <div style={{fontSize:8,color:C.textDim,letterSpacing:2.5,marginBottom:6}}>USERNAME</div>
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="yourname" className="input-field auth-input" style={{marginBottom:8}}/>
          <div className="auth-email-hint">{username.trim()?toInternalEmail(username):""}</div>
          <div style={{fontSize:8,color:C.textDim,letterSpacing:2.5,marginTop:12,marginBottom:6}}>PASSWORD</div>
          <input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!busy)submit();}} type="password" placeholder="••••••••" className="input-field auth-input" style={{marginBottom:10}}/>
          {!isLogin&&(
            <>
              <div style={{fontSize:8,color:C.textDim,letterSpacing:2.5,marginTop:2,marginBottom:6}}>ACCESS CODE</div>
              <input value={accessCode} onChange={e=>setAccessCode(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"&&!busy)submit();}} placeholder="ALPHA001" className="input-field auth-input" style={{marginBottom:10,textTransform:"uppercase"}}/>
            </>
          )}
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

export default function App(){
  const router=useRouter();
  const[tab,setTab]=useState("practice");
  const[practiceScreen,setPracticeScreen]=useState("menu");
  const[entryScreen,setEntryScreen]=useState("loading"); // loading | mode-picker | app
  const[startDiff,setStartDiff]=useState(1);
  const[session,setSession]=useState(null);
  const[authReady,setAuthReady]=useState(false);
  const[profileStats,setProfileStats]=useState(EMPTY_PROFILE_STATS);
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
          setEntryScreen("loading");
        }
        setAuthReady(true);
      }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession||null);
      if(!nextSession){
        setProfileStats(EMPTY_PROFILE_STATS);
        setEntryScreen("loading");
      }
    });
    return()=>{active=false;authListener?.subscription?.unsubscribe();};
  },[]);

  const loadProfileStats=useCallback(async({resolveEntry=false}={})=>{
    if(!supabase||!session?.user?.id)return;
    setProfileLoading(true);
    setProfileMsg("");
    const { data, error } = await supabase
      .from("player_profiles")
      .select(PROFILE_SELECT)
      .eq("user_id", session.user.id)
      .maybeSingle();
    setProfileLoading(false);
    if(error){
      setProfileMsg("Could not load profile stats.");
      setProfileStats(EMPTY_PROFILE_STATS);
      if(resolveEntry)setEntryScreen("mode-picker");
      return;
    }
    const nextStats=normalizeProfileStats(data||{});
    setProfileStats(nextStats);
    if(resolveEntry){
      if(data){
        setTab(normalizeModeKey(nextStats.preferred_mode));
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

  const savePreferredMode=useCallback(async(mode)=>{
    const normalized=normalizeModeKey(mode);
    await updateProfileStats((prev)=>({...prev,preferred_mode:normalized}));
  },[updateProfileStats]);

  const handleModeSelect=useCallback((mode,{persist=true,openApp=false}={})=>{
    const normalized=normalizeModeKey(mode);
    setTab(normalized);
    if(openApp)setEntryScreen("app");
    if(persist)void savePreferredMode(normalized);
  },[savePreferredMode]);

  const recordPracticeSession=useCallback(async(practiceStats)=>{
    const rounds=practiceStats.hits+practiceStats.misses+practiceStats.penalties;
    if(rounds<=0)return;
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
  },[updateProfileStats]);

  const recordDuelMatch=useCallback(async(result)=>{
    const isDraw=result.myScore===result.oppScore;
    const isWin=result.myScore>result.oppScore;
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
  },[updateProfileStats]);

  const logOut=async()=>{if(supabase)await supabase.auth.signOut();};

  if(!authReady)return(<div className="menu-bg"><div className="grid-bg"/><div style={{position:"relative",zIndex:1,color:C.textDim,fontSize:12,letterSpacing:2}}>LOADING AUTH...</div><style>{CSS}</style></div>);
  if(!session)return(<><AuthScreen/><style>{CSS}</style></>);
  if(entryScreen==="loading")return(<div className="menu-bg"><div className="grid-bg"/><div style={{position:"relative",zIndex:1,color:C.textDim,fontSize:12,letterSpacing:2}}>LOADING PROFILE...</div><style>{CSS}</style></div>);
  if(entryScreen==="mode-picker")return(<><ModePickerScreen session={session} onSelect={(mode)=>handleModeSelect(mode,{persist:true,openApp:true})} onLogOut={logOut}/><style>{CSS}</style></>);

  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"var(--mono)",overflow:"hidden"}}>
      {/* TAB BAR */}
      <div className="tab-bar">
        <button className="tab-logo tab-logo-btn" onClick={()=>router.push("/")} aria-label="Go to home page"><img src="/logo.png" alt="" style={{height:32,width:"auto",display:"block"}}/></button>
        {[["practice","Practice",C.green],["1v1","1v1",C.orange]].map(([key,label,accent])=>{
          const active=tab===key;
          return(<button key={key} onClick={()=>handleModeSelect(key)} className={`tab-btn ${active?"tab-active":""}`} style={{"--accent":accent}}>{active&&<span className="tab-dot" style={{background:accent,boxShadow:`0 0 8px ${accent}50`}}/>}{label}</button>);
        })}
        {/* Difficulty selector in tab bar when Practice is active */}
        {tab==="practice"&&<div style={{display:"flex",alignItems:"center",gap:3,marginLeft:14,paddingLeft:14,borderLeft:`1px solid ${C.border}`}}>
          <span style={{fontSize:8,color:C.textDim,letterSpacing:1.5,marginRight:4}}>LVL</span>
          {[1,3,5,7,10].map(d=>{const ac=startDiff===d;const canChange=practiceScreen==="menu";const col=d>=8?C.red:d>=5?C.yellow:C.green;return(<button key={d} onClick={()=>{if(canChange)setStartDiff(d);}} disabled={!canChange} style={{width:28,height:22,borderRadius:5,border:`1px solid ${ac?col:C.border}`,background:ac?`${col}18`:"transparent",color:ac?col:C.textGhost,fontSize:9,fontWeight:ac?800:500,fontFamily:"var(--mono)",cursor:canChange?"pointer":"not-allowed",opacity:canChange?1:0.45,transition:"all 0.15s",padding:0}}>{d}</button>);})}
        </div>}
        <div style={{flex:1}}/>
        <div style={{display:"flex",alignItems:"center",gap:8,height:31,padding:"0 8px",border:`1px solid ${C.border}`,borderRadius:8,background:C.bgCard,marginRight:10,marginBottom:-1}}>
          <span style={{display:"flex",alignItems:"center",height:"100%",fontSize:9,lineHeight:1,color:C.textDim,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{session?.user?.user_metadata?.username||session?.user?.email?.split("@")[0]||"signed in"}</span>
          <button
            onClick={()=>handleModeSelect("profile")}
            className="btn-ghost"
            style={{display:"flex",alignItems:"center",justifyContent:"center",height:20,fontSize:8,lineHeight:1,padding:"0 8px",borderColor:tab==="profile"?`${C.blue}66`:C.border,color:tab==="profile"?C.blue:C.textDim}}
          >
            PROFILE
          </button>
          <button onClick={logOut} className="btn-ghost" style={{display:"flex",alignItems:"center",justifyContent:"center",height:20,fontSize:8,lineHeight:1,padding:"0 8px"}}>LOGOUT</button>
        </div>
        <span style={{fontSize:8,color:C.textGhost,letterSpacing:2.5}}>v3.0</span>
      </div>
      <div style={{flex:1,overflow:"hidden",minHeight:0}}>
        {tab==="practice"?<PracticeMode startDiff={startDiff} onSessionComplete={recordPracticeSession} onScreenChange={setPracticeScreen}/>:tab==="1v1"?<OneVOneMode onMatchComplete={recordDuelMatch}/>:<ProfileTab session={session} stats={profileStats} loading={profileLoading} msg={profileMsg} onRefresh={loadProfileStats}/>}
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700;800;900&display=swap');
  :root{--mono:'Geist Mono','IBM Plex Mono','JetBrains Mono',monospace;}
  *{box-sizing:border-box;margin:0;padding:0}
  body{overflow:hidden;background:${C.bg};font-family:var(--mono)}

  /* ── Background ── */
  .grid-bg{position:absolute;inset:0;pointer-events:none;z-index:0;
    background-image:
      linear-gradient(rgba(74,222,128,0.022) 1px,transparent 1px),
      linear-gradient(90deg,rgba(74,222,128,0.022) 1px,transparent 1px);
    background-size:60px 60px;}
  .grid-bg::after{content:'';position:absolute;inset:0;
    background:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity:0.022;mix-blend-mode:overlay;pointer-events:none;}
  .grid-bg-lite::after{display:none;}

  /* ── Tab Bar ── */
  .tab-bar{display:flex;align-items:center;padding:0 20px;height:50px;
    background:linear-gradient(180deg,${C.bgAlt} 0%,${C.bg} 100%);
    border-bottom:1px solid ${C.border};flex-shrink:0;z-index:20;gap:2px;position:relative;}
  .tab-bar::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,transparent 5%,${C.green}28 40%,${C.green}28 60%,transparent 95%);
    pointer-events:none;}
  .tab-logo{display:flex;align-items:center;gap:0;margin-right:24px;font-size:13px;font-weight:900;color:${C.text};letter-spacing:1px;}
  .tab-logo-btn{background:transparent;border:none;padding:0;cursor:pointer;transition:opacity 0.2s;}
  .tab-logo-btn:hover{opacity:0.75;}
  .tab-btn{padding:10px 22px;background:transparent;border:none;border-bottom:2px solid transparent;
    color:${C.textDim};font-size:11px;font-weight:600;font-family:var(--mono);cursor:pointer;
    letter-spacing:2px;transition:all 0.2s;margin-bottom:-1px;
    display:flex;align-items:center;gap:7px;position:relative;}
  .tab-btn:hover{color:${C.textMuted};background:rgba(255,255,255,0.018);}
  .tab-active{color:var(--accent)!important;border-bottom-color:var(--accent)!important;font-weight:800;}
  .tab-active::after{content:'';position:absolute;bottom:-1px;left:20%;right:20%;height:10px;
    background:var(--accent);filter:blur(12px);opacity:0.35;pointer-events:none;}
  .tab-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;animation:pulse 2.5s ease-in-out infinite;}

  /* ── HUD ── */
  .hud-div{width:1px;height:26px;background:linear-gradient(180deg,transparent,${C.border}90,transparent);margin:0 8px;flex-shrink:0;}

  /* ── Column Headers ── */
  .col-header{padding:8px 14px;border-bottom:1px solid ${C.border};display:flex;align-items:center;gap:6px;flex-shrink:0;
    background:linear-gradient(180deg,rgba(255,255,255,0.012),transparent);}
  .badge-beta{font-size:7px;color:${C.green};background:rgba(74,222,128,0.08);padding:2px 7px;border-radius:4px;
    border:1px solid rgba(74,222,128,0.16);letter-spacing:1.8px;font-weight:700;}
  .empty-msg{padding:32px;text-align:center;color:${C.textGhost};font-size:10px;margin-top:44px;line-height:1.9;letter-spacing:0.5px;}

  /* ── Token Row ── */
  .token-row{transition:background 0.12s ease;}
  .token-row:hover{background:rgba(255,255,255,0.01);}

  /* ── Menu Background ── */
  .menu-bg{min-height:100vh;min-height:100dvh;height:auto;width:100%;background:${C.bg};
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-family:var(--mono);color:${C.text};padding:28px;position:relative;overflow:hidden;}
  .menu-inner{position:relative;z-index:1;text-align:center;max-width:500px;width:100%;padding:0 24px;}
  .menu-glow-orb{position:absolute;width:640px;height:640px;border-radius:50%;filter:blur(160px);
    opacity:0.07;pointer-events:none;top:50%;left:50%;transform:translate(-50%,-50%);
    animation:breathe 6s ease-in-out infinite;}
  .menu-glow-orb.green{background:${C.green};}
  .menu-glow-orb.orange{background:${C.orange};}
  .menu-glow-orb.yellow{background:${C.yellow};opacity:0.1;}

  .mode-picker-page{padding:26px 20px;}
  .mode-picker-shell{position:relative;z-index:1;width:min(980px,100%);display:flex;flex-direction:column;align-items:center;text-align:center;}
  .mode-picker-head{margin-bottom:22px;}
  .mode-picker-kicker{font-size:10px;color:${C.yellow};letter-spacing:3px;margin-bottom:8px;font-weight:700;text-shadow:0 0 12px rgba(251,191,36,0.25);}
  .mode-picker-title{font-size:38px;letter-spacing:-1.2px;margin-bottom:10px;color:${C.text};text-shadow:0 0 24px rgba(251,191,36,0.16);}
  .mode-picker-subtitle{font-size:12px;color:${C.textMuted};line-height:1.75;max-width:560px;margin:0 auto;}
  .mode-picker-snapshot{width:min(780px,100%);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px;}
  .mode-snapshot-item{padding:12px 10px;border-radius:12px;border:1px solid ${C.border};background:linear-gradient(145deg,${C.bgCard},${C.bgAlt});text-align:center;}
  .mode-snapshot-label{font-size:8px;letter-spacing:1.6px;color:${C.textDim};margin-bottom:6px;}
  .mode-snapshot-value{font-size:17px;font-weight:900;color:${C.text};font-family:var(--mono);}
  .mode-recommend-card{width:min(780px,100%);padding:11px 13px;border:1px solid ${C.border};border-radius:12px;background:linear-gradient(145deg,rgba(251,191,36,0.08),rgba(251,191,36,0.03));margin-bottom:12px;text-align:left;}
  .mode-recommend-title{font-size:10px;letter-spacing:1.6px;color:${C.yellow};font-weight:800;margin-bottom:4px;}
  .mode-recommend-reason{font-size:11px;color:${C.textMuted};line-height:1.6;}
  .mode-continue-card{width:min(780px,100%);padding:14px 14px;border:1px solid ${C.border};border-radius:14px;background:linear-gradient(145deg,${C.bgCard},${C.bgAlt});margin-bottom:14px;text-align:left;}
  .mode-continue-label{font-size:8px;letter-spacing:2px;color:${C.textDim};margin-bottom:6px;}
  .mode-continue-copy{font-size:12px;color:${C.textMuted};line-height:1.65;margin-bottom:12px;}
  .mode-continue-copy b{color:${C.text};font-weight:800;}
  .mode-continue-actions{display:flex;gap:10px;align-items:center;}
  .mode-continue-btn{width:auto;padding:10px 14px;font-size:10px;letter-spacing:1.2px;}
  .mode-choose-btn{font-size:9px;padding:8px 10px;}
  .mode-picker-grid{width:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}
  .mode-picker-card{
    font-family:var(--mono);
    text-align:left;background:linear-gradient(145deg,${C.bgCard} 0%,${C.bgAlt} 100%);
    border:1px solid ${C.border};border-radius:16px;padding:18px 16px;cursor:pointer;
    box-shadow:0 8px 32px rgba(0,0,0,0.24),inset 0 1px 0 rgba(255,255,255,0.03);
    transition:transform 0.18s ease,border-color 0.18s ease,box-shadow 0.18s ease;
  }
  .mode-picker-card:hover{
    transform:translateY(-2px);
    border-color:color-mix(in srgb,var(--pick-accent) 48%,${C.border});
    box-shadow:0 12px 34px color-mix(in srgb,var(--pick-accent) 16%, transparent),0 8px 32px rgba(0,0,0,0.24);
  }
  .mode-picker-icon{font-size:22px;line-height:1;margin-bottom:12px;color:var(--pick-accent);text-shadow:0 0 12px color-mix(in srgb,var(--pick-accent) 35%, transparent);}
  .mode-picker-label{font-size:14px;font-weight:900;letter-spacing:0.6px;color:${C.text};margin-bottom:7px;}
  .mode-picker-desc{font-size:11px;line-height:1.65;color:${C.textMuted};}

  /* ── Practice Menu (2-col layout) ── */
  .prac-page{justify-content:center;padding:24px 32px;}
  .prac-shell{position:relative;z-index:1;width:min(980px,100%);display:grid;
    grid-template-columns:1fr 1.1fr;gap:56px;align-items:center;}
  .prac-brand{display:flex;flex-direction:column;align-items:flex-start;}
  .prac-right{display:flex;flex-direction:column;gap:14px;}

  /* Keep legacy classes for other uses */
  .practice-menu-bg{justify-content:center;padding:24px 32px;}
  .practice-shell{position:relative;z-index:1;width:min(980px,100%);display:flex;flex-direction:column;align-items:center;gap:16px;}
  .practice-hero{text-align:center;display:flex;flex-direction:column;align-items:center;}
  .practice-kicker{font-size:9px;letter-spacing:4px;color:${C.green};text-transform:uppercase;margin-bottom:10px;font-weight:700;}
  .practice-icon{font-size:62px;line-height:1;filter:drop-shadow(0 0 36px rgba(74,222,128,0.45));
    animation:float 3.2s ease-in-out infinite;margin-bottom:10px;}
  .practice-title{margin-bottom:6px;}
  .practice-subtitle{font-size:10px;color:${C.textDim};letter-spacing:8px;text-transform:uppercase;margin-bottom:14px;font-weight:600;}
  .practice-pills{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;}
  .practice-pill{font-size:9px;letter-spacing:1.2px;color:${C.textMuted};padding:6px 13px;border-radius:999px;
    border:1px solid ${C.border};background:linear-gradient(145deg,${C.bgCard},${C.bgAlt});}
  .practice-pill b{color:${C.greenBright};font-weight:800;}
  .practice-card{width:100%;text-align:center;border-radius:18px;border:1px solid ${C.borderLight};
    background:linear-gradient(145deg,rgba(22,32,50,0.98),rgba(14,20,32,0.97));
    box-shadow:0 14px 52px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.025),inset 0 1px 0 rgba(255,255,255,0.04);
    padding:32px 30px;}
  .practice-card-title{font-size:10px;color:${C.green};font-weight:800;letter-spacing:3.5px;text-transform:uppercase;margin-bottom:18px;}
  .practice-steps{display:grid;grid-template-columns:1fr;row-gap:14px;justify-items:center;}
  .practice-step{display:flex;align-items:center;justify-content:flex-start;gap:10px;font-size:13.5px;line-height:1.55;
    color:${C.textMuted};opacity:0;animation:slideUp 0.35s ease forwards;text-align:left;max-width:420px;width:fit-content;min-width:330px;}
  .practice-step-num{width:30px;flex-shrink:0;text-align:right;font-variant-numeric:tabular-nums;letter-spacing:0.4px;}
  .practice-card-foot{margin-top:18px;padding-top:14px;border-top:1px solid ${C.border};
    font-size:10px;letter-spacing:1.5px;color:${C.textMuted};text-transform:uppercase;}
  .btn-primary.practice-start-btn{width:min(260px,100%);font-size:13px;padding:12px 12px;letter-spacing:2px;}

  /* ── Auth ── */
  .auth-page{padding:24px 18px;overflow-y:auto;}
  .auth-shell{position:relative;z-index:1;width:min(960px,100%);
    display:grid;grid-template-columns:1.15fr 0.85fr;gap:20px;align-items:stretch;}
  .auth-brand-card,.auth-form-card{
    background:linear-gradient(145deg,${C.bgCard} 0%,${C.bgAlt} 100%);
    border:1px solid ${C.border};border-radius:18px;
    box-shadow:0 8px 40px rgba(0,0,0,0.3),0 0 0 1px rgba(255,255,255,0.02),inset 0 1px 0 rgba(255,255,255,0.03);}
  .auth-brand-card{padding:32px 32px;text-align:left;display:flex;flex-direction:column;justify-content:center;}
  .auth-lock{font-size:48px;line-height:1;margin-bottom:16px;filter:drop-shadow(0 0 30px rgba(74,222,128,0.35));}
  .auth-title{font-size:36px;margin-bottom:10px;letter-spacing:-1.5px;}
  .auth-subtitle{font-size:13px;line-height:1.75;color:${C.textMuted};max-width:440px;margin-bottom:22px;}
  .auth-points{display:flex;flex-direction:column;gap:10px;}
  .auth-point{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;
    border:1px solid ${C.border};background:rgba(255,255,255,0.018);
    font-size:12px;color:${C.textMuted};transition:border-color 0.2s,background 0.2s;}
  .auth-point:hover{border-color:${C.borderLight};background:rgba(255,255,255,0.028);}
  .auth-point span{font-size:17px;flex-shrink:0;}
  .auth-form-card{padding:26px;text-align:left;display:flex;flex-direction:column;}
  .auth-form-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:16px;}
  .auth-mode-switch{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;}
  .auth-mode-btn{border:1px solid ${C.border};border-radius:10px;padding:11px 12px;
    font-size:11px;font-weight:800;letter-spacing:1.2px;font-family:var(--mono);
    cursor:pointer;transition:all 0.2s;}
  .auth-mode-btn:hover{transform:translateY(-1px);}
  .auth-input{font-size:13px;}
  .auth-email-hint{font-size:10px;color:${C.textGhost};padding:8px 12px;border-radius:8px;
    background:${C.bg};border:1px solid ${C.border};word-break:break-all;}
  .auth-msg{font-size:10px;line-height:1.6;margin-bottom:12px;padding:9px 12px;
    border-radius:10px;border:1px solid transparent;}

  /* ── Typography ── */
  .title-text{font-size:48px;font-weight:900;letter-spacing:-3px;margin:0 0 4px;
    color:${C.text};line-height:1.1;filter:drop-shadow(0 2px 24px rgba(0,0,0,0.3));}

  /* ── Glass Card ── */
  .glass-card{background:linear-gradient(145deg,${C.bgCard} 0%,${C.bgAlt} 100%);
    border:1px solid ${C.border};border-radius:16px;padding:22px;
    box-shadow:0 6px 32px rgba(0,0,0,0.28),0 0 0 1px rgba(255,255,255,0.02),inset 0 1px 0 rgba(255,255,255,0.03);}

  /* ── Buttons ── */
  .btn-primary{width:100%;padding:15px 24px;border:none;border-radius:12px;font-size:14px;font-weight:900;
    font-family:var(--mono);cursor:pointer;letter-spacing:2px;text-transform:uppercase;
    transition:transform 0.15s ease,box-shadow 0.25s ease,filter 0.2s ease;
    color:${C.bg};position:relative;overflow:hidden;}
  .btn-primary::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;
    background:linear-gradient(45deg,transparent 40%,rgba(255,255,255,0.1) 50%,transparent 60%);
    animation:shimmer 3.5s ease-in-out infinite;pointer-events:none;}
  .btn-primary:hover{transform:translateY(-2px);}
  .btn-primary:active{transform:scale(0.97)!important;}
  .btn-static::before{display:none;}
  .btn-static:hover{transform:none;}
  .btn-static:active{transform:none!important;}
  .btn-green{background:linear-gradient(135deg,${C.green},${C.greenDim});
    box-shadow:0 4px 24px rgba(74,222,128,0.2),inset 0 1px 0 rgba(255,255,255,0.12);}
  .btn-green:hover{box-shadow:0 8px 48px rgba(74,222,128,0.38),inset 0 1px 0 rgba(255,255,255,0.12);filter:brightness(1.06);}
  .btn-orange{background:linear-gradient(135deg,${C.orange},#c2410c);
    box-shadow:0 4px 24px rgba(251,146,60,0.2),inset 0 1px 0 rgba(255,255,255,0.12);}
  .btn-orange:hover{box-shadow:0 8px 48px rgba(251,146,60,0.38),inset 0 1px 0 rgba(255,255,255,0.12);filter:brightness(1.06);}
  .btn-blue{background:linear-gradient(135deg,${C.blue},${C.cyan});
    box-shadow:0 4px 24px rgba(96,165,250,0.2),inset 0 1px 0 rgba(255,255,255,0.12);}
  .btn-blue:hover{box-shadow:0 8px 48px rgba(96,165,250,0.38),inset 0 1px 0 rgba(255,255,255,0.12);filter:brightness(1.06);}
  .btn-ghost{background:transparent;border:1px solid ${C.border};border-radius:6px;color:${C.textDim};
    font-size:8px;font-family:var(--mono);cursor:pointer;padding:4px 12px;
    letter-spacing:1.5px;transition:all 0.2s;}
  .btn-ghost:hover{border-color:${C.red};color:${C.red};box-shadow:0 0 16px rgba(248,113,113,0.12);}

  /* ── Inputs ── */
  .input-field{width:100%;padding:12px 16px;background:${C.bgCard};border:1px solid ${C.border};
    border-radius:10px;color:${C.text};font-size:14px;font-family:var(--mono);outline:none;
    transition:border-color 0.25s,box-shadow 0.25s;box-shadow:inset 0 2px 6px rgba(0,0,0,0.18);}
  .input-field:focus{border-color:${C.green};box-shadow:inset 0 2px 6px rgba(0,0,0,0.18),0 0 0 3px rgba(74,222,128,0.1);}
  .input-field::placeholder{color:${C.textGhost};}

  /* ── Game Feedback ── */
  .screen-flash{position:absolute;inset:0;z-index:100;pointer-events:none;animation:flashOut 0.35s ease-out forwards;}
  .feedback-wrap{position:sticky;bottom:14px;left:0;right:0;display:flex;justify-content:center;pointer-events:none;z-index:50;}
  .feedback-pill{padding:11px 28px;border-radius:14px;font-size:15px;font-weight:900;letter-spacing:0.5px;
    animation:feedbackPop 1.1s ease-out forwards;backdrop-filter:blur(20px);
    box-shadow:0 10px 40px rgba(0,0,0,0.4);}
  .fb-hit{background:rgba(74,222,128,0.14);border:1px solid rgba(74,222,128,0.32);color:${C.green};
    box-shadow:0 10px 40px rgba(74,222,128,0.14);}
  .fb-miss{background:rgba(248,113,113,0.14);border:1px solid rgba(248,113,113,0.32);color:${C.red};
    box-shadow:0 10px 40px rgba(248,113,113,0.14);}
  .blink-dot{display:inline-block;width:4px;height:4px;border-radius:50%;background:${C.textDim};animation:blink 0.6s infinite;margin-right:4px;}

  /* ── Keyframes ── */
  @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
  @keyframes feedbackPop{0%{opacity:1;transform:scale(0.82)}20%{opacity:1;transform:scale(1.1)}100%{opacity:0;transform:scale(1) translateY(-18px)}}
  @keyframes flashOut{from{opacity:1}to{opacity:0}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.08}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
  @keyframes breathe{0%,100%{opacity:0.07;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.1;transform:translate(-50%,-50%) scale(1.18)}}
  @keyframes shimmer{0%{transform:translateX(-100%) rotate(45deg)}100%{transform:translateX(100%) rotate(45deg)}}
  @keyframes shake{0%,100%{transform:none}10%{transform:translateX(-5px) rotate(-0.5deg)}30%{transform:translateX(5px) rotate(0.5deg)}50%{transform:translateX(-3px)}70%{transform:translateX(3px) rotate(-0.3deg)}90%{transform:translateX(-1px)}}
  @keyframes countPop{0%{opacity:0;transform:scale(0.3)}40%{opacity:1;transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}
  @keyframes comboPop{0%{opacity:0;transform:translate(-50%,-50%) scale(0.5)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.2)}60%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.5)}}
  @keyframes holsterPulse{0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.4)}50%{box-shadow:0 0 0 10px rgba(74,222,128,0)}}

  .shake{animation:shake 0.35s ease-in-out}
  .combo-burst{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:200;pointer-events:none;animation:comboPop 0.9s ease-out forwards}
  .combo-text{font-size:64px;font-weight:900;color:${C.orange};text-shadow:0 0 40px ${C.orange}40,0 0 80px ${C.orange}20;font-family:var(--mono)}

  /* ── Responsive ── */
  @media (max-width:860px){
    .mode-picker-snapshot{grid-template-columns:1fr;max-width:560px;}
    .mode-continue-actions{flex-direction:column;align-items:stretch;}
    .mode-continue-btn,.mode-choose-btn{width:100%;}
    .mode-picker-grid{grid-template-columns:1fr;max-width:560px;margin:0 auto;}
    .mode-picker-title{font-size:32px;}
    .prac-shell{grid-template-columns:1fr;gap:28px;}
    .prac-brand{align-items:center;text-align:center;}
    .auth-shell{grid-template-columns:1fr;max-width:560px;}
    .auth-brand-card{padding:22px 22px;}
    .auth-title{font-size:32px;}
    .auth-subtitle{font-size:12px;}
    .auth-point{font-size:11px;padding:10px 12px;}
    .auth-form-card{padding:22px;}
  }
  @media (max-width:700px){
    .prac-page{padding:16px 14px;}
    .practice-card{padding:24px 18px;border-radius:16px;}
    .practice-steps{grid-template-columns:1fr;}
    .practice-step{font-size:13px;}
  }

  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
  ::-webkit-scrollbar-thumb:hover{background:${C.borderLight}}
`;
