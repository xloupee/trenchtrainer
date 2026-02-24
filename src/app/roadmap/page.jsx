"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { C } from "../../components/trenches/config/constants";
import { CSS } from "../../components/trenches/styles/cssText";

const TIMELINE_MARKER_TOP_OFFSET = 6;
const TIMELINE_LEFT_OFFSET = 8;

const getStatusColor = (status) => {
  if (status === "active") return C.green;
  if (status === "current") return C.yellow;
  return C.textDim;
};

const ROADMAP_PHASES = [
  {
    phase: "01",
    title: "Foundation & Launch",
    objective: "Establish a stable core platform and transparent token structure.",
    status: "active",
    delay: 100,
    categories: [
      { label: "Platform", items: ["Core training mode live", "Reaction time tracking", "Accuracy tracking", "UI refinement"] },
      { label: "Token", items: ["$FTX launch", "Dev allocation locked", "Transparent wallet disclosure", "Initial liquidity established"] },
    ],
    focus: ["Platform stability", "Community growth", "Trust through transparency"],
  },
  {
    phase: "02",
    title: "Competitive Expansion",
    objective: "Introduce structured skill-based competition.",
    status: "current",
    delay: 300,
    categories: [
      { label: "Gameplay", items: ["1v1 mode", "Ranked matchmaking", "Best-of format battles", "Performance-based rating system"] },
      { label: "Infrastructure", items: ["Improved server validation", "Latency normalization", "Anti-cheat refinement"] },
    ],
    focus: ["Competitive integrity", "Fair play enforcement", "Platform stress testing"],
  },
  {
    phase: "03",
    title: "Wager Mode Rollout",
    objective: "Launch a simple wager match flow that regular players can use without technical knowledge.",
    status: "upcoming",
    delay: 500,
    categories: [
      { label: "Gameplay", items: ["Wager-only queue", "Host/guest escrow funding", "Match-ready state gating"] },
      {
        label: "How To Play",
        items: [
          "Connect your wallet and choose how much you want to play for.",
          "Create a room or join one, then both players lock in their entry amount.",
          "Play the 1v1 match. Winner gets the prize. If a match never starts, funds can be returned after timeout.",
        ],
      },
    ],
    focus: ["Easy onboarding", "Fair payouts", "Simple safety rules"],
  },
  {
    phase: "04",
    title: "Utility Expansion",
    objective: "Introduce structured token utility within competitive play once systems are validated.",
    status: "upcoming",
    delay: 700,
    categories: [
      { label: "Integration", items: ["$FTX/$SOL entry pools", "Structured prize distribution", "Competitive tournaments"] },
      { label: "Security", items: ["Proven anti-cheat", "Secure contract logic", "Platform stability"] },
    ],
    focus: ["Utility maturity", "Secure competitive play", "Prize ecosystems"],
  },
];

