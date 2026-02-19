import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C, FONT } from '../lib/colors';

const words1 = ['The', 'trenches', 'move', 'fast.'];
const words2 = ['Can', 'you', 'keep', 'up?'];

export const HookLine: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{
      width: '100%', height: '100%',
      background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 20, fontFamily: FONT,
    }}>
      {/* Line 1 */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
        {words1.map((word, i) => {
          const start = i * 8;
          const opacity = interpolate(frame, [start, start + 10], [0, 1], { extrapolateRight: 'clamp' });
          const y = interpolate(frame, [start, start + 10], [14, 0], { extrapolateRight: 'clamp' });
          return (
            <span key={word} style={{
              fontSize: word === 'fast.' ? 72 : 56,
              fontWeight: 900,
              color: word === 'fast.' ? C.green : C.text,
              letterSpacing: -1,
              opacity,
              transform: `translateY(${y}px)`,
              display: 'inline-block',
            }}>{word}</span>
          );
        })}
      </div>

      {/* Line 2 */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
        {words2.map((word, i) => {
          const start = 30 + i * 7;
          const opacity = interpolate(frame, [start, start + 10], [0, 1], { extrapolateRight: 'clamp' });
          const y = interpolate(frame, [start, start + 10], [14, 0], { extrapolateRight: 'clamp' });
          return (
            <span key={word} style={{
              fontSize: 48,
              fontWeight: 700,
              color: C.textMuted,
              letterSpacing: -1,
              opacity,
              transform: `translateY(${y}px)`,
              display: 'inline-block',
            }}>{word}</span>
          );
        })}
      </div>

      {/* Blinking cursor line */}
      <div style={{
        width: 3, height: 52,
        background: C.green,
        opacity: frame % 10 < 5 ? 0.8 : 0,
        marginTop: 8,
        display: interpolate(frame, [55, 75], [1, 0], { extrapolateRight: 'clamp' }) > 0.5 ? 'block' : 'none',
      }} />
    </div>
  );
};
