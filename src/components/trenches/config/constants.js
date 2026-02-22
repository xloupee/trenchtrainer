export const CFG = { antiSpamMin: 150, antiSpamMax: 300, holsterArm: 800 };

export const getMult = (s) => (s >= 13 ? 3 : s >= 8 ? 2 : s >= 4 ? 1.5 : 1);
export const getMultLabel = (s) => (s >= 13 ? "x3" : s >= 8 ? "x2" : s >= 4 ? "x1.5" : "x1");
export const getMultTier = (s) => (s >= 13 ? 3 : s >= 8 ? 2 : s >= 4 ? 1 : 0);

export const C = {
  bg: "#050505",
  bgAlt: "#0a0a0a",
  bgCard: "#0d0d0d",
  bgElevated: "#111111",
  border: "#222222",
  borderLight: "#333333",
  green: "#00ff9d",
  greenBright: "#5dffc3",
  greenDim: "#004d30",
  orange: "#ff8c00",
  orangeBright: "#ffae42",
  red: "#ff3366",
  yellow: "#fbbf24",
  cyan: "#00ccff",
  blue: "#3399ff",
  text: "#eaeaea",
  textMuted: "#888888",
  textDim: "#444444",
  textGhost: "#222222",
};

export const MODE_KEYS = ["solo", "1v1", "wager", "profile"];
const isModeKey = (value) => MODE_KEYS.includes(value);
export const normalizeModeKey = (value) => {
  if (value === "practice") return "solo";
  return isModeKey(value) ? value : "solo";
};
export const MODE_ROUTE_MAP = Object.freeze({
  solo: "/play/solo",
  "1v1": "/play/duel",
  wager: "/play/wager",
  profile: "/play/profile",
});
export const modeToPath = (mode) => MODE_ROUTE_MAP[normalizeModeKey(mode)] || MODE_ROUTE_MAP.solo;
export const pathToMode = (pathname = "") => {
  if (pathname.startsWith("/play/duel")) return "1v1";
  if (pathname.startsWith("/play/wager")) return "wager";
  if (pathname.startsWith("/play/profile")) return "profile";
  if (pathname.startsWith("/play/solo")) return "solo";
  if (pathname.startsWith("/play/practice")) return "solo";
  return "solo";
};

export const EMPTY_PROFILE_STATS = {
  preferred_mode: "solo",
  practice_sessions: 0,
  practice_rounds: 0,
  practice_hits: 0,
  practice_misses: 0,
  practice_penalties: 0,
  practice_best_time: null,
  practice_best_streak: 0,
  practice_rating: 0,
  practice_peak_rating: 0,
  practice_tier: "UNRANKED",
  duel_matches: 0,
  duel_wins: 0,
  duel_losses: 0,
  duel_draws: 0,
  duel_score_for: 0,
  duel_score_against: 0,
  duel_best_score: 0,
  duel_rating: 0,
  duel_peak_rating: 0,
  duel_tier: "UNRANKED",
};

export const PROFILE_SELECT =
  "user_id,preferred_mode,practice_sessions,practice_rounds,practice_hits,practice_misses,practice_penalties,practice_best_time,practice_best_streak,practice_rating,practice_peak_rating,practice_tier,duel_matches,duel_wins,duel_losses,duel_draws,duel_score_for,duel_score_against,duel_best_score,duel_rating,duel_peak_rating,duel_tier";

export const PROFILE_SELECT_LEGACY =
  "user_id,preferred_mode,practice_sessions,practice_rounds,practice_hits,practice_misses,practice_penalties,practice_best_time,practice_best_streak,duel_matches,duel_wins,duel_losses,duel_draws,duel_score_for,duel_score_against,duel_best_score";

export const HISTORY_SELECT =
  "id,user_id,mode,outcome,score,opponent_score,rounds,accuracy_pct,best_time,best_streak,rating_before,rating_after,rating_delta,created_at";

export const HISTORY_SELECT_LEGACY =
  "id,user_id,mode,outcome,score,opponent_score,rounds,accuracy_pct,best_time,best_streak,created_at";

export const HISTORY_SELECT_MINIMAL =
  "id,user_id,mode,outcome,score,opponent_score,created_at";

export const normalizeProfileStats = (raw = {}) => ({
  ...EMPTY_PROFILE_STATS,
  ...raw,
  preferred_mode: normalizeModeKey(raw?.preferred_mode),
  practice_sessions: Number(raw?.practice_sessions || 0),
  practice_rounds: Number(raw?.practice_rounds || 0),
  practice_hits: Number(raw?.practice_hits || 0),
  practice_misses: Number(raw?.practice_misses || 0),
  practice_penalties: Number(raw?.practice_penalties || 0),
  practice_best_time: raw?.practice_best_time ?? null,
  practice_best_streak: Number(raw?.practice_best_streak || 0),
  practice_rating: Number(raw?.practice_rating || 0),
  practice_peak_rating: Number(raw?.practice_peak_rating || 0),
  practice_tier: typeof raw?.practice_tier === "string" ? raw.practice_tier : "UNRANKED",
  duel_matches: Number(raw?.duel_matches || 0),
  duel_wins: Number(raw?.duel_wins || 0),
  duel_losses: Number(raw?.duel_losses || 0),
  duel_draws: Number(raw?.duel_draws || 0),
  duel_score_for: Number(raw?.duel_score_for || 0),
  duel_score_against: Number(raw?.duel_score_against || 0),
  duel_best_score: Number(raw?.duel_best_score || 0),
  duel_rating: Number(raw?.duel_rating || 0),
  duel_peak_rating: Number(raw?.duel_peak_rating || 0),
  duel_tier: typeof raw?.duel_tier === "string" ? raw.duel_tier : "UNRANKED",
});
