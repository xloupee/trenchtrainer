import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../lib/colors';
import { HUD } from '../components/HUD';
import { TokenRow } from '../components/TokenRow';
import { TweetCard } from '../components/TweetCard';

export const SignalFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Tweet highlight pulses in
  const highlightOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  // Spotlight glow around signal tweet
  const glowOpacity = 0.4 + 0.3 * Math.sin(frame * 0.1);

  // Correct token (PEPE) spawns and its button activates
  const pepeOpacity = interpolate(frame, [50, 80], [0, 1], { extrapolateRight: 'clamp' });
  const buttonActive = frame > 110;

  // Arrow indicator
  const arrowOpacity = interpolate(frame, [90, 120], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: C.bg, fontFamily: FONT,
      display: 'flex', flexDirection: 'column',
    }}>
      <HUD score={4} streak={3} bestRt="0.21s" lastRt="0.34s" round={5} diff={4} mult="x1" elapsed="0:24" />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: tweet feed — signal highlighted */}
        <div style={{
          width: 280, flexShrink: 0,
          borderRight: `1px solid ${C.border}`,
          background: C.bgAlt,
          position: 'relative',
        }}>
          {/* Glow behind signal tweet */}
          <div style={{
            position: 'absolute', top: 38, left: 0, right: 0, height: 100,
            background: `radial-gradient(ellipse at 50% 50%, rgba(74,222,128,${glowOpacity * 0.18}) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.textDim }}>
            𝕏 TRACKER
          </div>
          {/* Signal tweet — highlighted */}
          <div style={{ opacity: highlightOpacity }}>
            <TweetCard
              handle="degen_alpha"
              username="@degen_alpha"
              text="🚨 APE INTO $PEPE NOW 🐸 this is it ser, don't miss the entry"
              time="just now"
              verified
              highlight
            />
          </div>
          <TweetCard handle="cryptowizard" username="@cryptowizard" text="Market looking bullish 👀" time="1m" opacity={0.4} />
          <TweetCard handle="solana_ape" username="@solana_ape" text="Bags packed 🚀" time="3m" opacity={0.4} />

          {/* "SIGNAL" badge */}
          <div style={{
            position: 'absolute', top: 46, right: 10,
            background: C.green, color: '#000',
            fontSize: 9, fontWeight: 900, letterSpacing: 2,
            padding: '3px 8px', borderRadius: 4,
            opacity: highlightOpacity,
          }}>SIGNAL</div>
        </div>

        {/* Middle: token feed — correct token highlighted */}
        <div style={{ flex: 1, borderRight: `1px solid ${C.border}`, background: C.bg }}>
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.textDim }}>TRENCHES</div>

          {/* Other tokens dim */}
          <TokenRow emoji="🚀" name="MoonShot" ticker="MOON" vol="$3.1K" mcap="$89K" age="47s" holders={87} state="wait" opacity={0.25} />
          <TokenRow emoji="🍎" name="AppleApe" ticker="APE" vol="$1.4K" mcap="$22K" age="1m" holders={43} state="wait" opacity={0.25} />

          {/* PEPE — correct token, springs in */}
          <div style={{
            opacity: pepeOpacity,
            transform: `translateY(${interpolate(frame, [50, 80], [16, 0], { extrapolateRight: 'clamp' })}px)`,
            position: 'relative',
          }}>
            <TokenRow emoji="🐸" name="PepeCoin" ticker="PEPE" vol="$8.2K" mcap="$340K" age="2m" holders={312} state={buttonActive ? 'active' : 'wait'} />
            {/* Arrow pointing to TX button */}
            <div style={{
              position: 'absolute', right: 130, top: '50%', transform: 'translateY(-50%)',
              fontSize: 18, opacity: arrowOpacity, color: C.yellow,
            }}>→</div>
          </div>

          <TokenRow emoji="🔥" name="FireToken" ticker="FIRE" vol="$5.7K" mcap="$210K" age="3m" holders={198} state="wait" opacity={0.25} />
          <TokenRow emoji="💎" name="DiamondH" ticker="DIAM" vol="$2.3K" mcap="$67K" age="8m" holders={156} state="wait" opacity={0.25} />
        </div>

        {/* Right panel */}
        <div style={{ width: 240, flexShrink: 0, padding: 16, background: C.bgAlt }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.textDim, marginBottom: 12 }}>PERFORMANCE</div>
          {[
            { label: 'SESSION', value: 4, color: C.green },
            { label: 'STREAK', value: 3, color: C.orange },
            { label: 'BEST RT', value: '0.21s', color: C.cyan },
          ].map(s => (
            <div key={s.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
