import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../lib/colors';

interface FeedbackPillProps {
  type: 'hit' | 'miss';
  time?: string;
}

export const FeedbackPill: React.FC<FeedbackPillProps> = ({ type, time = '0.19s' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 200, mass: 0.5 } });
  const opacity = interpolate(frame, [0, 10, 80, 120], [0, 1, 1, 0], { extrapolateRight: 'clamp' });

  const isHit = type === 'hit';

  return (
    <div style={{
      position: 'absolute',
      bottom: 40,
      left: '50%',
      transform: `translateX(-50%) scale(${scale})`,
      opacity,
      background: isHit ? `rgba(74,222,128,0.15)` : `rgba(248,113,113,0.15)`,
      border: `1px solid ${isHit ? C.green : C.red}`,
      borderRadius: 999,
      padding: '8px 20px',
      fontFamily: FONT,
      fontSize: 14,
      fontWeight: 800,
      color: isHit ? C.green : C.red,
      letterSpacing: 1,
      whiteSpace: 'nowrap',
      boxShadow: isHit ? `0 0 20px rgba(74,222,128,0.3)` : `0 0 20px rgba(248,113,113,0.3)`,
    }}>
      {isHit ? `SNIPED ${time} ✅` : `WRONG ${time} ❌`}
    </div>
  );
};