const RoadmapPhase = ({ phase, title, objective, categories, focus, delay = 0, status = "upcoming", registerRef = null }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [bulletsVisible, setBulletsVisible] = useState(false);
  const phaseRef = useRef(null);

  useEffect(() => {
    const node = phaseRef.current;
    if (!node) return undefined;

    let phaseTimer = null;
    let bulletsTimer = null;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        phaseTimer = setTimeout(() => setIsVisible(true), delay);
        bulletsTimer = setTimeout(() => setBulletsVisible(true), delay + 140);
        observer.unobserve(entry.target);
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => {
      if (phaseTimer) clearTimeout(phaseTimer);
      if (bulletsTimer) clearTimeout(bulletsTimer);
      observer.disconnect();
    };
  }, [delay]);
  const statusColor = getStatusColor(status);

  return (
    <div
      ref={(node) => {
        phaseRef.current = node;
        if (typeof registerRef === "function") registerRef(node);
      }}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
        marginBottom: 52,
        position: "relative",
      }}
    >
      <div
        className="glass-card"
        style={{
          padding: "52px 40px",
          minHeight: 420,
          textAlign: "left",
          background: "rgba(10, 10, 10, 0.4)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: statusColor, letterSpacing: 2, marginBottom: 6 }}>PHASE {phase}</div>
            <h3 style={{ fontSize: 30, fontWeight: 900, color: C.text, letterSpacing: -0.6 }}>{title}</h3>
          </div>
          {status === "active" && (
            <div style={{ fontSize: 10, fontWeight: 900, color: C.green, padding: "5px 10px", borderRadius: 4, background: `${C.green}10`, border: `1px solid ${C.green}20`, letterSpacing: 1 }}>COMPLETED</div>
          )}
          {status === "current" && (
            <div style={{ fontSize: 10, fontWeight: 900, color: C.yellow, padding: "5px 10px", borderRadius: 4, background: `${C.yellow}10`, border: `1px solid ${C.yellow}20`, letterSpacing: 1, animation: "pulse 2s infinite" }}>IN PROGRESS</div>
          )}
        </div>

        <p style={{ fontSize: 15, color: C.textMuted, marginBottom: 28, lineHeight: 1.75 }}>{objective}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 28, marginBottom: 28 }}>
          {categories.map((cat, idx) => (
            <div key={idx}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text, letterSpacing: 1.5, marginBottom: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 6, textTransform: "uppercase" }}>
                {cat.label}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {cat.items.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 14,
                      color: C.textDim,
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      opacity: bulletsVisible ? 1 : 0,
                      transform: bulletsVisible ? "translateY(0)" : "translateY(10px)",
                      transition: "opacity 0.38s ease, transform 0.42s cubic-bezier(0.2, 0.8, 0.2, 1)",
                      transitionDelay: bulletsVisible ? `${idx * 90 + i * 60}ms` : "0ms",
                    }}
                  >
                    <span style={{ color: statusColor, fontSize: 11 }}>{status === "active" ? "✓" : "○"}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {focus && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.textMuted, letterSpacing: 1 }}>FOCUS:</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {focus.map((f, i) => (
                <span key={i} style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{f}{i < focus.length - 1 ? " • " : ""}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function RoadmapPage() {
  const router = useRouter();
  const [isPageVisible, setIsPageVisible] = useState(false);
  const [isVisionVisible, setIsVisionVisible] = useState(false);
  const [timelineLayout, setTimelineLayout] = useState({ markerOffsets: [], railTop: 0, railHeight: 0 });
  const [timelineDisplayProgress, setTimelineDisplayProgress] = useState(0);
  const visionRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const timelineSectionRef = useRef(null);
  const phaseRefs = useRef([]);
  const resizeObserverRef = useRef(null);
  const scrollRafRef = useRef(null);
  const progressRafRef = useRef(null);
  const timelineGeometryRef = useRef({ markerOffsets: [], markerProgress: [], railTop: 0, railHeight: 0 });
  const timelineProgressRef = useRef({ target: 0, display: 0, running: false });

  useEffect(() => {
    const timer = setTimeout(() => setIsPageVisible(true), 60);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const node = visionRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        setIsVisionVisible(true);
        observer.unobserve(entry.target);
      },
      { threshold: 0.25, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const measureTimeline = () => {
    const section = timelineSectionRef.current;
    if (!section) return;
    const nodes = phaseRefs.current.filter(Boolean);
    if (nodes.length === 0) return;
    const sectionRect = section.getBoundingClientRect();
    const markerOffsets = nodes.map((node) => node.getBoundingClientRect().top - sectionRect.top + TIMELINE_MARKER_TOP_OFFSET);
    if (markerOffsets.length < 2) return;
    const railTop = markerOffsets[0];
    const railHeight = Math.max(0, markerOffsets[markerOffsets.length - 1] - markerOffsets[0]);
    const markerProgress = markerOffsets.map((offset) => (railHeight > 0 ? (offset - railTop) / railHeight : 0));
    timelineGeometryRef.current = { markerOffsets, markerProgress, railTop, railHeight };
    setTimelineLayout((prev) => {
      const sameLength = prev.markerOffsets.length === markerOffsets.length;
      const sameMarkers = sameLength && prev.markerOffsets.every((value, idx) => Math.abs(value - markerOffsets[idx]) < 0.5);
      if (sameMarkers && Math.abs(prev.railTop - railTop) < 0.5 && Math.abs(prev.railHeight - railHeight) < 0.5) return prev;
      return { markerOffsets, railTop, railHeight };
    });
  };

  const startProgressAnimation = () => {
    if (timelineProgressRef.current.running) return;
    timelineProgressRef.current.running = true;
    const tick = () => {
      const state = timelineProgressRef.current;
      const delta = state.target - state.display;
      state.display += delta * 0.18;
      if (Math.abs(delta) < 0.0008) state.display = state.target;
      setTimelineDisplayProgress((prev) => (Math.abs(prev - state.display) > 0.0004 ? state.display : prev));
      if (state.display !== state.target) {
        progressRafRef.current = requestAnimationFrame(tick);
      } else {
        state.running = false;
        progressRafRef.current = null;
      }
    };
    progressRafRef.current = requestAnimationFrame(tick);
  };

  const updateTimelineTargetProgress = () => {
    const container = scrollContainerRef.current;
    const nodes = phaseRefs.current.filter(Boolean);
    const { railHeight } = timelineGeometryRef.current;
    if (!container || nodes.length < 2 || railHeight <= 0) return;
    const containerRect = container.getBoundingClientRect();
    const activationY = containerRect.top + container.clientHeight * 0.3;
    const firstY = nodes[0].getBoundingClientRect().top + TIMELINE_MARKER_TOP_OFFSET;
    const lastY = nodes[nodes.length - 1].getBoundingClientRect().top + TIMELINE_MARKER_TOP_OFFSET;
    const span = Math.max(1, lastY - firstY);
    const raw = activationY - firstY;
    const next = Math.max(0, Math.min(1, raw / span));
    timelineProgressRef.current.target = next;
    startProgressAnimation();
  };

  useEffect(() => {
    const section = timelineSectionRef.current;
    if (!section) return undefined;

    const scheduleMeasure = () => requestAnimationFrame(() => {
      measureTimeline();
      updateTimelineTargetProgress();
    });
    scheduleMeasure();
    const t = setTimeout(scheduleMeasure, 220);

    const onResize = () => scheduleMeasure();
    window.addEventListener("resize", onResize);

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => scheduleMeasure());
      ro.observe(section);
      phaseRefs.current.forEach((node) => {
        if (node) ro.observe(node);
      });
      resizeObserverRef.current = ro;
    }

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    updateTimelineTargetProgress();
  }, [timelineLayout]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return undefined;
    const onScroll = () => {
      if (scrollRafRef.current) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        updateTimelineTargetProgress();
      });
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      if (progressRafRef.current) {
        cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
      timelineProgressRef.current.running = false;
    };
  }, [timelineLayout]);

  const handleBackToTerminal = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/play/solo");
  };

  return (
    <div
      ref={scrollContainerRef}
      className="menu-bg"
      style={{
        height: "100vh",
        maxHeight: "100vh",
        padding: "80px 20px",
        overflowY: "auto",
        overflowX: "hidden",
        display: "block",
      }}
    >
      <style>{CSS}</style>
      {/* Decorative Glows */}
      <div
        style={{
          position: "fixed",
          top: "10%",
          right: "-10%",
          width: 600,
          height: 600,
          background: `${C.green}05`,
          filter: "blur(120px)",
          borderRadius: "50%",
          pointerEvents: "none",
          animation: "glowDriftA 14s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "10%",
          left: "-10%",
          width: 600,
          height: 600,
          background: `${C.blue}05`,
          filter: "blur(120px)",
          borderRadius: "50%",
          pointerEvents: "none",
          animation: "glowDriftB 16s ease-in-out infinite",
        }}
      />

      <div
        style={{
          maxWidth: 940,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          opacity: isPageVisible ? 1 : 0,
          transform: isPageVisible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <button
            type="button"
            onClick={handleBackToTerminal}
            style={{
              fontSize: 11,
              color: C.textDim,
              textDecoration: "none",
              letterSpacing: 2,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 24,
              transition: "color 0.2s",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = C.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = C.textDim;
            }}
          >
            <span>←</span> BACK TO TERMINAL
          </button>
          <h1 style={{ fontSize: 48, fontWeight: 900, color: C.text, letterSpacing: -2, marginBottom: 12 }}>ROADMAP</h1>
          <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
            FirstTX is being built in structured phases. Each phase prioritizes stability, fairness, and long-term sustainability over rapid expansion.
          </p>
        </div>

        <div ref={timelineSectionRef} style={{ paddingLeft: 30, position: "relative" }}>
          {timelineLayout.railHeight > 0 && (
            <div style={{ position: "absolute", left: TIMELINE_LEFT_OFFSET, top: timelineLayout.railTop, width: 2, height: timelineLayout.railHeight, pointerEvents: "none", zIndex: 3 }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(180deg, ${C.border}55 0%, ${C.border}25 100%)`,
                }}
              />
              {ROADMAP_PHASES.map((phase, idx) => {
                if (idx === ROADMAP_PHASES.length - 1) return null;
                const markerStart = timelineLayout.markerOffsets[idx] - timelineLayout.railTop;
                const markerEnd = timelineLayout.markerOffsets[idx + 1] - timelineLayout.railTop;
                const segmentHeight = Math.max(0, markerEnd - markerStart);
                const filledByProgress = timelineDisplayProgress * timelineLayout.railHeight;
                const filled = Math.max(0, Math.min(segmentHeight, filledByProgress - markerStart));
                if (filled <= 0) return null;
                return (
                  <div
                    key={`seg-${phase.phase}`}
                    style={{
                      position: "absolute",
                      left: 0,
                      width: 2,
                      top: markerStart,
                      height: filled,
                      background: getStatusColor(phase.status),
                      boxShadow: `0 0 10px ${getStatusColor(phase.status)}40`,
                    }}
                  />
                );
              })}
            </div>
          )}

          {timelineLayout.markerOffsets.map((offset, idx) => {
            const phase = ROADMAP_PHASES[idx];
            const markerProgress = timelineGeometryRef.current.markerProgress[idx] || 0;
            const isActive = timelineDisplayProgress >= markerProgress - 0.008;
            const color = getStatusColor(phase.status);
            return (
              <div
                key={`marker-${phase.phase}`}
                style={{
                  position: "absolute",
                  left: TIMELINE_LEFT_OFFSET - 4,
                  top: offset - 4,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: isActive ? color : C.bgElevated,
                  border: `1px solid ${isActive ? color : C.border}`,
                  boxShadow: isActive ? `0 0 12px ${color}70` : "none",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                  transition: "all 0.18s ease",
                  zIndex: 4,
                  pointerEvents: "none",
                }}
              />
            );
          })}

          {ROADMAP_PHASES.map((phase, index) => (
            <RoadmapPhase
              key={phase.phase}
              phase={phase.phase}
              title={phase.title}
              objective={phase.objective}
              status={phase.status}
              delay={phase.delay}
              categories={phase.categories}
              focus={phase.focus}
              registerRef={(node) => {
                phaseRefs.current[index] = node;
                if (node && resizeObserverRef.current) resizeObserverRef.current.observe(node);
                requestAnimationFrame(() => {
                  measureTimeline();
                  updateTimelineTargetProgress();
                });
              }}
            />
          ))}

          <div
            ref={visionRef}
            style={{ 
              marginTop: 70,
              padding: "52px 42px",
              minHeight: 320,
              borderRadius: 20, 
              background: `linear-gradient(145deg, ${C.bgCard}, ${C.bg})`, 
              border: `1px solid ${C.border}`,
              textAlign: "center"
            }}
          >
            <h3 style={{ fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: 1, marginBottom: 18, textTransform: "uppercase" }}>Long-Term Vision</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, textAlign: "left" }}>
              {[
                "Advanced performance analytics",
                "Tournament ecosystem",
                "Revenue-supported development",
                "Strategic ecosystem partnerships",
                "Liquidity strengthening through growth"
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 15,
                    color: C.textMuted,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    opacity: isVisionVisible ? 1 : 0,
                    transform: isVisionVisible ? "translateY(0)" : "translateY(10px)",
                    transition: "opacity 0.4s ease, transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)",
                    transitionDelay: isVisionVisible ? `${i * 70}ms` : "0ms",
                  }}
                >
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.green }} />
                  {item}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32, fontSize: 13, color: C.textDim, letterSpacing: 3, fontWeight: 800, textTransform: "uppercase" }}>
              FirstTX is being built for longevity. Not for a single cycle.
            </div>
          </div>
        </div>

        <div style={{ height: 100 }} />
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @keyframes glowDriftA {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.45; }
          50% { transform: translate3d(-30px, 24px, 0) scale(1.08); opacity: 0.72; }
        }
        @keyframes glowDriftB {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.4; }
          50% { transform: translate3d(36px, -18px, 0) scale(1.05); opacity: 0.68; }
        }
        .glass-card {
          background: rgba(13, 13, 13, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          transition: border-color 0.3s ease, transform 0.3s ease;
        }
        .glass-card:hover {
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
