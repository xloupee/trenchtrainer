const PRACTICE_BASE_RATING = 0;

const PRACTICE_TIERS = [
  { tier: "DIAMOND", min: 850, color: "#63b3ed", icon: "◆" },
  { tier: "PLATINUM", min: 700, color: "#5dffc3", icon: "⬢" },
  { tier: "GOLD", min: 550, color: "#ecc94b", icon: "★" },
  { tier: "SILVER", min: 400, color: "#a0aec0", icon: "☆" },
  { tier: "BRONZE", min: 1, color: "#c77c48", icon: "●" },
  { tier: "UNRANKED", min: 0, color: "#4a5568", icon: "—" },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const getPracticeTier = (rating) => {
  const normalized = Math.max(0, Math.round(Number(rating) || PRACTICE_BASE_RATING));
  return PRACTICE_TIERS.find((row) => normalized >= row.min) || PRACTICE_TIERS[PRACTICE_TIERS.length - 1];
};

export const getPracticeNextTier = (rating) => {
  const normalized = Math.max(0, Math.round(Number(rating) || PRACTICE_BASE_RATING));
  for (let i = PRACTICE_TIERS.length - 1; i >= 1; i -= 1) {
    const current = PRACTICE_TIERS[i];
    const next = PRACTICE_TIERS[i - 1];
    if (normalized >= current.min && normalized < next.min) {
      const span = Math.max(1, next.min - current.min);
      const progressPercent = Math.max(0, Math.min(100, ((normalized - current.min) / span) * 100));
      return {
        current,
        next,
        pointsToNext: next.min - normalized,
        progressPercent,
        currentMin: current.min,
        nextMin: next.min,
      };
    }
  }
  const top = PRACTICE_TIERS[0];
  return { current: top, next: null, pointsToNext: 0, progressPercent: 100, currentMin: top.min, nextMin: top.min };
};

export const computePracticeSessionScore = ({ avgRtMs, accuracyPct, bestRtMs, hits = 0, rounds = 0 }) => {
  const avg = Number(avgRtMs) > 0 ? Number(avgRtMs) : 3000;
  const acc = clamp(Number(accuracyPct) || 0, 0, 100);
  const best = Number(bestRtMs) > 0 ? Number(bestRtMs) : avg;
  const hitCount = Math.max(0, Number(hits) || 0);
  const roundCount = Math.max(1, Number(rounds) || 1);
  const hitVolumeScore = clamp(hitCount * 85, 0, 1300);
  const speedScore = clamp(1400 - avg, 0, 1000);
  const accuracyScore = clamp(acc * 8, 0, 800);
  const consistencyBase = 100 - (avg - best) / 10;
  const consistencyBonus = clamp(consistencyBase * 2, 0, 200);
  const roundCompletionBonus = clamp((hitCount / roundCount) * 180, 0, 180);
  return Math.round(
    0.62 * hitVolumeScore +
    0.18 * speedScore +
    0.1 * accuracyScore +
    0.06 * consistencyBonus +
    0.04 * roundCompletionBonus,
  );
};

export const computePracticeRating = ({ currentRating, sessionScore }) => {
  const current = Math.max(0, Math.round(Number(currentRating) || PRACTICE_BASE_RATING));
  const score = Math.max(0, Math.round(Number(sessionScore) || 0));
  if (current <= 0) return score;
  return Math.round(current * 0.85 + score * 0.15);
};

export { PRACTICE_BASE_RATING };
export { PRACTICE_TIERS };
