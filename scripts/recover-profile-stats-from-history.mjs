#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const BATCH_SIZE = 500;

const PROFILE_SELECT =
  "user_id,preferred_mode,practice_sessions,practice_rounds,practice_hits,practice_misses,practice_penalties,practice_best_time,practice_best_streak,practice_rating,practice_peak_rating,practice_tier,duel_matches,duel_wins,duel_losses,duel_draws,duel_score_for,duel_score_against,duel_best_score,duel_rating,duel_peak_rating,duel_tier";
const PROFILE_SELECT_LEGACY =
  "user_id,preferred_mode,practice_sessions,practice_rounds,practice_hits,practice_misses,practice_penalties,practice_best_time,practice_best_streak,duel_matches,duel_wins,duel_losses,duel_draws,duel_score_for,duel_score_against,duel_best_score";
const HISTORY_SELECT =
  "id,user_id,mode,outcome,score,opponent_score,rounds,best_time,best_streak,rating_after,created_at";
const HISTORY_SELECT_LEGACY =
  "id,user_id,mode,outcome,score,opponent_score,rounds,best_time,best_streak,created_at";
const HISTORY_SELECT_MINIMAL = "id,user_id,mode,outcome,score,opponent_score,created_at";

const EMPTY_PROFILE_STATS = {
  preferred_mode: "practice",
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
  duel_rating: 1000,
  duel_peak_rating: 1000,
  duel_tier: "BRONZE",
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const userArgIdx = args.indexOf("--user");
const targetUser = userArgIdx >= 0 ? args[userArgIdx + 1] : "";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const asNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeProfileStats = (raw = {}) => ({
  ...EMPTY_PROFILE_STATS,
  ...raw,
  preferred_mode: typeof raw?.preferred_mode === "string" && raw.preferred_mode ? raw.preferred_mode : "practice",
  practice_sessions: asNumber(raw?.practice_sessions, 0),
  practice_rounds: asNumber(raw?.practice_rounds, 0),
  practice_hits: asNumber(raw?.practice_hits, 0),
  practice_misses: asNumber(raw?.practice_misses, 0),
  practice_penalties: asNumber(raw?.practice_penalties, 0),
  practice_best_time: raw?.practice_best_time ?? null,
  practice_best_streak: asNumber(raw?.practice_best_streak, 0),
  practice_rating: asNumber(raw?.practice_rating, 0),
  practice_peak_rating: asNumber(raw?.practice_peak_rating, 0),
  practice_tier: typeof raw?.practice_tier === "string" && raw.practice_tier ? raw.practice_tier : "UNRANKED",
  duel_matches: asNumber(raw?.duel_matches, 0),
  duel_wins: asNumber(raw?.duel_wins, 0),
  duel_losses: asNumber(raw?.duel_losses, 0),
  duel_draws: asNumber(raw?.duel_draws, 0),
  duel_score_for: asNumber(raw?.duel_score_for, 0),
  duel_score_against: asNumber(raw?.duel_score_against, 0),
  duel_best_score: asNumber(raw?.duel_best_score, 0),
  duel_rating: Math.max(100, asNumber(raw?.duel_rating, 1000)),
  duel_peak_rating: Math.max(100, asNumber(raw?.duel_peak_rating, 1000)),
  duel_tier: typeof raw?.duel_tier === "string" && raw.duel_tier ? raw.duel_tier : "BRONZE",
});

const hasProfileProgress = (stats = {}) =>
  asNumber(stats.practice_sessions, 0) > 0 ||
  asNumber(stats.practice_rounds, 0) > 0 ||
  asNumber(stats.practice_hits, 0) > 0 ||
  asNumber(stats.duel_matches, 0) > 0 ||
  asNumber(stats.practice_rating, 0) > 0 ||
  asNumber(stats.duel_rating, 1000) > 1000;

const getPracticeTier = (rating) => {
  const value = Math.max(0, Math.round(asNumber(rating, 0)));
  if (value >= 850) return "DIAMOND";
  if (value >= 700) return "PLATINUM";
  if (value >= 550) return "GOLD";
  if (value >= 400) return "SILVER";
  if (value >= 1) return "BRONZE";
  return "UNRANKED";
};

const getDuelTier = (rating) => {
  const value = Math.max(100, Math.round(asNumber(rating, 1000)));
  if (value >= 1500) return "DIAMOND";
  if (value >= 1300) return "PLATINUM";
  if (value >= 1100) return "GOLD";
  if (value >= 900) return "SILVER";
  return "BRONZE";
};

const isMissingColumnError = (error = {}) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42703" ||
    (message.includes("column") && (message.includes("does not exist") || message.includes("schema cache")))
  );
};

