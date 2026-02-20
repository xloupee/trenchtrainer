export function getRank(avgMs) {
  if (avgMs === null) return { tier: "UNRANKED", color: "#4a5568", glow: "none", icon: "—" };
  const s = avgMs / 1000;
  if (s < 1.25) return { tier: "CHALLENGER", color: "#f56565", glow: "0 0 18px rgba(245,101,101,0.35)", icon: "♛" };
  if (s < 1.8) return { tier: "DIAMOND", color: "#63b3ed", glow: "0 0 16px rgba(99,179,237,0.3)", icon: "◆" };
  if (s < 2.4) return { tier: "GOLD", color: "#ecc94b", glow: "0 0 14px rgba(236,201,75,0.3)", icon: "★" };
  if (s < 3) return { tier: "SILVER", color: "#a0aec0", glow: "0 0 10px rgba(160,174,192,0.2)", icon: "☆" };
  return { tier: "BRONZE", color: "#c77c48", glow: "0 0 10px rgba(199,124,72,0.25)", icon: "●" };
}

export function getRC(ms) {
  if (!ms) return "#f56565";
  const s = ms / 1000;
  if (s < 0.5) return "#48bb78";
  if (s < 0.8) return "#68d391";
  if (s < 1.2) return "#ecc94b";
  if (s < 2) return "#ed8936";
  return "#f56565";
}
