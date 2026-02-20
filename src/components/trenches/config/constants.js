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

export const MODE_KEYS = ["practice", "1v1", "profile"];
const isModeKey = (value) => MODE_KEYS.includes(value);
export const normalizeModeKey = (value) => (isModeKey(value) ? value : "practice");
export const MODE_ROUTE_MAP = Object.freeze({
  practice: "/play/practice",
  "1v1": "/play/duel",
  profile: "/play/profile",
});
export const modeToPath = (mode) => MODE_ROUTE_MAP[normalizeModeKey(mode)] || MODE_ROUTE_MAP.practice;
export const pathToMode = (pathname = "") => {
  if (pathname.startsWith("/play/duel")) return "1v1";
  if (pathname.startsWith("/play/profile")) return "profile";
  if (pathname.startsWith("/play/practice")) return "practice";
  return "practice";
};

export const EMPTY_PROFILE_STATS = {
  preferred_mode: "practice",
  practice_sessions: 0,
  practice_rounds: 0,
  practice_hits: 0,
  practice_misses: 0,
  practice_penalties: 0,
  practice_best_time: null,
  practice_best_streak: 0,
  duel_matches: 0,
  duel_wins: 0,
  duel_losses: 0,
  duel_draws: 0,
  duel_score_for: 0,
  duel_score_against: 0,
  duel_best_score: 0,
};

export const PROFILE_SELECT =
  "user_id,preferred_mode,practice_sessions,practice_rounds,practice_hits,practice_misses,practice_penalties,practice_best_time,practice_best_streak,duel_matches,duel_wins,duel_losses,duel_draws,duel_score_for,duel_score_against,duel_best_score";

export const HISTORY_SELECT =
  "id,user_id,mode,outcome,score,opponent_score,rounds,accuracy_pct,best_time,best_streak,created_at";

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
  duel_matches: Number(raw?.duel_matches || 0),
  duel_wins: Number(raw?.duel_wins || 0),
  duel_losses: Number(raw?.duel_losses || 0),
  duel_draws: Number(raw?.duel_draws || 0),
  duel_score_for: Number(raw?.duel_score_for || 0),
  duel_score_against: Number(raw?.duel_score_against || 0),
  duel_best_score: Number(raw?.duel_best_score || 0),
});