const stripRankFields = (payload = {}) => {
  const next = { ...payload };
  delete next.practice_rating;
  delete next.practice_peak_rating;
  delete next.practice_tier;
  delete next.duel_rating;
  delete next.duel_peak_rating;
  delete next.duel_tier;
  return next;
};

const deriveStatsFromHistory = (rows = [], seedStats = EMPTY_PROFILE_STATS) => {
  const historyRows = Array.isArray(rows) ? rows : [];
  const base = normalizeProfileStats(seedStats);
  if (historyRows.length === 0) return base;

  let practiceSessions = 0;
  let practiceRounds = 0;
  let practiceHits = 0;
  let practiceMisses = 0;
  let practiceBestTime = base.practice_best_time;
  let practiceBestStreak = base.practice_best_streak;
  let practiceRating = base.practice_rating;
  let practicePeakRating = Math.max(base.practice_peak_rating, practiceRating);
  let sawPracticeRating = false;

  let duelMatches = 0;
  let duelWins = 0;
  let duelLosses = 0;
  let duelDraws = 0;
  let duelScoreFor = 0;
  let duelScoreAgainst = 0;
  let duelBestScore = base.duel_best_score;
  let duelRating = base.duel_rating;
  let duelPeakRating = Math.max(base.duel_peak_rating, duelRating);
  let sawDuelRating = false;

  historyRows.forEach((row) => {
    if (row?.mode === "practice") {
      practiceSessions += 1;
      const rounds = Math.max(0, Math.round(asNumber(row?.rounds, 0)));
      const hits = Math.max(0, Math.round(asNumber(row?.score, 0)));
      practiceRounds += rounds;
      practiceHits += hits;
      practiceMisses += Math.max(0, rounds - hits);

      const bestTime = asNumber(row?.best_time, NaN);
      if (Number.isFinite(bestTime) && bestTime > 0) {
        practiceBestTime = practiceBestTime === null ? bestTime : Math.min(practiceBestTime, bestTime);
      }

      practiceBestStreak = Math.max(practiceBestStreak, Math.max(0, Math.round(asNumber(row?.best_streak, 0))));
      const ratingAfter = asNumber(row?.rating_after, NaN);
      if (Number.isFinite(ratingAfter)) {
        if (!sawPracticeRating) {
          practiceRating = Math.max(0, Math.round(ratingAfter));
          sawPracticeRating = true;
        }
        practicePeakRating = Math.max(practicePeakRating, Math.round(ratingAfter));
      }
      return;
    }

    if (row?.mode === "1v1") {
      duelMatches += 1;
      if (row?.outcome === "win") duelWins += 1;
      else if (row?.outcome === "loss") duelLosses += 1;
      else duelDraws += 1;

      const myScore = Math.max(0, Math.round(asNumber(row?.score, 0)));
      const oppScore = Math.max(0, Math.round(asNumber(row?.opponent_score, 0)));
      duelScoreFor += myScore;
      duelScoreAgainst += oppScore;
      duelBestScore = Math.max(duelBestScore, myScore);

      const ratingAfter = asNumber(row?.rating_after, NaN);
      if (Number.isFinite(ratingAfter)) {
        if (!sawDuelRating) {
          duelRating = Math.max(100, Math.round(ratingAfter));
          sawDuelRating = true;
        }
        duelPeakRating = Math.max(duelPeakRating, Math.round(ratingAfter));
      }
    }
  });

  return normalizeProfileStats({
    ...base,
    practice_sessions: practiceSessions,
    practice_rounds: practiceRounds,
    practice_hits: practiceHits,
    practice_misses: practiceMisses,
    practice_penalties: 0,
    practice_best_time: practiceBestTime,
    practice_best_streak: practiceBestStreak,
    practice_rating: practiceRating,
    practice_peak_rating: Math.max(practicePeakRating, practiceRating),
    practice_tier: getPracticeTier(practiceRating),
    duel_matches: duelMatches,
    duel_wins: duelWins,
    duel_losses: duelLosses,
    duel_draws: duelDraws,
    duel_score_for: duelScoreFor,
    duel_score_against: duelScoreAgainst,
    duel_best_score: duelBestScore,
    duel_rating: duelRating,
    duel_peak_rating: Math.max(duelPeakRating, duelRating),
    duel_tier: getDuelTier(duelRating),
  });
};

