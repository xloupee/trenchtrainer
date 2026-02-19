import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../lib/colors';
import { HUD } from '../components/HUD';
import { TokenRow } from '../components/TokenRow';
import { TweetCard } from '../components/TweetCard';

const TOKENS = [
  { emoji:'🐸', ticker:'PEPE',  name:'PepeCoin',  vol:'$8.2K', mcap:'$340K', age:'2m',  holders:312, state:'wait' as const, addr:'0x8e...4kp', devPct:'9%',  top10:'23%', hasDS:false, devAge:'10d', buySell:'6·1%' },
  { emoji:'🚀', ticker:'MOON',  name:'MoonShot',  vol:'$3.1K', mcap:'$89K',  age:'47s', holders:87,  state:'wait' as const, addr:'0x2a...7mp', devPct:'20%', top10:'21%', hasDS:false, devAge:'1yr', buySell:'1·0%' },
  { emoji:'🍎', ticker:'APE',   name:'AppleApe',  vol:'$1.4K', mcap:'$22K',  age:'1m',  holders:43,  state:'wait' as const, addr:'0x1c...3fb', devPct:'14%', top10:'10%', hasDS:false, devAge:'10d', buySell:'6·2%' },
  { emoji:'🔥', ticker:'FIRE',  name:'FireToken', vol:'$5.7K', mcap:'$210K', age:'3m',  holders:198, state:'wait' as const, addr:'0x9f...2mp', devPct:'9%',  top10:'17%', hasDS:true,  devAge:'27d', buySell:'4·0%' },
  { emoji:'💎', ticker:'DIAM',  name:'DiamondH',  vol:'$2.3K', mcap:'$67K',  age:'8m',  holders:156, state:'wait' as const, addr:'0x4b...1vp', devPct:'13%', top10:'16%', hasDS:false, devAge:'10d', buySell:'6·1%' },
  { emoji:'🐕', ticker:'DOGE2', name:'DogPump',   vol:'$12K',  mcap:'$780K', age:'15m', holders:891, state:'wait' as const, addr:'0x7d...5np', devPct:'6%',  top10:'12%', hasDS:false, devAge:'51m', buySell:'3·3%' },
];

export const GameUI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Whole UI slides up from bottom
  const slideY = interpolate(frame, [0, 50], [80, 0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });

  // Tokens spawn staggered
  const getTokenOpacity = (i: number) => {
    const start = 40 + i * 24;
    return interpolate(frame, [start, start + 30], [0, 1], { extrapolateRight: 'clamp' });
  };
  const getTokenY = (i: number) => {
    const start = 40 + i * 24;
    return interpolate(frame, [start, start + 30], [16, 0], { extrapolateRight: 'clamp' });
  };

  // HUD stats count up
  const scoreDisplay = Math.floor(interpolate(frame, [60, 160], [0, 4], { extrapolateRight: 'clamp' }));
  const streakDisplay = Math.floor(interpolate(frame, [60, 160], [0, 3], { extrapolateRight: 'clamp' }));

  return (
    <div style={{
      width: '100%', height: '100%',
      background: C.bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: FONT,
      opacity,
      transform: `translateY(${slideY}px)`,
    }}>
      {/* HUD */}
      <HUD score={scoreDisplay} streak={streakDisplay} bestRt="0.21s" lastRt="0.34s" round={4} diff={3} mult={streakDisplay >= 4 ? 'x1.5' : 'x1'} elapsed="0:18" />

      {/* Main 3-column area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: Tweet feed */}
        <div style={{
          width: 280, flexShrink: 0,
          borderRight: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column',
          background: C.bgAlt,
        }}>
          <div style={{
            padding: '8px 14px', borderBottom: `1px solid ${C.border}`,
            fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.textDim,
          }}>𝕏 TRACKER</div>
          <TweetCard
            handle="degen_alpha"
            username="@degen_alpha"
            text="Pepe is about to go crazy 🐸 $PEPE this is the one frens"
            time="just now"
            verified
            opacity={interpolate(frame, [30, 60], [0, 1], { extrapolateRight: 'clamp' })}
          />
          <TweetCard
            handle="cryptowizard"
            username="@cryptowizard"
            text="Market looking bullish, watching a few plays rn 👀"
            time="1m"
            opacity={interpolate(frame, [44, 74], [0, 1], { extrapolateRight: 'clamp' })}
          />
          <TweetCard
            handle="solana_ape"
            username="@solana_ape"
            text="Bags packed, ready for the next 100x. You in? 🚀"
            time="3m"
            opacity={interpolate(frame, [58, 88], [0, 1], { extrapolateRight: 'clamp' })}
          />
        </div>

        {/* Middle: Token feed */}
        <div style={{
          flex: 1,
          borderRight: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column',
          background: C.bg,
        }}>
          <div style={{
            padding: '8px 14px', borderBottom: `1px solid ${C.border}`,
            fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.textDim,
          }}>TRENCHES</div>
          {TOKENS.map((tok, i) => (
            <div key={tok.ticker} style={{
              transform: `translateY(${getTokenY(i)}px)`,
              opacity: getTokenOpacity(i),
            }}>
              <TokenRow {...tok} />
            </div>
          ))}
        </div>

        {/* Right: Stats panel */}
        <div style={{
          width: 240, flexShrink: 0,
          padding: 16,
          background: C.bgAlt,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.textDim }}>PERFORMANCE</div>
          {[
            { label: 'SESSION',  value: scoreDisplay, color: C.green },
            { label: 'ACCURACY', value: '100%',       color: C.text },
            { label: 'BEST RT',  value: '0.21s',      color: C.cyan },
            { label: 'STREAK',   value: streakDisplay, color: streakDisplay >= 3 ? C.orange : C.text },
          ].map(s => (
            <div key={s.label} style={{
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '10px 14px',
              opacity: interpolate(frame, [70, 110], [0, 1], { extrapolateRight: 'clamp' }),
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color, letterSpacing: -1 }}>{s.value}</div>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
