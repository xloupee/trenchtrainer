import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../lib/colors';
import { HUD } from '../components/HUD';
import { TokenRow } from '../components/TokenRow';
import { FeedbackPill } from '../components/FeedbackPill';
import { Sequence } from 'remotion';

const CLICKS = [
  { frame: 20,  ticker: 'PEPE', emoji: '🐸', name: 'PepeCoin',   time: '0.19s', streak: 4 },
  { frame: 80,  ticker: 'MOON', emoji: '🚀', name: 'MoonShot',   time: '0.22s', streak: 5 },
  { frame: 136, ticker: 'FIRE', emoji: '🔥', name: 'FireToken',  time: '0.17s', streak: 6 },
];

export const ComboBurst: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Current streak based on frame
  const streak = frame < 50 ? 4 : frame < 110 ? 5 : 6;
  const score   = frame < 50 ? 5 : frame < 110 ? 6 : 7;

  // Multiplier burst at streak=6 (frame 136+)
  const multScale = frame >= 136
    ? spring({ frame: frame - 136, fps, config: { damping: 10, stiffness: 200 } })
    : 1;
  const multOpacity = interpolate(frame, [136, 160], [0, 1], { extrapolateRight: 'clamp' });

  // Streak counter spring per milestone
  const streakScale = (milestone: number) =>
    spring({ frame: Math.max(0, frame - milestone), fps, config: { damping: 8, stiffness: 300 } });

  // Flash overlays
  const flash1 = interpolate(frame, [20, 22, 44], [0, 0.18, 0], { extrapolateRight: 'clamp' });
  const flash2 = interpolate(frame, [80, 82, 104], [0, 0.18, 0], { extrapolateRight: 'clamp' });
  const flash3 = interpolate(frame, [136, 138, 160], [0, 0.25, 0], { extrapolateRight: 'clamp' });
  const flashOpacity = Math.max(flash1, flash2, flash3);

  // Streak bar fill
  const streakBarFill = interpolate(frame, [0, 136, 180], [0.67, 0.83, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: C.bg, fontFamily: FONT,
      display: 'flex', flexDirection: 'column',
    }}>
      <HUD score={score} streak={streak} bestRt="0.17s" lastRt="0.17s" round={5} diff={4} mult={streak >= 6 ? 'x2' : 'x1.5'} elapsed="0:34" />

      {/* Flash overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
        background: `rgba(74,222,128,${flashOpacity})`,
      }} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Left: dimmed */}
        <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.bgAlt, opacity: 0.3 }}>
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.textDim }}>𝕏 TRACKER</div>
        </div>

        {/* Middle: token feed */}
        <div style={{
          flex: 1, borderRight: `1px solid ${C.border}`, background: C.bg,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.textDim }}>TRENCHES</div>

          <TokenRow emoji="🐸" name="PepeCoin"  ticker="PEPE" vol="$8.2K" mcap="$340K" age="2m"  holders={312} state="done" />
          <TokenRow emoji="🚀" name="MoonShot"  ticker="MOON" vol="$3.1K" mcap="$89K"  age="47s" holders={87}  state={frame >= 80 ? 'done' : 'active'} />
          <TokenRow emoji="🔥" name="FireToken" ticker="FIRE" vol="$5.7K" mcap="$210K" age="3m"  holders={198} state={frame >= 136 ? 'done' : frame >= 100 ? 'active' : 'wait'} />
          <TokenRow emoji="🍎" name="AppleApe"  ticker="APE"  vol="$1.4K" mcap="$22K"  age="1m"  holders={43}  state="wait" opacity={0.3} />
        </div>

        {/* Right: streak tracker */}
        <div style={{
          width: 240, flexShrink: 0, padding: 16,
          background: C.bgAlt,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.textDim }}>PERFORMANCE</div>

          {/* Streak counter — big number springs on each milestone */}
          <div style={{
            background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '10px 14px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              fontSize: 36, fontWeight: 900, color: C.orange,
              transform: `scale(${Math.max(1, streakScale(streak === 4 ? 0 : streak === 5 ? 60 : 116))})`,
              transformOrigin: 'left center',
              display: 'inline-block',
            }}>{streak}</div>
            <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginTop: 2 }}>STREAK</div>
            {/* streak fill bar */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0,
              width: `${streakBarFill * 100}%`, height: 3,
              background: C.orange, borderRadius: '0 0 8px 0',
              transition: 'width 0.4s ease',
            }} />
          </div>

          {/* x2 multiplier burst */}
          <div style={{
            background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '10px 14px',
            opacity: frame >= 136 ? 1 : 0.4,
          }}>
            <div style={{
              fontSize: 28, fontWeight: 900,
              color: frame >= 136 ? C.yellow : C.textDim,
              transform: frame >= 136 ? `scale(${multScale})` : 'scale(1)',
              transformOrigin: 'left center',
              display: 'inline-block',
              filter: frame >= 136 ? `drop-shadow(0 0 8px ${C.yellow}88)` : 'none',
            }}>{frame >= 136 ? 'x2' : 'x1.5'}</div>
            <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginTop: 2 }}>MULTIPLIER</div>
          </div>

          {/* Score */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>{score}</div>
            <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginTop: 2 }}>SESSION</div>
          </div>
        </div>

        {/* Feedback pills — each fades out before next appears */}
        {frame >= 20 && frame < 140 && (
          <Sequence from={20}>
            <FeedbackPill type="hit" time="0.19s" />
          </Sequence>
        )}
        {frame >= 80 && frame < 200 && (
          <Sequence from={80}>
            <FeedbackPill type="hit" time="0.22s" />
          </Sequence>
        )}
        {frame >= 136 && (
          <Sequence from={136}>
            <FeedbackPill type="hit" time="0.17s" />
          </Sequence>
        )}
      </div>
    </div>
  );
};
