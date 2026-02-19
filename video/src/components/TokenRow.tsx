import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, FONT } from '../lib/colors';

interface TokenRowProps {
  emoji: string;
  name: string;
  ticker: string;
  vol: string;
  mcap: string;
  age: string;
  holders: number;
  state?: 'wait' | 'active' | 'done';
  opacity?: number;
  // Detail rows (all optional with defaults)
  addr?: string;
  devPct?: string;
  top10?: string;
  hasDS?: boolean;
  devAge?: string;
  buySell?: string;
}

export const TokenRow: React.FC<TokenRowProps> = ({
  emoji, name, ticker, vol, mcap, age, holders,
  state = 'wait',
  opacity = 1,
  addr = '0x4f...3mp',
  devPct = '12%',
  top10 = '18%',
  hasDS = false,
  devAge = '7d',
  buySell = '3·1%',
}) => {
  const frame = useCurrentFrame();
  const blinkOn = frame % 16 < 8;

  // Left border by state
  const borderColor =
    state === 'active' ? C.yellow :
    state === 'done'   ? C.green  :
    C.border;

  // Avatar border
  const avatarBorder = state === 'done' ? `1px solid ${C.green}` : `1px solid ${C.border}`;
  const avatarShadow = state === 'done' ? `0 0 14px rgba(74,222,128,0.2)` : 'none';

  // TX button styles
  const btnBg =
    state === 'active' ? C.yellow :
    state === 'done'   ? C.bgElevated :
    C.bgCard;
  const btnColor =
    state === 'active' ? '#000' :
    state === 'done'   ? C.textDim :
    C.textDim;
  const btnBorder =
    state === 'active'
      ? `1px solid ${C.yellow}`
      : `1px solid ${C.border}`;
  const btnShadow =
    state === 'active'
      ? `0 0 12px rgba(251,191,36,0.4)`
      : 'none';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      padding: '8px 8px',
      borderBottom: `1px solid ${C.border}`,
      borderLeft: `2px solid ${borderColor}`,
      background: state === 'active' ? `rgba(251,191,36,0.04)` : 'transparent',
      minHeight: 86,
      gap: 8,
      opacity,
      fontFamily: FONT,
      boxSizing: 'border-box' as const,
    }}>
      {/* Avatar */}
      <div style={{
        width: 50, height: 50, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(145deg, ${C.bgElevated}, ${C.bgCard})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
        border: avatarBorder,
        boxShadow: avatarShadow,
      }}>{emoji}</div>

      {/* Info column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: Ticker + Name */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
          <span style={{
            fontWeight: 900, fontSize: 13.5,
            color: state === 'done' ? C.green : C.text,
            letterSpacing: -0.3,
          }}>{ticker}</span>
          <span style={{
            color: C.textMuted, fontSize: 10.5,
            fontWeight: 400, whiteSpace: 'nowrap' as const,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{name}</span>
        </div>

        {/* Row 2: Age + social icons + holders */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, flexWrap: 'wrap' as const }}>
          <span style={{ color: C.cyan, fontSize: 10, fontWeight: 600 }}>{age}</span>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <span style={{ color: C.cyan, fontSize: 9 }}>🔗</span>
            <span style={{ color: C.textDim, fontSize: 9 }}>💬</span>
            <span style={{ color: C.textDim, fontSize: 9 }}>🔍</span>
          </div>
          <span style={{ color: C.textDim, fontSize: 9.5 }}>↻{holders}</span>
        </div>

        {/* Row 3: Address (ghosted) */}
        <div style={{ color: '#1e293b', fontSize: 9, marginBottom: 3, letterSpacing: 0.3 }}>
          {addr}
        </div>

        {/* Row 4: Dev stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, flexWrap: 'wrap' as const }}>
          <span style={{ color: parseFloat(devPct) > 15 ? C.red : C.textDim }}>👤 {devPct}</span>
          <span style={{ color: C.textDim }}>⟳ {top10}</span>
          {hasDS && <span style={{ color: C.cyan, fontSize: 8.5 }}>DS</span>}
          <span style={{ color: C.textDim }}>{devAge}</span>
          <span style={{ color: C.textDim }}>{buySell}</span>
        </div>
      </div>

      {/* TX Button */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          width: 108, height: 64,
          borderRadius: 6,
          background: btnBg,
          border: btnBorder,
          boxShadow: btnShadow,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: btnColor,
          fontSize: 11, fontWeight: 800, letterSpacing: 1,
          fontFamily: FONT,
          gap: 4,
          userSelect: 'none' as const,
        }}>
          {state === 'wait' && (
            <>
              <span style={{ opacity: blinkOn ? 1 : 0.3, fontSize: 8 }}>●</span>
              <span>WAIT</span>
            </>
          )}
          {state === 'active' && (
            <>
              <span style={{ color: '#000', fontSize: 10 }}>⚡</span>
              <span>TX NOW</span>
            </>
          )}
          {state === 'done' && (
            <>
              <span style={{ color: C.yellow, fontSize: 10 }}>⚡</span>
              <span>3.30</span>
            </>
          )}
        </div>
      </div>

      {/* V / MC column */}
      <div style={{ textAlign: 'right' as const, minWidth: 55, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
          <span style={{ color: C.textDim, fontSize: 8.5 }}>V</span>
          <span style={{ color: C.text, fontSize: 12, fontWeight: 800 }}>{vol}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 }}>
          <span style={{ color: C.textDim, fontSize: 8.5 }}>MC</span>
          <span style={{ color: C.text, fontSize: 11, fontWeight: 700 }}>{mcap}</span>
        </div>
      </div>
    </div>
  );
};
