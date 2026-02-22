"use client";

import { useEffect, useRef } from "react";
import { C } from "../config/constants";

export default function WagerWipTab() {
  const arenaRef = useRef(null);
  const chipRef = useRef(null);
  const rafRef = useRef(0);
  const stateRef = useRef({
    x: 22,
    y: 26,
    vx: 172,
    vy: 126,
    maxX: 0,
    maxY: 0,
    lastTs: 0,
    paletteIndex: 0,
  });

  useEffect(() => {
    const arena = arenaRef.current;
    const chip = chipRef.current;
    if (!arena || !chip) return undefined;

    const palette = [
      { text: C.green, border: "rgba(0,255,157,0.55)", glow: "rgba(0,255,157,0.34)", bgA: "rgba(0,255,157,0.14)", bgB: "rgba(0,0,0,0.9)" },
      { text: C.cyan, border: "rgba(0,204,255,0.55)", glow: "rgba(0,204,255,0.34)", bgA: "rgba(0,204,255,0.14)", bgB: "rgba(0,0,0,0.9)" },
      { text: C.yellow, border: "rgba(251,191,36,0.55)", glow: "rgba(251,191,36,0.34)", bgA: "rgba(251,191,36,0.14)", bgB: "rgba(0,0,0,0.9)" },
      { text: C.orange, border: "rgba(255,140,0,0.55)", glow: "rgba(255,140,0,0.34)", bgA: "rgba(255,140,0,0.14)", bgB: "rgba(0,0,0,0.9)" },
      { text: C.blue, border: "rgba(51,153,255,0.55)", glow: "rgba(51,153,255,0.34)", bgA: "rgba(51,153,255,0.14)", bgB: "rgba(0,0,0,0.9)" },
    ];

    const applyPalette = () => {
      const token = palette[stateRef.current.paletteIndex % palette.length];
      chip.style.color = token.text;
      chip.style.borderColor = token.border;
      chip.style.boxShadow = `0 0 0 1px ${token.glow}, 0 18px 40px ${token.glow}`;
      chip.style.textShadow = `0 0 14px ${token.glow}`;
      chip.style.background = `linear-gradient(145deg, ${token.bgA}, ${token.bgB})`;
    };

    const syncBounds = () => {
      const arenaRect = arena.getBoundingClientRect();
      const chipRect = chip.getBoundingClientRect();
      stateRef.current.maxX = Math.max(0, arenaRect.width - chipRect.width);
      stateRef.current.maxY = Math.max(0, arenaRect.height - chipRect.height);
      stateRef.current.x = Math.min(stateRef.current.x, stateRef.current.maxX);
      stateRef.current.y = Math.min(stateRef.current.y, stateRef.current.maxY);
      chip.style.transform = `translate3d(${stateRef.current.x}px, ${stateRef.current.y}px, 0)`;
    };

    const nextColor = () => {
      stateRef.current.paletteIndex = (stateRef.current.paletteIndex + 1) % palette.length;
      applyPalette();
    };

    const animate = (ts) => {
      const state = stateRef.current;
      if (!state.lastTs) state.lastTs = ts;
      const dt = Math.min(0.04, (ts - state.lastTs) / 1000);
      state.lastTs = ts;

      state.x += state.vx * dt;
      state.y += state.vy * dt;

      let bounced = false;
      if (state.x <= 0) {
        state.x = 0;
        state.vx = Math.abs(state.vx);
        bounced = true;
      } else if (state.x >= state.maxX) {
        state.x = state.maxX;
        state.vx = -Math.abs(state.vx);
        bounced = true;
      }
      if (state.y <= 0) {
        state.y = 0;
        state.vy = Math.abs(state.vy);
        bounced = true;
      } else if (state.y >= state.maxY) {
        state.y = state.maxY;
        state.vy = -Math.abs(state.vy);
        bounced = true;
      }

      if (bounced) nextColor();
      chip.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
      rafRef.current = window.requestAnimationFrame(animate);
    };

    applyPalette();
    syncBounds();
    rafRef.current = window.requestAnimationFrame(animate);
    window.addEventListener("resize", syncBounds);

    return () => {
      window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", syncBounds);
    };
  }, []);

  return (
    <div
      ref={arenaRef}
      style={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 18% 14%, rgba(251,191,36,0.11) 0%, rgba(8,8,8,0.95) 42%, rgba(5,5,5,1) 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(transparent 97%, rgba(255,255,255,0.02) 100%)",
          backgroundSize: "100% 4px",
          pointerEvents: "none",
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          border: `1px solid ${C.border}`,
          background: "rgba(8,8,8,0.7)",
          color: C.yellow,
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 1.8,
          padding: "7px 12px",
          pointerEvents: "none",
        }}
      >
        WAGER MODE // COMING SOON
      </div>
      <div
        ref={chipRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 232,
          height: 84,
          borderRadius: 14,
          border: "1px solid rgba(0,255,157,0.55)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          fontWeight: 900,
          letterSpacing: 1.8,
          willChange: "transform",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 12, lineHeight: 1 }}>WAGER</div>
        <div style={{ fontSize: 10, lineHeight: 1, opacity: 0.9 }}>WORK IN PROGRESS</div>
      </div>
    </div>
  );
}
