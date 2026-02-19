import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Img, staticFile } from 'remotion';
import { C, FONT } from '../lib/colors';

export const BrandStamp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 120, mass: 1 } });
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  const textOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: 'clamp' });
  const textY = interpolate(frame, [40, 80], [20, 0], { extrapolateRight: 'clamp' });

  const tagOpacity = interpolate(frame, [76, 100], [0, 1], { extrapolateRight: 'clamp' });

  // Typewriter for "TRENCHES TRAINER"
  const title = 'TRENCHES TRAINER';
  const charsVisible = Math.floor(interpolate(frame, [60, 120], [0, title.length], { extrapolateRight: 'clamp' }));

  return (
    <div style={{
      width: '100%', height: '100%',
      background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 28, fontFamily: FONT,
    }}>
      {/* Logo */}
      <div style={{ transform: `scale(${logoScale})`, opacity: logoOpacity }}>
        <Img src={staticFile('logo.png')} style={{ width: 110, height: 110, objectFit: 'contain' }} />
      </div>

      {/* Title typewriter */}
      <div style={{
        fontSize: 52, fontWeight: 900, letterSpacing: 6,
        color: C.text,
        opacity: textOpacity,
        transform: `translateY(${textY}px)`,
        fontFamily: FONT,
      }}>
        {title.slice(0, charsVisible)}
        {charsVisible < title.length && (
          <span style={{ opacity: frame % 12 < 6 ? 1 : 0, color: C.green }}>|</span>
        )}
      </div>

      {/* Tagline */}
      <div style={{
        fontSize: 15, letterSpacing: 3, color: C.green, fontWeight: 700,
        opacity: tagOpacity, textTransform: 'uppercase',
      }}>
        React Fast. Trade Faster.
      </div>

      {/* Accent line */}
      <div style={{
        width: interpolate(frame, [90, 140], [0, 280], { extrapolateRight: 'clamp' }),
        height: 2,
        background: `linear-gradient(90deg, transparent, ${C.green}, transparent)`,
        opacity: tagOpacity,
      }} />
    </div>
  );
};
