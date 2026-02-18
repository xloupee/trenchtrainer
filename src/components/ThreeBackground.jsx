'use client';

import { useEffect, useRef } from 'react';

// Three wave channels: top (green), mid (cyan), bottom (green)
const WAVE_DEFS = [
  { yFrac: 0.25, baseAmp: 65, freq: 0.006, speed: 0.018, phase: 0,   r: 72, g: 187, b: 120, breatheOff: 0   },
  { yFrac: 0.50, baseAmp: 46, freq: 0.009, speed: 0.024, phase: 2.1, r: 79, g: 209, b: 197, breatheOff: 2.1 },
  { yFrac: 0.75, baseAmp: 56, freq: 0.005, speed: 0.014, phase: 4.4, r: 72, g: 187, b: 120, breatheOff: 4.4 },
];

// Composite sine: sum of harmonics gives an organic, market-like shape
function sample(x, freq, phase, amp) {
  const t = freq * x + phase;
  return amp * (
    0.50 * Math.sin(t) +
    0.30 * Math.sin(2.1 * t + 0.9) +
    0.20 * Math.sin(3.7 * t - 0.4)
  );
}

export default function ThreeBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let W = window.innerWidth;
    let H = window.innerHeight;

    const setup = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setup();

    // Clone defs so we can mutate phase without touching the module constant
    const waves = WAVE_DEFS.map(w => ({ ...w }));

    let time = 0;
    let rafId;

    const drawWave = (w) => {
      // Amplitude breathes slowly in and out
      const amp = w.baseAmp * (1 + 0.18 * Math.sin(time * 0.007 + w.breatheOff));
      const cy = H * w.yFrac;
      const { r, g, b } = w;

      // Faint center guide line
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(W, cy);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.035)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Build wave path
      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const y = cy + sample(x, w.freq, w.phase, amp);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }

      // Triple-layer fake glow (wide dim → mid → thin bright core)
      // avoids expensive ctx.shadowBlur
      ctx.lineWidth = 7;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.04)`;
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.10)`;
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.52)`;
      ctx.stroke();
    };

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      time++;
      ctx.clearRect(0, 0, W, H);

      waves.forEach(w => {
        w.phase -= w.speed; // scroll left (newer data appears on right)
        drawWave(w);
      });
    };

    animate();

    const onResize = () => setup();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
