export const SFX = (() => {
  let ctx = null;
  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  };
  const play = (freq, type, dur, vol = 0.12) => {
    try {
      const c = getCtx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(c.currentTime);
      o.stop(c.currentTime + dur);
    } catch {
      // Audio can fail when autoplay/user-gesture policies block context usage.
    }
  };

  return {
    hit: () => {
      play(880, "sine", 0.08, 0.15);
      setTimeout(() => play(1320, "sine", 0.12, 0.12), 50);
      setTimeout(() => play(1760, "sine", 0.15, 0.08), 100);
    },
    miss: () => {
      play(220, "sawtooth", 0.2, 0.1);
      setTimeout(() => play(165, "sawtooth", 0.25, 0.08), 80);
    },
    penalty: () => {
      play(110, "square", 0.3, 0.08);
    },
    click: () => {
      play(660, "sine", 0.04, 0.06);
    },
    arm: () => {
      play(440, "sine", 0.06, 0.04);
    },
    armed: () => {
      play(880, "triangle", 0.15, 0.08);
      setTimeout(() => play(1100, "triangle", 0.1, 0.06), 60);
    },
    combo: () => {
      [0, 60, 120, 180].forEach((d, i) => setTimeout(() => play(660 + i * 220, "sine", 0.1, 0.07), d));
    },
    countdown: (n) => {
      play(n === 0 ? 880 : 440, n === 0 ? "triangle" : "sine", n === 0 ? 0.2 : 0.1, 0.1);
    },
  };
})();
