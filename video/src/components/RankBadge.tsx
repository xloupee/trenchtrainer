import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../lib/colors';

interface RankBadgeProps {
  rank?: 'CHALLENGER' | 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE';
}

const RANKS = {
  CHALLENGER: { color: '#ff6bff', icon: '👑', glow: 'rgba(255,107,255,0.5)' },
  DIAMOND:    { color: '#b9f2ff', icon: '💎', glow: 'rgba(185,242,255,0.4)' },
  GOLD:       { color: '#ffd700', icon: '🥇', glow: 'rgba(255,215,0,0.4)' },
  SILVER:     { color: '#a8a9ad', icon: '🥈', glow: 'rgba(168,169,173,0.3)' },
  BRONZE:     { color: '#cd7f32', icon: '🥉', glow: 'rgba(205,127,50,0.3)' },
};

export const RankBadge: React.FC<RankBadgeProps> = ({ rank = 'CHALLENGER' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { color, icon, glow } = RANKS[rank];

  const scale = spring({ frame, fps, config: { damping: 10, stiffness: 150, mass: 0.8 } });
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const glowSize = 40 + 20 * Math.sin(frame * 0.075);

  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      transform: `scale(${scale})`, opacity,
      fontFamily: FONT,
    }}>
      <div style={{
        width: 120, height: 120, borderRadius: '50%',
        background: `${color}18`,
        border: `3px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 52,
        boxShadow: `0 0 ${glowSize}px ${glow}, 0 0 ${glowSize * 2}px ${glow}`,
      }}>{icon}</div>
      <div style={{
        fontSize: 28, fontWeight: 900, color, letterSpacing: 4,
        textShadow: `0 0 20px ${glow}`,
      }}>{rank}</div>
      <div style={{ fontSize: 13, color: C.textMuted }}>
        {rank === 'CHALLENGER' ? '< 650ms avg' :
         rank === 'DIAMOND'    ? '< 850ms avg' :
         rank === 'GOLD'       ? '< 1.05s avg' : ''}
      </div>
    </div>
  );
};
