import React from 'react';
import { C, FONT } from '../lib/colors';

interface HUDProps {
  score?: number;
  streak?: number;
  bestRt?: string;
  lastRt?: string;
  round?: number;
  diff?: number;
  mult?: string;
  elapsed?: string;
}

const Divider = () => (
  <div style={{ width: 1, background: C.border, alignSelf: 'stretch', margin: '0 2px' }} />
);

const Stat: React.FC<{ label: string; value: string | number; color?: string; large?: boolean }> = ({
  label, value, color = C.text, large = false,
}) => (
  <div style={{ textAlign: 'center', padding: '0 16px', fontFamily: FONT }}>
    <div style={{
      fontSize: large ? 22 : 18,
      fontWeight: 900,
      color,
      letterSpacing: -0.5,
      lineHeight: 1,
    }}>{value}</div>
    <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginTop: 3, fontWeight: 700 }}>{label}</div>
  </div>
);

export const HUD: React.FC<HUDProps> = ({
  score = 0, streak = 0, bestRt = '—', lastRt = '—',
  round = 1, diff = 1, mult = 'x1', elapsed = '0:00',
}) => (
  <div style={{
    height: 56,
    background: C.bgAlt,
    borderBottom: `1px solid ${C.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: FONT,
  }}>
    <Stat label="SCORE" value={score} color={C.green} large />
    <Divider />
    <Stat label="MULT" value={mult} color={streak >= 4 ? C.orange : C.textDim} />
    <Divider />
    <Stat label="ELAPSED" value={elapsed} />
    <Divider />
    <Stat label="STREAK" value={streak} color={streak >= 3 ? C.orange : C.text} />
    <Divider />
    <Stat label="BEST RT" value={bestRt} color={C.cyan} />
    <Divider />
    <Stat label="LAST RT" value={lastRt} />
    <Divider />
    <Stat label="RND" value={round} />
    <Divider />
    <Stat label="DIFF" value={`Lv${diff}`} color={diff >= 7 ? C.red : diff >= 4 ? C.orange : C.green} />
  </div>
);
