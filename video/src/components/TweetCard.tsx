import React from 'react';
import { C, FONT } from '../lib/colors';

interface TweetCardProps {
  handle: string;
  username: string;
  text: string;
  time: string;
  verified?: boolean;
  highlight?: boolean;
  opacity?: number;
}

export const TweetCard: React.FC<TweetCardProps> = ({
  handle, username, text, time, verified = false, highlight = false, opacity = 1,
}) => (
  <div style={{
    padding: '10px 14px',
    borderBottom: `1px solid ${C.border}`,
    fontFamily: FONT,
    opacity,
    background: highlight ? `rgba(74,222,128,0.06)` : 'transparent',
    borderLeft: highlight ? `3px solid ${C.green}` : `3px solid transparent`,
    transition: 'all 0.3s',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: `linear-gradient(135deg, ${C.bgElevated}, ${C.border})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, flexShrink: 0,
      }}>
        {handle[0].toUpperCase()}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{handle}</span>
          {verified && <span style={{ color: C.cyan, fontSize: 10 }}>✓</span>}
        </div>
        <span style={{ fontSize: 10, color: C.textDim }}>{username} · {time}</span>
      </div>
    </div>
    <div style={{
      fontSize: 12, color: highlight ? C.greenBright : C.textMuted,
      lineHeight: 1.5, fontWeight: highlight ? 600 : 400,
    }}>{text}</div>
  </div>
);
