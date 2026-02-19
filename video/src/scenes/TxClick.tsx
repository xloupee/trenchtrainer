import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C, FONT } from '../lib/colors';
import { HUD } from '../components/HUD';
import { TokenRow } from '../components/TokenRow';
import { FeedbackPill } from '../components/FeedbackPill';
import { Sequence } from 'remotion';

export const TxClick: React.FC = () => {
  const frame = useCurrentFrame();

  // Green screen flash on click
  const flashOpacity = interpolate(frame, [36, 38, 56], [0, 0.18, 0], { extrapolateRight: 'clamp' });

  // Zoom in slightly on the token row
  const zoom = interpolate(frame, [0, 30], [1, 1.04], { extrapolateRight: 'clamp' });

  // Click ripple
  const rippleScale = interpolate(frame, [36, 80], [0.5, 2.5], { extrapolateRight: 'clamp' });
  const rippleOpacity = interpolate(frame, [36, 80], [0.6, 0], { extrapolateRight: 'clamp' });

  const tokenState: 'wait' | 'active' | 'done' = frame < 30 ? 'wait' : frame < 40 ? 'active' : 'done';

  return (
    <div style={{
      width: '100%', height: '100%',
      background: C.bg, fontFamily: FONT,
      display: 'flex', flexDirection: 'column',
    }}>
      <HUD score={5} streak={4} bestRt="0.19s" lastRt="0.19s" round={5} diff={4} mult="x1.5" elapsed="0:27" />

      {/* Green flash overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
        background: `rgba(74,222,128,${flashOpacity})`,
      }} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Dimmed left & right columns */}
        <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.bgAlt, opacity: 0.35 }}>
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.textDim }}>𝕏 TRACKER</div>
        </div>

        {/* Middle: focused on the one token */}
        <div style={{
          flex: 1, borderRight: `1px solid ${C.border}`, background: C.bg,
          display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        }}>
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.textDim }}>TRENCHES</div>

          <TokenRow emoji="🚀" name="MoonShot" ticker="MOON" vol="$3.1K" mcap="$89K" age="47s" holders={87} state="wait" opacity={0.2} />
          <TokenRow emoji="🍎" name="AppleApe" ticker="APE" vol="$1.4K" mcap="$22K" age="1m" holders={43} state="wait" opacity={0.2} />

          {/* The target row — zoomed */}
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', position: 'relative' }}>
            <TokenRow emoji="🐸" name="PepeCoin" ticker="PEPE" vol="$8.2K" mcap="$340K" age="2m" holders={312} state={tokenState} />

            {/* Click ripple on the button */}
            {frame >= 36 && (
              <div style={{
                position: 'absolute', right: 80, top: '50%',
                width: 60, height: 60,
                borderRadius: '50%',
                border: `2px solid ${C.green}`,
                transform: `translate(50%, -50%) scale(${rippleScale})`,
                opacity: rippleOpacity,
                pointerEvents: 'none',
              }} />
            )}
          </div>

          <TokenRow emoji="🔥" name="FireToken" ticker="FIRE" vol="$5.7K" mcap="$210K" age="3m" holders={198} state="wait" opacity={0.2} />
        </div>

        <div style={{ width: 240, flexShrink: 0, padding: 16, background: C.bgAlt, opacity: 0.35 }} />

        {/* Feedback pill */}
        {frame >= 40 && (
          <Sequence from={40}>
            <FeedbackPill type="hit" time="0.19s" />
          </Sequence>
        )}
      </div>
    </div>
  );
};
