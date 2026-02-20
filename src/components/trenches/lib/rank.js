export function getRank(avgMs) {
  if (avgMs === null) return { tier: "UNRANKED", color: "#4a5568", glow: "none", icon: "—" };
  const s = avgMs / 1000;
  if (s < 1.25) return { tier: "CHALLENGER", color: "#ff3366", glow: "0 0 18px rgba(255,51,102,0.35)", icon: "♛" };
  if (s < 1.8) return { tier: "DIAMOND", color: "#00ccff", glow: "0 0 16px rgba(0,204,255,0.3)", icon: "◆" };
  if (s < 2.4) return { tier: "GOLD", color: "#fbbf24", glow: "0 0 14px rgba(251,191,36,0.3)", icon: "★" };
  if (s < 3) return { tier: "SILVER", color: "#eaeaea", glow: "0 0 10px rgba(234,234,234,0.2)", icon: "☆" };
  return { tier: "BRONZE", color: "#ff8c00", glow: "0 0 10px rgba(255,140,0,0.25)", icon: "●" };
}

export function getRankProgress(avgMs) {
  if (avgMs === null) return { percent: 0, next: "BRONZE" };
  const s = avgMs / 1000;
  
  if (s < 1.25) return { percent: 100, next: "MAX_RANK" };
  if (s < 1.8)  return { percent: Math.round(((1.8 - s) / (1.8 - 1.25)) * 100), next: "CHALLENGER" };
  if (s < 2.4)  return { percent: Math.round(((2.4 - s) / (2.4 - 1.8)) * 100), next: "DIAMOND" };
  if (s < 3.0)  return { percent: Math.round(((3.0 - s) / (3.0 - 2.4)) * 100), next: "GOLD" };
  
  // For Bronze, we'll assume a baseline of 4.0s for progress calculation
  const baseline = 4.0;
  const bronzeProgress = Math.max(0, Math.min(100, Math.round(((baseline - s) / (baseline - 3.0)) * 100)));
  return { percent: bronzeProgress, next: "SILVER" };
}

export function getRC(ms) {
  if (!ms) return "#ff3366";
  const s = ms / 1000;
  if (s < 0.5) return "#00ff9d";
  if (s < 0.8) return "#5dffc3";
  if (s < 1.2) return "#fbbf24";
  if (s < 2) return "#ff8c00";
  return "#ff3366";
}
