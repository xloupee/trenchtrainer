'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const C = {
  bg: '#0b0e14',
  bgAlt: '#0f131b',
  bgCard: '#111620',
  bgElevated: '#161c28',
  green: '#48bb78',
  greenDim: '#2f7d52',
  orange: '#ed8936',
  red: '#f56565',
  blue: '#63b3ed',
  cyan: '#4fd1c5',
  text: '#e2e8f0',
  textMuted: '#718096',
  textDim: '#4a5568',
};

const ranks = [
  { label: 'BRONZE',     color: '#cd7f32',  threshold: '1+ RP',     icon: '🥉' },
  { label: 'SILVER',     color: '#a8a9ad',  threshold: '400+ RP',   icon: '🥈' },
  { label: 'GOLD',       color: '#ffd700',  threshold: '550+ RP',   icon: '🥇' },
  { label: 'PLATINUM',   color: '#5dffc3',  threshold: '700+ RP',   icon: '⬢'  },
  { label: 'DIAMOND',    color: '#63b3ed',  threshold: '850+ RP',   icon: '💎' },
  { label: 'CHALLENGER', color: '#ff3366',  threshold: '1000+ RP',  icon: '♛'  },
];

const steps = [
  { num: '01', title: 'READ THE SIGNAL',  desc: 'A post appears with the token you need to find. Spot the name quickly before the next step starts.' },
  { num: '02', title: 'SNIPE THE TOKEN',  desc: 'You will see several token choices, including fake lookalikes. Click the exact matching token before time runs out.' },
  { num: '03', title: 'BUILD YOUR EDGE',  desc: 'After each run, you can review your speed, accuracy, and streaks. Improve your rank over time, then challenge someone in 1v1.' },
];

const HERO_TITLES = ['PRECISION TRAINER', 'REACTION TRAINER'];

// Scattered coins for the hero right column
// top/left are absolute within the 600px-tall right panel
// depth: how many px the coin shifts on mouse move (larger = nearer)
const COINS = [
  { top: '-20px', left: '36%', size: 155, rx:  8, ry: -18, rz:  4, delay: 0.0, dur: 5.5, depth: 28, img: '/coins/coin1.png' },
  { top:  '55px', left: '76%', size:  82, rx: -6, ry:  20, rz: -5, delay: 1.1, dur: 4.8, depth: 11, img: '/coins/coin2.png' },
  { top: '205px', left:  '4%', size: 115, rx:  5, ry: -14, rz:  3, delay: 0.6, dur: 6.1, depth: 20, img: '/coins/coin3.png' },
  { top: '250px', left: '63%', size: 105, rx: -7, ry:  17, rz: -4, delay: 1.6, dur: 5.2, depth: 16, img: '/coins/coin4.png' },
  { top: '410px', left: '20%', size:  75, rx:  3, ry:  -9, rz:  7, delay: 0.3, dur: 4.6, depth:  8, img: '/coins/coin5.png' },
  { top: '390px', left: '53%', size: 138, rx: -9, ry:  13, rz: -2, delay: 1.9, dur: 5.9, depth: 25, img: '/coins/coin6.png' },
];


