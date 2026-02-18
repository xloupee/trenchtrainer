'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import ThreeBackground from '../components/ThreeBackground';

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
  { label: 'UNRANKED', color: C.textDim, threshold: null },
  { label: 'BRONZE', color: '#cd7f32', threshold: '< 600ms' },
  { label: 'SILVER', color: '#a8a9ad', threshold: '< 450ms' },
  { label: 'GOLD', color: '#ffd700', threshold: '< 350ms' },
  { label: 'DIAMOND', color: '#b9f2ff', threshold: '< 260ms' },
  { label: 'CHALLENGER', color: '#ff6bff', threshold: '< 200ms' },
];

const steps = [
  {
    num: '01',
    title: 'READ THE SIGNAL',
    desc: 'A tweet surfaces in the feed. Somewhere in the noise is the token being called. Parse it fast.',
    icon: null,
  },
  {
    num: '02',
    title: 'SNIPE THE TOKEN',
    desc: 'A wave of tokens floods your screen — real ones, traps, decoys. Click the right one before the window closes.',
    icon: null,
  },
  {
    num: '03',
    title: 'BUILD YOUR EDGE',
    desc: 'Track your reaction time, accuracy, and streaks. Climb the ranks. Challenge others 1v1.',
    icon: null,
  },
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

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.text,
      position: 'relative',
      fontFamily: "'Geist Mono', 'Courier New', monospace",
    }}>
      <ThreeBackground />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        html, body { background: ${C.bg}; overflow-x: clip; }

        .content { position: relative; z-index: 1; }

        .btn-primary {
          display: inline-block;
          padding: 14px 36px;
          background: linear-gradient(135deg, ${C.green}, ${C.greenDim});
          color: #000;
          font-family: inherit;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          text-decoration: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 0 24px rgba(72,187,120,0.35), 0 4px 16px rgba(0,0,0,0.4);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        .btn-primary:hover::after { transform: translateX(100%); }
        .btn-primary:hover {
          box-shadow: 0 0 40px rgba(72,187,120,0.55), 0 8px 24px rgba(0,0,0,0.5);
          transform: translateY(-1px);
        }

        .btn-ghost {
          display: inline-block;
          padding: 14px 36px;
          background: transparent;
          color: ${C.textMuted};
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          text-decoration: none;
          border: 1px solid ${C.textDim};
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-ghost:hover {
          border-color: ${C.textMuted};
          color: ${C.text};
          transform: translateY(-1px);
        }

        .feature-card {
          background: linear-gradient(135deg, ${C.bgCard} 0%, ${C.bgElevated} 100%);
          border: 1px solid rgba(72,187,120,0.1);
          border-radius: 14px;
          padding: 28px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 16px rgba(0,0,0,0.3);
        }
        .feature-card:hover {
          border-color: rgba(72,187,120,0.28);
          box-shadow: 0 4px 32px rgba(72,187,120,0.08), 0 8px 32px rgba(0,0,0,0.4);
          transform: translateY(-2px);
        }

        .step-line {
          display: flex;
          align-items: flex-start;
          gap: 28px;
        }
        @media (max-width: 700px) {
          .hero-title { font-size: 36px !important; letter-spacing: -1px !important; }
          .hero-sub { font-size: 14px !important; }
          .cta-row { flex-direction: column !important; align-items: stretch !important; }
          .cta-row a, .cta-row button { text-align: center !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .modes-row { flex-direction: column !important; }
          .ranks-row { flex-wrap: wrap !important; }
          .nav-links { display: none !important; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 3.5s ease-in-out infinite; }
        .animate-pulse { animation: pulse 2.5s ease-in-out infinite; }
        .animate-slideup { animation: slideUp 0.5s ease forwards; }

        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1);
          will-change: opacity, transform;
        }
        .reveal.is-visible {
          opacity: 1;
          transform: none;
          will-change: auto;
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: 'relative',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        padding: '0 40px',
        height: 60,
        background: 'rgba(11,14,20,0.96)',
        borderBottom: `1px solid rgba(72,187,120,0.1)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 200, flexShrink: 0 }}>
          <img src="/logo.png" alt="Trenches logo" style={{ height: 38, width: 'auto', display: 'block' }} />
        </div>
        <div className="nav-links" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 32, alignItems: 'center' }}>
          <a href="#how-it-works" style={{ color: C.textMuted, textDecoration: 'none', fontSize: 12, letterSpacing: 1.5, fontWeight: 600, transition: 'color 0.2s' }}
            onMouseOver={e => e.target.style.color = C.text}
            onMouseOut={e => e.target.style.color = C.textMuted}>
            HOW IT WORKS
          </a>
          <a href="#modes" style={{ color: C.textMuted, textDecoration: 'none', fontSize: 12, letterSpacing: 1.5, fontWeight: 600, transition: 'color 0.2s' }}
            onMouseOver={e => e.target.style.color = C.text}
            onMouseOut={e => e.target.style.color = C.textMuted}>
            MODES
          </a>
          <a href="#ranks" style={{ color: C.textMuted, textDecoration: 'none', fontSize: 12, letterSpacing: 1.5, fontWeight: 600, transition: 'color 0.2s' }}
            onMouseOver={e => e.target.style.color = C.text}
            onMouseOut={e => e.target.style.color = C.textMuted}>
            RANKS
          </a>
        </div>
        <div style={{ width: 200, marginLeft: 'auto', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <Link href="/play" className="btn-primary" style={{ padding: '10px 24px', fontSize: 11 }}>
            PLAY NOW
          </Link>
        </div>
      </nav>

      <div className="content">

        {/* HERO */}
        <section className="reveal" data-reveal data-reveal-order="0" style={{
          minHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 24px 60px',
        }}>
          <div style={{ width: 'min(860px, 100%)', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="animate-float" style={{ marginBottom: 26 }}>
              <img src="/logo.png" alt="Trenches logo" style={{ height: 112, width: 'auto', display: 'block', margin: '0 auto' }} />
            </div>

            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 4,
              color: C.green,
              marginBottom: 20,
              textTransform: 'uppercase',
            }}>
              <span className="animate-pulse" style={{ display: 'inline-block', width: 6, height: 6, background: C.green, borderRadius: '50%', marginRight: 8, verticalAlign: 'middle' }} />
              Reaction Trainer for Crypto Traders
            </div>

            <h1 className="hero-title" style={{
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: -3,
              lineHeight: 1.0,
              marginBottom: 28,
              background: `linear-gradient(135deg, ${C.text} 0%, ${C.textMuted} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              TRAIN IN THE<br />
              <span style={{
                background: `linear-gradient(135deg, ${C.green} 0%, ${C.cyan} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>TRENCHES</span>
            </h1>

            <p className="hero-sub" style={{
              fontSize: 17,
              color: C.textMuted,
              maxWidth: 520,
              lineHeight: 1.75,
              marginBottom: 48,
              fontWeight: 400,
            }}>
              Sharpen your reaction time. Cut through the noise.
              Identify the right token before the window closes —
              then challenge someone to prove it.
            </p>

            <div className="cta-row" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Link href="/play" className="btn-primary">
                START TRAINING
              </Link>
              <a href="#how-it-works" className="btn-ghost">
                SEE HOW IT WORKS
              </a>
            </div>

            {/* FAKE STAT BAR */}
            <div style={{
              marginTop: 80,
              display: 'flex',
              gap: 48,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              {[
                { label: 'AVG REACTION TIME', value: '~280ms', color: C.green },
                { label: 'TOP RANK THRESHOLD', value: '< 200ms', color: '#ff6bff' },
                { label: 'DIFFICULTY LEVELS', value: '10', color: C.orange },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: stat.color, letterSpacing: -1 }}>{stat.value}</div>
                  <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, marginTop: 4, fontWeight: 600 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" style={{ padding: '100px 24px', maxWidth: 860, margin: '0 auto' }}>
          <div className="reveal" data-reveal data-reveal-order="0" style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: C.green, fontWeight: 700, marginBottom: 12 }}>THE LOOP</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>How It Works</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {steps.map((step, i) => (
              <GlassCard key={i} className="reveal" data-reveal data-reveal-order={`${70 + i * 85}`} style={{ padding: '36px 40px' }}>
                <div className="step-line">
                  <div style={{
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 2,
                    color: C.green,
                    opacity: 0.5,
                    minWidth: 28,
                    paddingTop: 2,
                  }}>{step.num}</div>
                  {step.icon && <div style={{ fontSize: 36, minWidth: 44 }}>{step.icon}</div>}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: C.text, marginBottom: 8 }}>{step.title}</div>
                    <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.8, fontWeight: 400 }}>{step.desc}</div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* GAME MODES */}
        <section id="modes" style={{ padding: '60px 24px 100px', maxWidth: 900, margin: '0 auto' }}>
          <div className="reveal" data-reveal data-reveal-order="0" style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: C.orange, fontWeight: 700, marginBottom: 12 }}>CHOOSE YOUR PATH</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>Game Modes</h2>
          </div>

          <div className="modes-row" style={{ display: 'flex', gap: 24 }}>
            {/* PRACTICE */}
            <GlassCard className="reveal" data-reveal data-reveal-order="80" style={{ flex: 1, padding: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, color: C.green, fontWeight: 700, marginBottom: 8 }}>SOLO</div>
                <h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 12 }}>Practice Mode</h3>
                <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.8 }}>
                  Train at your own pace across 10 difficulty levels. Sessions are tracked, ranked, and stored to your profile so you can see your improvement over time.
                </p>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Difficulty levels 1–10', 'Accuracy & streak tracking', 'Ranked after each session', 'Persistent stats profile'].map(f => (
                  <li key={f} style={{ fontSize: 12, color: C.textMuted, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: C.green }}>›</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/play" className="btn-primary" style={{ textAlign: 'center' }}>TRAIN SOLO</Link>
            </GlassCard>

            {/* 1v1 */}
            <GlassCard className="reveal" data-reveal data-reveal-order="150" style={{ flex: 1, padding: 40, display: 'flex', flexDirection: 'column', gap: 20, borderColor: 'rgba(237,137,54,0.2)' }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, color: C.orange, fontWeight: 700, marginBottom: 8 }}>COMPETITIVE</div>
                <h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 12 }}>1v1 Duel</h3>
                <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.8 }}>
                  Face off against another player on identical rounds. Same seed, same tokens — pure reaction speed and accuracy. Best of 5, 10, or 20.
                </p>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Synchronized identical rounds', 'Private codes or public lobbies', 'Best of 5 / 10 / 20', 'Win/loss record tracking'].map(f => (
                  <li key={f} style={{ fontSize: 12, color: C.textMuted, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: C.orange }}>›</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/play" style={{
                display: 'block',
                padding: '14px 36px',
                background: `linear-gradient(135deg, ${C.orange}, #c05621)`,
                color: '#000',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderRadius: 8,
                textAlign: 'center',
                boxShadow: '0 0 24px rgba(237,137,54,0.35)',
                transition: 'all 0.2s',
              }}>FIND A MATCH</Link>
            </GlassCard>
          </div>
        </section>

        {/* RANKS */}
        <section id="ranks" style={{ padding: '60px 24px 100px', maxWidth: 900, margin: '0 auto' }}>
          <div className="reveal" data-reveal data-reveal-order="0" style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: '#ff6bff', fontWeight: 700, marginBottom: 12 }}>WHERE DO YOU LAND?</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>Rank Tiers</h2>
            <p style={{ color: C.textMuted, fontSize: 13, marginTop: 12, lineHeight: 1.8 }}>
              After each practice session, your average reaction time determines your rank.
            </p>
          </div>

          <GlassCard className="reveal" data-reveal data-reveal-order="90" style={{ padding: '40px 48px' }}>
            <div className="ranks-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              {ranks.map((r, i) => (
                <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: r.label === 'UNRANKED' ? C.bgElevated : `${r.color}22`,
                    border: `2px solid ${r.label === 'UNRANKED' ? C.textDim : r.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    fontSize: 18,
                  }}>
                    {['—', '🥉', '🥈', '🥇', '💎', '👑'][i]}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1.5, color: r.color, marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{r.threshold || '—'}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        {/* FINAL CTA */}
        <section className="reveal" data-reveal data-reveal-order="0" style={{
          padding: '80px 24px 120px',
          textAlign: 'center',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            height: 300,
            background: `radial-gradient(ellipse, rgba(72,187,120,0.07) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
          <div style={{ fontSize: 11, letterSpacing: 4, color: C.green, fontWeight: 700, marginBottom: 20, position: 'relative' }}>READY TO GRIND?</div>
          <h2 style={{ fontSize: 48, fontWeight: 900, letterSpacing: -2, marginBottom: 24, position: 'relative' }}>
            Your edge starts here.
          </h2>
          <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 48, position: 'relative', maxWidth: 400, margin: '0 auto 48px' }}>
            Free to play. No download. Just reaction time, accuracy, and the will to be faster.
          </p>
          <div style={{ position: 'relative' }}>
            <Link href="/play" className="btn-primary" style={{ fontSize: 14, padding: '16px 48px', letterSpacing: 3 }}>
              START TRAINING NOW
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="reveal" data-reveal data-reveal-order="40" style={{
          borderTop: `1px solid ${C.textDim}22`,
          padding: '32px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.png" alt="Trenches logo" style={{ height: 22, width: 'auto', display: 'block' }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: C.textMuted }}>TRENCHES TRAINER</span>
          </div>
          <div style={{ fontSize: 11, color: C.textDim, letterSpacing: 1 }}>
            Built for those who move first.
          </div>
          <Link href="/play" style={{ fontSize: 11, color: C.green, textDecoration: 'none', letterSpacing: 1.5, fontWeight: 700 }}>
            PLAY →
          </Link>
        </footer>

      </div>
    </div>
  );
}
