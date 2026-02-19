import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../lib/colors';
import { RankBadge } from '../components/RankBadge';
import { HUD } from '../components/HUD';

const STATS = [
  { label: 'ROUNDS',   value: '5 / 5' },
  { label: 'ACCURACY', value: '100%'  },
  { label: 'BEST RT',  value: '0.17s' },
  { label: 'AVG RT',   value: '0.21s' },
  { label: 'STREAK',   value: '6'     },
];

export const RankReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Results panel slides up
  const panelY = interpolate(frame, [0, 40], [60, 0], { extrapolateRight: 'clamp' });
  const panelOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  // Stat rows stagger in
  const getStatOpacity = (i: number) => interpolate(frame, [20 + i * 16, 44 + i * 16], [0, 1], { extrapolateRight: 'clamp' });
  const getStatX = (i: number) => interpolate(frame, [20 + i * 16, 44 + i * 16], [-18, 0], { extrapolateRight: 'clamp' });

  // Badge fades in at frame 60; RankBadge handles its own spring scale
  const badgeOpacity = interpolate(frame, [60, 84], [0, 1], { extrapolateRight: 'clamp' });

  // "CHALLENGER" label types in after badge
  const label = 'CHALLENGER';
  const charsVisible = Math.floor(interpolate(frame, [90, 140], [0, label.length], { extrapolateRight: 'clamp' }));

  // Tagline fades in
  const tagOpacity = interpolate(frame, [144, 170], [0, 1], { extrapolateRight: 'clamp' });

  // Ambient glow pulse around badge
  const glowSize = 40 + 20 * Math.sin(frame * 0.09);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: C.bg, fontFamily: FONT,
      display: 'flex', flexDirection: 'column',
    }}>
      <HUD score={7} streak={6} bestRt="0.17s" lastRt="0.17s" round={5} diff={4} mult="x2" elapsed="0:43" />

      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 80,
      }}>
        {/* Left: session results */}
        <div style={{
          width: 280,
          opacity: panelOpacity,
          transform: `translateY(${panelY}px)`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.textDim, marginBottom: 18 }}>SESSION RESULTS</div>
          {STATS.map((s, i) => (
            <div key={s.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: `1px solid ${C.border}`,
              opacity: getStatOpacity(i),
              transform: `translateX(${getStatX(i)}px)`,
            }}>
              <span style={{ fontSize: 10, color: C.textDim, letterSpacing: 2 }}>{s.label}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Right: badge + rank name */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        }}>
          {/* Glow behind badge */}
          <div style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              position: 'absolute',
              width: glowSize * 4, height: glowSize * 4,
              borderRadius: '50%',
              background: `radial-gradient(ellipse, rgba(255,107,255,0.22) 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
            <div style={{ opacity: badgeOpacity }}>
              <RankBadge rank="CHALLENGER" />
            </div>
          </div>

          {/* CHALLENGER typewriter */}
          <div style={{
            fontSize: 38, fontWeight: 900, letterSpacing: 6,
            color: '#ff6bff',
            filter: charsVisible > 0 ? 'drop-shadow(0 0 12px rgba(255,107,255,0.6))' : 'none',
            minWidth: '10ch', textAlign: 'center',
          }}>
            {label.slice(0, charsVisible)}
            {charsVisible > 0 && charsVisible < label.length && (
              <span style={{ opacity: frame % 10 < 6 ? 1 : 0 }}>|</span>
            )}
          </div>

          {/* Tagline */}
          <div style={{
            fontSize: 13, color: C.textMuted, letterSpacing: 2,
            opacity: tagOpacity,
            textAlign: 'center',
          }}>
            TOP 1% OF ALL TRAINERS
          </div>
        </div>
      </div>
    </div>
  );
};