function GlassCard({ children, style, className = '', ...props }) {
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(135deg, ${C.bgCard} 0%, ${C.bgElevated} 100%)`,
        border: `1px solid rgba(72,187,120,0.12)`,
        borderRadius: 16,
        boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const headlineRef = useRef(null);
  const subRef      = useRef(null);
  const coinRefs    = useRef([]);
  const [heroTitleIndex, setHeroTitleIndex] = useState(0);
  const [heroTitleVisible, setHeroTitleVisible] = useState(true);

  // ── Scroll reveal ────────────────────────────────────────────────────────
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = parseInt(entry.target.dataset.revealOrder || '0', 10);
            setTimeout(() => entry.target.classList.add('is-visible'), delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // ── Mouse parallax ───────────────────────────────────────────────────────
  useEffect(() => {
    const mouse  = { x: 0, y: 0 };
    const smooth = { x: 0, y: 0 };
    let raf;

    const onMove = (e) => {
      mouse.x = e.clientX / window.innerWidth  - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };

    const tick = () => {
      smooth.x += (mouse.x - smooth.x) * 0.06;
      smooth.y += (mouse.y - smooth.y) * 0.06;

      coinRefs.current.forEach((el, i) => {
        if (!el) return;
        const depth = COINS[i]?.depth ?? 0;
        el.style.transform = `translate(${smooth.x * depth}px, ${smooth.y * depth * 0.7}px)`;
      });

      if (headlineRef.current)
        headlineRef.current.style.transform = `translate(${smooth.x * 10}px,${smooth.y * 8}px)`;
      if (subRef.current)
        subRef.current.style.transform = `translate(${smooth.x * 5}px,${smooth.y * 4}px)`;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  // ── Hero heading swap (PRECISION TRAINER / REACTION TRAINER) ──────────────────
  useEffect(() => {
    let swapTimeout;
    const interval = setInterval(() => {
      setHeroTitleVisible(false);
      swapTimeout = setTimeout(() => {
        setHeroTitleIndex((prev) => (prev + 1) % HERO_TITLES.length);
        setHeroTitleVisible(true);
      }, 180);
    }, 2200);

    return () => {
      clearInterval(interval);
      clearTimeout(swapTimeout);
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.text,
      position: 'relative',
      fontFamily: "'Geist Mono', 'Courier New', monospace",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${C.bg}; overflow-x: clip; scroll-behavior: smooth; }
        .content { position: relative; z-index: 1; }

        .btn-primary {
          display: inline-block; padding: 14px 36px;
          background: linear-gradient(135deg, ${C.green}, ${C.greenDim});
          color: #000; font-family: inherit; font-size: 13px; font-weight: 800;
          letter-spacing: 2px; text-transform: uppercase; text-decoration: none;
          border: none; border-radius: 8px; cursor: pointer;
          box-shadow: 0 0 24px rgba(72,187,120,0.35), 0 4px 16px rgba(0,0,0,0.4);
          transition: transform 0.2s ease; position: relative; overflow: hidden;
        }
        .btn-primary::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
          transform: translateX(-100%); transition: transform 0.5s ease;
        }
        .btn-primary:hover::after { transform: translateX(100%); }
        .btn-primary:hover { transform: translateY(-2px); }

        .btn-ghost {
          display: inline-block; padding: 14px 36px; background: transparent;
          color: ${C.textMuted}; font-family: inherit; font-size: 13px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase; text-decoration: none;
          border: 1px solid ${C.textDim}; border-radius: 8px; cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-ghost:hover { border-color: ${C.textMuted}; color: ${C.text}; transform: translateY(-1px); }

        .feature-card {
          background: linear-gradient(135deg, ${C.bgCard} 0%, ${C.bgElevated} 100%);
          border: 1px solid rgba(72,187,120,0.1); border-radius: 14px;
          padding: 28px; transition: all 0.2s ease; box-shadow: 0 2px 16px rgba(0,0,0,0.3);
        }
        .feature-card:hover {
          border-color: rgba(72,187,120,0.28);
          box-shadow: 0 4px 32px rgba(72,187,120,0.08), 0 8px 32px rgba(0,0,0,0.4);
          transform: translateY(-2px);
        }

        .step-line { display: flex; align-items: flex-start; gap: 28px; }

        .hero-word-gradient {
          background: linear-gradient(135deg, ${C.green} 0%, ${C.cyan} 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-title-main,
        .hero-title-sub {
          display: block;
          font-size: clamp(40px, 4.2vw, 62px);
          line-height: 1.05;
        }
        .hero-title-main { white-space: nowrap; }
        .hero-title-anim {
          display: inline-block;
          transition: opacity 180ms ease, transform 180ms ease;
          will-change: opacity, transform;
        }
        .hero-title-out { opacity: 0; transform: translateY(8px); }
        .hero-title-in { opacity: 1; transform: translateY(0); }

        /* ── Coin float ───────────────────────────────────────────── */
        @keyframes coinFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-14px); }
        }

        /* ── CTA neon pulse ───────────────────────────────────────── */
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 24px rgba(72,187,120,0.35), 0 4px 16px rgba(0,0,0,0.4); }
          50%       { box-shadow: 0 0 64px rgba(72,187,120,0.80), 0 0 120px rgba(72,187,120,0.28), 0 4px 16px rgba(0,0,0,0.4); }
        }
        .btn-glow-pulse { animation: glowPulse 2.5s ease-in-out infinite; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse { animation: pulse 2.5s ease-in-out infinite; }

        /* ── Scroll reveal ────────────────────────────────────────── */
        .reveal {
          opacity: 0; transform: translateY(28px);
          transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1);
          will-change: opacity, transform;
        }
        .reveal.is-visible { opacity: 1; transform: none; will-change: auto; }
        @media (prefers-reduced-motion: reduce) {
          html, body { scroll-behavior: auto; }
          .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
          .hero-title-anim { transition: none !important; }
        }

        .parallax-layer { will-change: transform; }

        /* ── Responsive ───────────────────────────────────────────── */
        @media (max-width: 1200px) {
          .hero-title-main,
          .hero-title-sub { font-size: clamp(34px, 3.7vw, 52px); }
        }
        @media (max-width: 960px) {
          .hero-inner { flex-direction: column !important; gap: 60px !important; }
          .hero-left  { flex: none !important; max-width: 100% !important; text-align: center; padding-right: 0 !important; }
          .hero-right { display: none !important; }
          .cta-row    { justify-content: center !important; }
          .hero-stats { justify-content: center !important; }
          .hero-title-main { white-space: normal; }
        }
        @media (max-width: 700px) {
          .hero-title    { font-size: 36px !important; letter-spacing: -1px !important; }
          .hero-title-main,
          .hero-title-sub { font-size: 36px !important; }
          .hero-sub      { font-size: 14px !important; }
          .cta-row       { flex-direction: column !important; align-items: stretch !important; }
          .cta-row a, .cta-row button { text-align: center !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .modes-row     { flex-direction: column !important; }
          .ranks-row     { flex-wrap: wrap !important; }
          .nav-links     { display: none !important; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'relative', zIndex: 100,
        display: 'flex', alignItems: 'center',
        padding: '0 40px', height: 60,
        background: 'rgba(11,14,20,0.96)',
        borderBottom: `1px solid rgba(72,187,120,0.1)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 200, flexShrink: 0 }}>
          <img src="/logo.png" alt="Trenches logo" style={{ height: 38, width: 'auto', display: 'block' }} />
        </div>
        <div className="nav-links" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 32, alignItems: 'center' }}>
          {[['#how-it-works','HOW IT WORKS'],['#modes','MODES'],['#ranks','RANKS'],['/roadmap','ROADMAP']].map(([href, label]) => (
            href.startsWith('#') ? (
              <a key={href} href={href} style={{ color: C.textMuted, textDecoration: 'none', fontSize: 12, letterSpacing: 1.5, fontWeight: 600, transition: 'color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.color = C.text}
                onMouseOut={e  => e.currentTarget.style.color = C.textMuted}>
                {label}
              </a>
            ) : (
              <Link key={href} href={href} style={{ color: C.textMuted, textDecoration: 'none', fontSize: 12, letterSpacing: 1.5, fontWeight: 600, transition: 'color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.color = C.text}
                onMouseOut={e  => e.currentTarget.style.color = C.textMuted}>
                {label}
              </Link>
            )
          ))}
        </div>
        <div style={{ width: 200, marginLeft: 'auto', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <Link href="/play" className="btn-primary" style={{ padding: '10px 24px', fontSize: 11 }}>PLAY NOW</Link>
        </div>
      </nav>

      <div className="content">

        {/* ── HERO ────────────────────────────────────────────────────── */}
        <section style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          padding: '80px 40px 60px',
          overflow: 'hidden',
        }}>
          <div className="hero-inner" style={{
            maxWidth: 1280,
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
          }}>

            {/* ── Left: text ─────────────────────────────────────────── */}
            <div className="hero-left" style={{ flex: '0 0 46%', maxWidth: '46%', paddingRight: 32 }}>

              {/* Headline */}
              <div ref={headlineRef} className="parallax-layer">
                <h1 className="hero-title" style={{
                  fontWeight: 900,
                  letterSpacing: -2,
                  lineHeight: 1.1,
                  marginBottom: 28,
                }}>
                  <span
                    className={`hero-word-gradient hero-title-main hero-title-anim ${heroTitleVisible ? 'hero-title-in' : 'hero-title-out'}`}
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {HERO_TITLES[heroTitleIndex]}
                  </span>
                  <span className="hero-title-sub" style={{
                    background: `linear-gradient(135deg, ${C.text} 0%, ${C.textMuted} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>FOR THE TRENCHES</span>
                </h1>
              </div>

              {/* Subtitle */}
              <div ref={subRef} className="parallax-layer">
                <p className="hero-sub" style={{
                  fontSize: 16, color: C.textMuted,
                  maxWidth: 460, lineHeight: 1.8, marginBottom: 44, fontWeight: 400,
                }}>
                  Improve your reaction speed by finding the correct token fast.
                  Avoid decoys, stay accurate, and beat the timer on every round.
                </p>
              </div>

              {/* CTA */}
              <div className="cta-row" style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 56 }}>
                <Link href="/play" className="btn-primary btn-glow-pulse">START TRAINING</Link>
                <a href="#how-it-works" className="btn-ghost">HOW IT WORKS</a>
              </div>

              {/* Stats */}
              <div className="hero-stats" style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                {[
                  { label: 'AVG REACTION TIME',   value: '~280ms',  color: C.green   },
                  { label: 'CHALLENGER SOLO TIER', value: '1000 RP', color: '#ff3366' },
                  { label: 'DIFFICULTY LEVELS',   value: '10',      color: C.orange  },
                ].map(stat => (
                  <div key={stat.label}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: stat.color, letterSpacing: -1 }}>{stat.value}</div>
                    <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, marginTop: 4, fontWeight: 600 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: scattered coins ─────────────────────────────── */}
            <div className="hero-right" style={{ flex: 1, position: 'relative', height: 600, minWidth: 0 }}>
              {COINS.map((coin, i) => (
                <div
                  key={i}
                  ref={el => { coinRefs.current[i] = el; }}
                  className="parallax-layer"
                  style={{ position: 'absolute', top: coin.top, left: coin.left }}
                >
                  <div style={{ animation: `coinFloat ${coin.dur}s ease-in-out ${coin.delay}s infinite` }}>
                    <div style={{ transform: `perspective(700px) rotateX(${coin.rx}deg) rotateY(${coin.ry}deg) rotateZ(${coin.rz}deg)` }}>
                      <img
                        src={coin.img}
                        alt=""
                        style={{
                          width: coin.size,
                          height: coin.size,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 ${Math.round(coin.size * 0.28)}px rgba(72,187,120,0.08)`,
                          userSelect: 'none',
                          pointerEvents: 'none',
                          display: 'block',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
        <section id="how-it-works" style={{ padding: '100px 24px', maxWidth: 860, margin: '0 auto' }}>
          <div className="reveal" data-reveal data-reveal-order="0" style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: C.green, fontWeight: 700, marginBottom: 12 }}>THE LOOP</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>How It Works</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {steps.map((step, i) => (
              <GlassCard key={i} className="reveal" data-reveal data-reveal-order={`${70 + i * 85}`} style={{ padding: '36px 40px' }}>
                <div className="step-line">
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: C.green, opacity: 0.5, minWidth: 28, paddingTop: 2 }}>{step.num}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: C.text, marginBottom: 8 }}>{step.title}</div>
                    <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.8, fontWeight: 400 }}>{step.desc}</div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── GAME MODES ──────────────────────────────────────────────── */}
        <section id="modes" style={{ padding: '60px 24px 100px', maxWidth: 900, margin: '0 auto' }}>
          <div className="reveal" data-reveal data-reveal-order="0" style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: C.orange, fontWeight: 700, marginBottom: 12 }}>CHOOSE YOUR PATH</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>Game Modes</h2>
          </div>
          <div className="modes-row" style={{ display: 'flex', gap: 24 }}>
            <GlassCard className="reveal" data-reveal data-reveal-order="80" style={{ flex: 1, padding: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, color: C.green, fontWeight: 700, marginBottom: 8 }}>SOLO</div>
                <h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 12 }}>Solo Mode</h3>
                <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.8 }}>Train at your own pace across 10 difficulty levels. Sessions are tracked, ranked, and stored to your profile so you can see your improvement over time.</p>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Difficulty levels 1–10','Accuracy & streak tracking','Ranked after each session','Persistent stats profile'].map(f => (
                  <li key={f} style={{ fontSize: 12, color: C.textMuted, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: C.green }}>›</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/play" className="btn-primary" style={{ textAlign: 'center' }}>TRAIN SOLO</Link>
            </GlassCard>

            <GlassCard className="reveal" data-reveal data-reveal-order="150" style={{ flex: 1, padding: 40, display: 'flex', flexDirection: 'column', gap: 20, borderColor: 'rgba(237,137,54,0.2)' }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, color: C.orange, fontWeight: 700, marginBottom: 8 }}>COMPETITIVE</div>
                <h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 12 }}>1v1 Duel</h3>
                <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.8 }}>Face off against another player on identical rounds. Same seed, same tokens — pure reaction speed and accuracy. Best of 1, 3, 5, or 10.</p>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Synchronized identical rounds','Private codes or public lobbies','Best of 1 / 3 / 5 / 10','Win/loss record tracking'].map(f => (
                  <li key={f} style={{ fontSize: 12, color: C.textMuted, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: C.orange }}>›</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/play" style={{
                display: 'block', padding: '14px 36px',
                background: `linear-gradient(135deg, ${C.orange}, #c05621)`,
                color: '#000', fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
                letterSpacing: 2, textTransform: 'uppercase', textDecoration: 'none',
                borderRadius: 8, textAlign: 'center',
                boxShadow: '0 0 24px rgba(237,137,54,0.35)', transition: 'all 0.2s',
              }}>FIND A MATCH</Link>
            </GlassCard>
          </div>
        </section>

        {/* ── RANKS ───────────────────────────────────────────────────── */}
        <section id="ranks" style={{ padding: '60px 24px 100px', maxWidth: 900, margin: '0 auto' }}>
          <div className="reveal" data-reveal data-reveal-order="0" style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: '#ff6bff', fontWeight: 700, marginBottom: 12 }}>WHERE DO YOU LAND?</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>Rank Tiers</h2>
            <p style={{ color: C.textMuted, fontSize: 13, marginTop: 12, lineHeight: 1.8 }}>After each solo session, your Solo RP updates based on speed, accuracy, and consistency.</p>
          </div>
          <GlassCard className="reveal" data-reveal data-reveal-order="90" style={{ padding: '40px 48px' }}>
            <div className="ranks-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              {ranks.map((r, i) => (
                <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: `${r.color}22`,
                    border: `2px solid ${r.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px', fontSize: 18,
                  }}>
                    {r.icon}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1.5, color: r.color, marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{r.threshold}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        {/* ── FINAL CTA ───────────────────────────────────────────────── */}
        <section className="reveal" data-reveal data-reveal-order="0" style={{ padding: '80px 24px 120px', textAlign: 'center', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 600, height: 300,
            background: `radial-gradient(ellipse, rgba(72,187,120,0.07) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
          <div style={{ fontSize: 11, letterSpacing: 4, color: C.green, fontWeight: 700, marginBottom: 20, position: 'relative' }}>READY TO GRIND?</div>
          <h2 style={{ fontSize: 48, fontWeight: 900, letterSpacing: -2, marginBottom: 24, position: 'relative' }}>Your edge starts here.</h2>
          <p style={{ fontSize: 14, color: C.textMuted, position: 'relative', maxWidth: 400, margin: '0 auto 48px', lineHeight: 1.8 }}>
            Free to play. No download. Just reaction time, accuracy, and the will to be faster.
          </p>
          <div style={{ position: 'relative' }}>
            <Link href="/play" className="btn-primary btn-glow-pulse" style={{ fontSize: 14, padding: '16px 48px', letterSpacing: 3 }}>
              START TRAINING NOW
            </Link>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <footer className="reveal" data-reveal data-reveal-order="40" style={{
          borderTop: `1px solid ${C.textDim}22`,
          maxWidth: 900, margin: '0 auto', width: '100%',
          padding: '32px 24px',
          display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifySelf: 'start' }}>
            <img src="/logo.png" alt="Trenches logo" style={{ height: 22, width: 'auto', display: 'block' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: C.textDim, letterSpacing: 1 }}>Built for those who move first.</div>
            <a href="mailto:firsttxio@gmail.com" style={{ fontSize: 11, color: C.green, textDecoration: 'none', letterSpacing: 1 }}>
              firsttxio@gmail.com
            </a>
          </div>
          <Link href="/play" style={{ fontSize: 11, color: C.green, textDecoration: 'none', letterSpacing: 1.5, fontWeight: 700, justifySelf: 'end' }}>PLAY →</Link>
        </footer>

      </div>
    </div>
  );
}
