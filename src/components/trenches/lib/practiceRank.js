const PRACTICE_BASE_RATING = 0;

const PRACTICE_TIERS = [
  { tier: "CHALLENGER", min: 1000, color: "#ff3366", icon: "♛" },
  { tier: "DIAMOND", min: 850, color: "#63b3ed", icon: "◆" },
  { tier: "PLATINUM", min: 700, color: "#5dffc3", icon: "⬢" },
  { tier: "GOLD", min: 550, color: "#ecc94b", icon: "★" },
  { tier: "SILVER", min: 400, color: "#a0aec0", icon: "☆" },
  { tier: "BRONZE", min: 1, color: "#c77c48", icon: "●" },
  { tier: "UNRANKED", min: 0, color: "#4a5568", icon: "—" },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const PRACTICE_BANDS = [
  { key: "UNDER", min: 0 },
  { key: "BRONZE", min: 220 },
  { key: "SILVER", min: 380 },
  { key: "GOLD", min: 560 },
  { key: "PLAT", min: 760 },
  { key: "CHALLENGER", min: 930 },
];

const BAND_INDEX = Object.freeze({
  UNDER: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLAT: 4,
  CHALLENGER: 5,
});

const BASE_DELTA_BY_BAND = Object.freeze({
  UNDER: -12,
  BRONZE: 6,
  SILVER: 12,
  GOLD: 20,
  PLAT: 28,
  CHALLENGER: 37,
});

const PRACTICE_DIFFICULTY_MULTIPLIERS = Object.freeze({
  1: 0.5,
  3: 0.9,
  5: 1.15,
  7: 1.4,
  10: 1.7,
});

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

export const computePracticeSessionScore = ({ avgRtMs, accuracyPct, bestRtMs, hits = 0, rounds = 0, misses = 0, penalties = 0 }) => {
  const avg = Number(avgRtMs) > 0 ? Number(avgRtMs) : 3000;
  const acc = clamp(Number(accuracyPct) || 0, 0, 100);
  const best = Number(bestRtMs) > 0 ? Number(bestRtMs) : avg;
  const hitCount = Math.max(0, Number(hits) || 0);
  const roundCount = Math.max(1, Number(rounds) || 1);
  const missCount = Math.max(0, Number(misses) || 0);
  const penaltyCount = Math.max(0, Number(penalties) || 0);

  const totalFailures = missCount + penaltyCount;
  const netRatio = clamp((hitCount - totalFailures + roundCount) / (2 * roundCount), 0, 1);
  const completionRate = clamp(hitCount / roundCount, 0, 1);
  const consistencyRatio = clamp(1 - (avg - best) / Math.max(avg, 1), 0, 1);

  const accuracyScore = (acc / 100) * 380;
  const netExecutionScore = netRatio * 320;
  const speedScore = clamp(((2600 - avg) / 1600) * 220, 0, 220);
  const consistencyBonus = consistencyRatio * 80;
  const roundCompletionBonus = clamp((completionRate * (acc / 100)) * 50, 0, 50);

  return Math.round(accuracyScore + netExecutionScore + speedScore + consistencyBonus + roundCompletionBonus);
};

export const computePracticeSessionScoreBreakdown = ({ avgRtMs, accuracyPct, bestRtMs, hits = 0, rounds = 0, misses = 0, penalties = 0 }) => {
  const avg = Number(avgRtMs) > 0 ? Number(avgRtMs) : 3000;
  const acc = clamp(Number(accuracyPct) || 0, 0, 100);
  const best = Number(bestRtMs) > 0 ? Number(bestRtMs) : avg;
  const hitCount = Math.max(0, Number(hits) || 0);
  const roundCount = Math.max(1, Number(rounds) || 1);
  const missCount = Math.max(0, Number(misses) || 0);
  const penaltyCount = Math.max(0, Number(penalties) || 0);
  const totalFailures = missCount + penaltyCount;

  const completionRate = clamp(hitCount / roundCount, 0, 1);
  const netRatio = clamp((hitCount - totalFailures + roundCount) / (2 * roundCount), 0, 1);
  const consistencyRatio = clamp(1 - (avg - best) / Math.max(avg, 1), 0, 1);

  const accuracyScore = Math.round((acc / 100) * 380);
  const netExecutionScore = Math.round(netRatio * 320);
  const speedScore = Math.round(clamp(((2600 - avg) / 1600) * 220, 0, 220));
  const consistencyBonus = Math.round(consistencyRatio * 80);
  const roundCompletionBonus = Math.round(clamp((completionRate * (acc / 100)) * 50, 0, 50));
  const total = accuracyScore + netExecutionScore + speedScore + consistencyBonus + roundCompletionBonus;

  return {
    accuracyScore,
    netExecutionScore,
    speedScore,
    consistencyBonus,
    roundCompletionBonus,
    total: Math.round(total),
  };
};

export const getPracticePerformanceBand = (sessionScore) => {
  const normalized = Math.max(0, Math.round(Number(sessionScore) || 0));
  for (let i = PRACTICE_BANDS.length - 1; i >= 0; i -= 1) {
    const band = PRACTICE_BANDS[i];
    if (normalized >= band.min) return band.key;
  }
  return "UNDER";
};

export const getExpectedBandFromRating = (rating) => {
  const tier = getPracticeTier(rating).tier;
  if (tier === "CHALLENGER") return "CHALLENGER";
  if (tier === "DIAMOND") return "PLAT";
  if (tier === "PLATINUM") return "PLAT";
  if (tier === "GOLD") return "GOLD";
  if (tier === "SILVER") return "SILVER";
  if (tier === "BRONZE") return "BRONZE";
  return "UNDER";
};

const getSpeedBand = (avgRtMs) => {
  const avg = Number(avgRtMs);
  if (!Number.isFinite(avg) || avg <= 0) return "UNDER";
  if (avg < 1250) return "CHALLENGER";
  if (avg < 1600) return "PLAT";
  if (avg < 2100) return "GOLD";
  if (avg < 2750) return "SILVER";
  if (avg < 3500) return "BRONZE";
  return "UNDER";
};

export const computePracticeRating = ({
  currentRating,
  sessionScore,
  avgRtMs = null,
  hits = 0,
  misses = 0,
  penalties = 0,
  accuracyPct = 0,
}) => {
  const current = Math.max(0, Math.round(Number(currentRating) || PRACTICE_BASE_RATING));
  const scoreBand = getPracticePerformanceBand(sessionScore);
  const speedBand = getSpeedBand(avgRtMs);
  const blendedBandIndex = Math.round(BAND_INDEX[scoreBand] * 0.7 + BAND_INDEX[speedBand] * 0.3);
  const band = PRACTICE_BANDS[clamp(blendedBandIndex, 0, PRACTICE_BANDS.length - 1)].key;
  const expectedBand = getExpectedBandFromRating(current);
  const totalMisses = Math.max(0, Math.round(Number(misses) || 0)) + Math.max(0, Math.round(Number(penalties) || 0));
  const safeHits = Math.max(0, Math.round(Number(hits) || 0));
  const safeAccuracy = clamp(Number(accuracyPct) || 0, 0, 100);

  const gap = BAND_INDEX[band] - BAND_INDEX[expectedBand];
  let delta = (BASE_DELTA_BY_BAND[band] || 0) + gap * 5;
  delta -= Math.min(10, totalMisses * 2);
  if (safeAccuracy > 80) delta += Math.max(0, Math.floor((safeAccuracy - 80) / 5));
  if (safeAccuracy < 60) delta -= Math.max(0, Math.floor((60 - safeAccuracy) / 10));
  if (safeHits >= 8) delta += 2;

  const currentTier = getPracticeTier(current).tier;
  if ((currentTier === "UNRANKED" || currentTier === "BRONZE") && band === "CHALLENGER") delta += 10;
  if ((currentTier === "UNRANKED" || currentTier === "BRONZE") && band === "PLAT") delta += 6;

  delta = clamp(Math.round(delta), -35, 55);
  const nextRating = Math.max(0, current + delta);

  return {
    nextRating,
    delta,
    band,
    expectedBand,
  };
};

const BAND_TO_TIER = Object.freeze({
  UNDER: "BRONZE",
  BRONZE: "BRONZE",
  SILVER: "SILVER",
  GOLD: "GOLD",
  PLAT: "PLATINUM",
  CHALLENGER: "CHALLENGER",
});

export const getPracticeSessionTier = ({ avgRtMs = null, accuracyPct = 0, bestRtMs = null, hits = 0, rounds = 0, misses = 0, penalties = 0 }) => {
  const sessionScore = computePracticeSessionScore({
    avgRtMs,
    accuracyPct,
    bestRtMs,
    hits,
    rounds,
    misses,
    penalties,
  });
  const band = getPracticePerformanceBand(sessionScore);
  const tierName = BAND_TO_TIER[band] || "BRONZE";
  const tier = PRACTICE_TIERS.find((row) => row.tier === tierName) || PRACTICE_TIERS[PRACTICE_TIERS.length - 2];
  return {
    ...tier,
    band,
    sessionScore,
  };
};

export const getPracticeDifficultyMultiplier = (level) => {
  const normalized = Math.round(Number(level) || 1);
  return PRACTICE_DIFFICULTY_MULTIPLIERS[normalized] || 1;
};

export { PRACTICE_BASE_RATING };
export { PRACTICE_TIERS };