const fetchProfilesPage = async (from, to) => {
  let res = await supabase.from("player_profiles").select(PROFILE_SELECT).order("user_id", { ascending: true }).range(from, to);
  if (res.error && isMissingColumnError(res.error)) {
    res = await supabase.from("player_profiles").select(PROFILE_SELECT_LEGACY).order("user_id", { ascending: true }).range(from, to);
  }
  return res;
};

const fetchSingleProfile = async (userId) => {
  let res = await supabase.from("player_profiles").select(PROFILE_SELECT).eq("user_id", userId).maybeSingle();
  if (res.error && isMissingColumnError(res.error)) {
    res = await supabase.from("player_profiles").select(PROFILE_SELECT_LEGACY).eq("user_id", userId).maybeSingle();
  }
  return res;
};

const fetchHistory = async (userId) => {
  let res = await supabase
    .from("player_match_history")
    .select(HISTORY_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (res.error && isMissingColumnError(res.error)) {
    res = await supabase
      .from("player_match_history")
      .select(HISTORY_SELECT_LEGACY)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
  }
  if (res.error && isMissingColumnError(res.error)) {
    res = await supabase
      .from("player_match_history")
      .select(HISTORY_SELECT_MINIMAL)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
  }
  return res;
};

const upsertProfile = async (userId, stats) => {
  const payload = { user_id: userId, ...normalizeProfileStats(stats) };
  let res = await supabase.from("player_profiles").upsert(payload, { onConflict: "user_id" });
  if (res.error && isMissingColumnError(res.error)) {
    const legacyPayload = stripRankFields(payload);
    res = await supabase.from("player_profiles").upsert(legacyPayload, { onConflict: "user_id" });
  }
  return res;
};

const shouldRecoverRow = (row, hasHistory) => {
  if (!hasHistory) return false;
  const normalized = normalizeProfileStats(row || {});
  return !hasProfileProgress(normalized);
};

const getTargetProfiles = async () => {
  if (targetUser) {
    const { data, error } = await fetchSingleProfile(targetUser);
    if (error) throw error;
    return [{ user_id: targetUser, ...(data || {}) }];
  }

  let from = 0;
  let to = BATCH_SIZE - 1;
  const allProfiles = [];
  while (true) {
    const { data, error } = await fetchProfilesPage(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allProfiles.push(...data);
    if (data.length < BATCH_SIZE) break;
    from += BATCH_SIZE;
    to += BATCH_SIZE;
  }
  return allProfiles;
};

const main = async () => {
  const profiles = await getTargetProfiles();
  if (profiles.length === 0) {
    console.log("No profiles found.");
    return;
  }

  let recoveredCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const profile of profiles) {
    const userId = profile?.user_id;
    if (!userId) {
      skippedCount += 1;
      continue;
    }

    const { data: historyRows, error: historyError } = await fetchHistory(userId);
    if (historyError) {
      failedCount += 1;
      console.error(`History fetch failed for ${userId}: ${historyError.message || historyError.code || historyError}`);
      continue;
    }

    const rows = Array.isArray(historyRows) ? historyRows : [];
    if (!shouldRecoverRow(profile, rows.length > 0)) {
      skippedCount += 1;
      continue;
    }

    const derived = deriveStatsFromHistory(rows, profile);
    if (!hasProfileProgress(derived)) {
      skippedCount += 1;
      continue;
    }

    if (dryRun) {
      recoveredCount += 1;
      console.log(`[dry-run] would recover ${userId}: practice_sessions=${derived.practice_sessions}, duel_matches=${derived.duel_matches}, practice_rating=${derived.practice_rating}, duel_rating=${derived.duel_rating}`);
      continue;
    }

    const { error: writeError } = await upsertProfile(userId, derived);
    if (writeError) {
      failedCount += 1;
      console.error(`Recovery upsert failed for ${userId}: ${writeError.message || writeError.code || writeError}`);
      continue;
    }

    recoveredCount += 1;
    console.log(`Recovered ${userId}: practice_sessions=${derived.practice_sessions}, duel_matches=${derived.duel_matches}`);
  }

  console.log(
    `Done. recovered=${recoveredCount} skipped=${skippedCount} failed=${failedCount} mode=${dryRun ? "dry-run" : "write"}${targetUser ? ` user=${targetUser}` : ""}`,
  );
};

main().catch((error) => {
  console.error("Recovery script failed:", error?.message || error);
  process.exit(1);
});
