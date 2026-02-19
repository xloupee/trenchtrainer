import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../lib/colors';

export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background subtle pulse
  const bgGlow = 0.06 + 0.04 * Math.sin(frame * 0.04);

  // Headline words animate in
  const line1Words = ['TRAIN', 'IN', 'THE'];
  const line2Words = ['TRENCHES.'];

  const getWordOpacity = (globalIdx: number) => {
    const start = globalIdx * 18;
    return interpolate(frame, [start, start + 24], [0, 1], { extrapolateRight: 'clamp' });
  };
  const getWordY = (globalIdx: number) => {
    const start = globalIdx * 18;
    return interpolate(frame, [start, start + 24], [20, 0], { extrapolateRight: 'clamp' });
  };

  // Subtitle fades in
  const subOpacity = interpolate(frame, [84, 120], [0, 1], { extrapolateRight: 'clamp' });
  const subY = interpolate(frame, [84, 120], [12, 0], { extrapolateRight: 'clamp' });

  // Button springs in
  const buttonScale = spring({ frame: Math.max(0, frame - 110), fps, config: { damping: 12, stiffness: 180 } });
  const buttonOpacity = interpolate(frame, [110, 140], [0, 1], { extrapolateRight: 'clamp' });

  // Button glow pulse
  const buttonGlow = 0.5 + 0.5 * Math.sin(frame * 0.075);

  // URL fades in last
  const urlOpacity = interpolate(frame, [150, 180], [0, 1], { extrapolateRight: 'clamp' });

  // Accent lines draw in
  const lineWidth = interpolate(frame, [120, 180], [0, 320], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: C.bg, fontFamily: FONT,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 0,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background ambient glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 45%, rgba(74,222,128,${bgGlow}) 0%, transparent 65%)`,
      }} />

      {/* Headline line 1 */}
      <div style={{ display: 'flex', gap: 22, alignItems: 'baseline', marginBottom: 4 }}>
        {line1Words.map((word, i) => (
          <span key={word} style={{
            fontSize: 72, fontWeight: 900, letterSpacing: -1,
            color: C.text,
            opacity: getWordOpacity(i),
            transform: `translateY(${getWordY(i)}px)`,
            display: 'inline-block',
          }}>{word}</span>
        ))}
      </div>

      {/* Headline line 2 — green */}
      <div style={{ display: 'flex', gap: 22, alignItems: 'baseline', marginBottom: 36 }}>
        {line2Words.map((word, i) => (
          <span key={word} style={{
            fontSize: 72, fontWeight: 900, letterSpacing: -1,
            color: C.green,
            filter: `drop-shadow(0 0 18px rgba(74,222,128,0.45))`,
            opacity: getWordOpacity(line1Words.length + i),
            transform: `translateY(${getWordY(line1Words.length + i)}px)`,
            display: 'inline-block',
          }}>{word}</span>
        ))}
      </div>

      {/* Subtitle */}
      <div style={{
        fontSize: 16, color: C.textMuted, letterSpacing: 2,
        opacity: subOpacity, transform: `translateY(${subY}px)`,
        marginBottom: 44,
        textAlign: 'center',
      }}>
        Build your reaction speed. Climb the ranks. Beat the trenches.
      </div>

      {/* CTA Button */}
      <div style={{
        transform: `scale(${buttonScale})`, opacity: buttonOpacity,
        marginBottom: 32,
      }}>
        <div style={{
          background: C.green,
          color: '#000',
          fontSize: 17, fontWeight: 900, letterSpacing: 3,
          padding: '18px 56px',
          borderRadius: 8,
          cursor: 'pointer',
          boxShadow: `0 0 ${28 + 16 * buttonGlow}px rgba(74,222,128,${0.45 + 0.3 * buttonGlow})`,
          textTransform: 'uppercase',
          userSelect: 'none',
        }}>
          START TRAINING →
        </div>
      </div>

      {/* Accent line */}
      <div style={{
        width: lineWidth, height: 1,
        background: `linear-gradient(90deg, transparent, ${C.green}, transparent)`,
        marginBottom: 20,
        opacity: 0.5,
      }} />

      {/* URL */}
      <div style={{ fontSize: 12, color: C.textDim, letterSpacing: 3, opacity: urlOpacity }}>
        trenchestrainer.com
      </div>
    </div>
  );
};
