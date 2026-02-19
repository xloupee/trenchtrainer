'use client';

import { useEffect, useRef } from 'react';

// Color palette — mostly green, some cyan, rare orange accent
const PALETTE = [
  [72, 187, 120],
  [72, 187, 120],
  [72, 187, 120],
  [72, 187, 120],
  [79, 209, 197],
  [79, 209, 197],
  [237, 137, 54],
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }

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

    const COUNT = window.innerWidth < 768 ? 12 : 20;

    const orbs = Array.from({ length: COUNT }, () => {
      const [r, g, b] = pick(PALETTE);
      const radius = rand(40, 210);
      const speed = rand(0.1, 0.38);
      const angle = rand(0, Math.PI * 2);
      return {
        x: rand(0, W),
        y: rand(0, H),
        radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        opacity: rand(0.12, 0.22),
        phase: rand(0, Math.PI * 2),
        pulseSpeed: rand(0.004, 0.009),
        r, g, b,
      };
    });

    let time = 0;
    let rafId;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      time++;
      ctx.clearRect(0, 0, W, H);

      // Screen blend: overlapping orbs brighten each other like real light sources
      ctx.globalCompositeOperation = 'screen';

      orbs.forEach(o => {
        // Drift
        o.x += o.vx;
        o.y += o.vy;

        // Wrap edges smoothly
        if (o.x < -o.radius) o.x = W + o.radius;
        if (o.x > W + o.radius) o.x = -o.radius;
        if (o.y < -o.radius) o.y = H + o.radius;
        if (o.y > H + o.radius) o.y = -o.radius;

        // Slow opacity pulse
        const op = o.opacity * (1 + 0.22 * Math.sin(time * o.pulseSpeed + o.phase));

        // Bokeh: slightly dim centre, bright ring at ~65%, fade to 0 at edge
        // mimics real lens bokeh where light accumulates at the aperture boundary
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.radius);
        g.addColorStop(0,    `rgba(${o.r},${o.g},${o.b},${(op * 0.55).toFixed(3)})`);
        g.addColorStop(0.65, `rgba(${o.r},${o.g},${o.b},${op.toFixed(3)})`);
        g.addColorStop(1,    `rgba(${o.r},${o.g},${o.b},0)`);

        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
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
