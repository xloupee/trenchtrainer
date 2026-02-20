export const CFG = { antiSpamMin: 150, antiSpamMax: 300, holsterArm: 800 };

export const getMult = (s) => (s >= 13 ? 3 : s >= 8 ? 2 : s >= 4 ? 1.5 : 1);
export const getMultLabel = (s) => (s >= 13 ? "x3" : s >= 8 ? "x2" : s >= 4 ? "x1.5" : "x1");
export const getMultTier = (s) => (s >= 13 ? 3 : s >= 8 ? 2 : s >= 4 ? 1 : 0);

export const C = {
  bg: "#060911",
  bgAlt: "#0c1120",
  bgCard: "#111827",
  bgElevated: "#1a2234",
  border: "#1e2d47",
  borderLight: "#2a3f5f",
  green: "#4ade80",
  greenBright: "#86efac",
  greenDim: "#166534",
  orange: "#fb923c",
  orangeBright: "#fdba74",
  red: "#f87171",
  yellow: "#fbbf24",
  cyan: "#22d3ee",
  blue: "#60a5fa",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  textDim: "#475569",
  textGhost: "#1e293b",
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
