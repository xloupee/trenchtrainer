const MIN_DUEL_RATING = 100;
const DUEL_BASE_RATING = 1000;

const DUEL_TIERS = [
  { tier: "DIAMOND", min: 1500, color: "#63b3ed", icon: "◆" },
  { tier: "PLATINUM", min: 1300, color: "#5dffc3", icon: "⬢" },
  { tier: "GOLD", min: 1100, color: "#ecc94b", icon: "★" },
  { tier: "SILVER", min: 900, color: "#a0aec0", icon: "☆" },
  { tier: "BRONZE", min: 0, color: "#c77c48", icon: "●" },
];

const clampRating = (value) => Math.max(MIN_DUEL_RATING, Math.round(Number(value) || DUEL_BASE_RATING));

export const getDuelTier = (rating) => {
  const normalized = clampRating(rating);
  return DUEL_TIERS.find((row) => normalized >= row.min) || DUEL_TIERS[DUEL_TIERS.length - 1];
};

export const getDuelNextTier = (rating) => {
  const normalized = clampRating(rating);
  for (let i = DUEL_TIERS.length - 1; i >= 1; i -= 1) {
    const current = DUEL_TIERS[i];
    const next = DUEL_TIERS[i - 1];
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
  const top = DUEL_TIERS[0];
  return { current: top, next: null, pointsToNext: 0, progressPercent: 100, currentMin: top.min, nextMin: top.min };
};

export const getDuelKFactor = (matchesPlayed = 0) => (Number(matchesPlayed) < 30 ? 32 : 20);

export const getExpectedScore = (playerRating, opponentRating) => {
  const p = clampRating(playerRating);
  const o = clampRating(opponentRating);
  return 1 / (1 + 10 ** ((o - p) / 400));
};

const scoreFromOutcome = (outcome) => {
  if (outcome === "win") return 1;
  if (outcome === "loss") return 0;
  return 0.5;
};

export const computeDuelRating = ({ currentRating, opponentRating, outcome, matchesPlayed }) => {
  const current = clampRating(currentRating);
  const opponent = clampRating(opponentRating);
  const expected = getExpectedScore(current, opponent);
  const score = scoreFromOutcome(outcome);
  const k = getDuelKFactor(matchesPlayed);
  const nextRating = clampRating(current + k * (score - expected));
  return {
    currentRating: current,
    nextRating,
    delta: nextRating - current,
    expected,
    k,
  };
};

export { DUEL_BASE_RATING };
export { DUEL_TIERS };
