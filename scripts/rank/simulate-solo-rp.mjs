#!/usr/bin/env node
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { once } from "node:events";
import {
  computePracticeRating,
  getPracticeDifficultyMultiplier,
  getPracticeTier,
} from "../../src/components/trenches/lib/practiceRank.js";

const SCORE_BAND_CASES = Object.freeze([
  { band: "UNDER", sessionScore: 100 },
  { band: "BRONZE", sessionScore: 300 },
  { band: "SILVER", sessionScore: 470 },
  { band: "GOLD", sessionScore: 650 },
  { band: "PLAT", sessionScore: 830 },
  { band: "CHALLENGER", sessionScore: 980 },
]);

const SPEED_BAND_CASES = Object.freeze([
  { band: "CHALLENGER", avgRtMs: 1100 },
  { band: "PLAT", avgRtMs: 1400 },
  { band: "GOLD", avgRtMs: 1800 },
  { band: "SILVER", avgRtMs: 2400 },
  { band: "BRONZE", avgRtMs: 3200 },
  { band: "UNDER", avgRtMs: 3800 },
]);

const TOTAL_MISS_BUCKETS = Object.freeze([0, 1, 2, 3, 4, 5]);
const ACCURACY_CASES = Object.freeze([0, 10, 20, 30, 40, 50, 60, 80, 81, 85, 90, 95, 100]);
const HITS_CASES = Object.freeze([3, 8]);
const DIFFICULTY_LEVELS = Object.freeze([1, 3, 5, 7, 10]);

const FINAL_DELTA_MIN = -35;
const FINAL_DELTA_MAX = 55;
const DELTA_BUCKET_OFFSET = 35;
const DELTA_BUCKET_COUNT = FINAL_DELTA_MAX - FINAL_DELTA_MIN + 1;

const TIER_ORDER = Object.freeze({
  UNRANKED: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
  DIAMOND: 5,
  CHALLENGER: 6,
});

const RAW_ROWS_PER_RATING =
  SCORE_BAND_CASES.length *
  SPEED_BAND_CASES.length *
  TOTAL_MISS_BUCKETS.length *
  ACCURACY_CASES.length *
  HITS_CASES.length *
  DIFFICULTY_LEVELS.length;

function parseArgs(argv) {
  const opts = {
    minRating: 0,
    maxRating: 1200,
    step: 1,
    outDir: "out/rank-sim/solo",
    raw: false,
    pretty: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--raw") {
      opts.raw = true;
      continue;
    }
    if (arg === "--pretty") {
      opts.pretty = true;
      continue;
    }
    if (arg === "--min-rating") {
      i += 1;
      opts.minRating = parseIntStrict(argv[i], "--min-rating");
      continue;
    }
    if (arg === "--max-rating") {
      i += 1;
      opts.maxRating = parseIntStrict(argv[i], "--max-rating");
      continue;
    }
    if (arg === "--step") {
      i += 1;
      opts.step = parseIntStrict(argv[i], "--step");
      continue;
    }
    if (arg === "--out-dir") {
      i += 1;
      if (!argv[i]) throw new Error("Missing value for --out-dir");
      opts.outDir = argv[i];
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (opts.step < 1) throw new Error("--step must be >= 1");
  if (opts.minRating < 0) throw new Error("--min-rating must be >= 0");
  if (opts.maxRating < opts.minRating) throw new Error("--max-rating must be >= --min-rating");

  return opts;
}

function parseIntStrict(value, name) {
  if (value === undefined) throw new Error(`Missing value for ${name}`);
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid integer for ${name}: ${value}`);
  return parsed;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function csvEscape(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  if (!/[",\n]/.test(raw)) return raw;
  return `"${raw.replaceAll('"', '""')}"`;
}

async function writeCsv(filePath, header, rows) {
  const lines = [header.join(","), ...rows.map((row) => row.map(csvEscape).join(","))];
  await fsp.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
}

function getRatingStat(map, rating, tier, difficultyLevel) {
  const key = `${rating}:${difficultyLevel}`;
  if (!map.has(key)) {
    map.set(key, {
      rating,
      tier,
      difficultyLevel,
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      pos: 0,
      neg: 0,
      zero: 0,
      worstSignature: "",
      bestSignature: "",
    });
  }
  return map.get(key);
}

function getTierStat(map, tier, difficultyLevel) {
  const key = `${tier}:${difficultyLevel}`;
  if (!map.has(key)) {
    map.set(key, {
      tier,
      difficultyLevel,
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      hist: Array.from({ length: DELTA_BUCKET_COUNT }, () => 0),
    });
  }
  return map.get(key);
}

function percentileFromHist(hist, count, pct) {
  if (!count) return 0;
  const rank = Math.max(1, Math.ceil((pct / 100) * count));
  let seen = 0;
  for (let i = 0; i < hist.length; i += 1) {
    seen += hist[i];
    if (seen >= rank) return i - DELTA_BUCKET_OFFSET;
  }
  return FINAL_DELTA_MAX;
}

function buildCaseSignature({
  scoreBand,
  speedBand,
  totalMisses,
  accuracy,
  hits,
  baseDelta,
  finalDelta,
}) {
  return `score=${scoreBand}|speed=${speedBand}|miss=${totalMisses}|acc=${accuracy}|hits=${hits}|base=${baseDelta}|final=${finalDelta}`;
}

async function writeRawHeader(stream) {
  const header = [
    "current_rating",
    "current_tier",
    "score_band_target",
    "speed_band_target",
    "session_score_input",
    "avg_rt_ms_input",
    "hits_input",
    "misses_input",
    "penalties_input",
    "accuracy_input",
    "difficulty_level",
    "difficulty_multiplier",
    "base_delta",
    "final_delta",
    "next_rating",
    "next_tier",
    "expected_band",
    "computed_band",
  ];
  if (!stream.write(`${header.join(",")}\n`)) {
    await once(stream, "drain");
  }
}

async function writeRawRow(stream, row) {
  const line = row.map(csvEscape).join(",");
  if (!stream.write(`${line}\n`)) {
    await once(stream, "drain");
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(process.cwd(), opts.outDir);
  await fsp.mkdir(outDir, { recursive: true });

  const ratingStats = new Map();
  const tierStats = new Map();
  const difficultyExtremes = new Map();

  let rawStream = null;
  if (opts.raw) {
    const rawPath = path.join(outDir, "solo-raw-combos.csv");
    rawStream = fs.createWriteStream(rawPath, { encoding: "utf8" });
    await writeRawHeader(rawStream);
  }

  let totalEvaluatedRows = 0;
  let totalBaseEvaluations = 0;

  for (let rating = opts.minRating; rating <= opts.maxRating; rating += opts.step) {
    const currentTier = getPracticeTier(rating).tier;

    for (const scoreCase of SCORE_BAND_CASES) {
      for (const speedCase of SPEED_BAND_CASES) {
        for (const totalMisses of TOTAL_MISS_BUCKETS) {
          for (const accuracy of ACCURACY_CASES) {
            for (const hits of HITS_CASES) {
              const misses = totalMisses;
              const penalties = 0;
              const ratingUpdate = computePracticeRating({
                currentRating: rating,
                sessionScore: scoreCase.sessionScore,
                avgRtMs: speedCase.avgRtMs,
                hits,
                misses,
                penalties,
                accuracyPct: accuracy,
              });
              totalBaseEvaluations += 1;

              const baseDelta = Number.isFinite(Number(ratingUpdate?.delta))
                ? Math.round(Number(ratingUpdate.delta))
                : 0;

              for (const difficultyLevel of DIFFICULTY_LEVELS) {
                const multiplier = getPracticeDifficultyMultiplier(difficultyLevel);
                const finalDelta = clamp(Math.round(baseDelta * multiplier), FINAL_DELTA_MIN, FINAL_DELTA_MAX);
                const nextRating = Math.max(0, Math.round(rating + finalDelta));
                const nextTier = getPracticeTier(nextRating).tier;

                if (finalDelta < FINAL_DELTA_MIN || finalDelta > FINAL_DELTA_MAX) {
                  throw new Error(`Delta out of range: rating=${rating}, finalDelta=${finalDelta}`);
                }
                if (nextRating < 0) {
                  throw new Error(`Next rating invalid: rating=${rating}, nextRating=${nextRating}`);
                }

                const signature = buildCaseSignature({
                  scoreBand: scoreCase.band,
                  speedBand: speedCase.band,
                  totalMisses,
                  accuracy,
                  hits,
                  baseDelta,
                  finalDelta,
                });

                const ratingStat = getRatingStat(ratingStats, rating, currentTier, difficultyLevel);
                ratingStat.count += 1;
                ratingStat.sum += finalDelta;
                if (finalDelta < ratingStat.min) {
                  ratingStat.min = finalDelta;
                  ratingStat.worstSignature = signature;
                }
                if (finalDelta > ratingStat.max) {
                  ratingStat.max = finalDelta;
                  ratingStat.bestSignature = signature;
                }
                if (finalDelta > 0) ratingStat.pos += 1;
                else if (finalDelta < 0) ratingStat.neg += 1;
                else ratingStat.zero += 1;

                const tierStat = getTierStat(tierStats, currentTier, difficultyLevel);
                tierStat.count += 1;
                tierStat.sum += finalDelta;
                tierStat.min = Math.min(tierStat.min, finalDelta);
                tierStat.max = Math.max(tierStat.max, finalDelta);
                tierStat.hist[finalDelta + DELTA_BUCKET_OFFSET] += 1;

                if (!difficultyExtremes.has(difficultyLevel)) {
                  difficultyExtremes.set(difficultyLevel, { min: Infinity, max: -Infinity });
                }
                const diffExtremes = difficultyExtremes.get(difficultyLevel);
                diffExtremes.min = Math.min(diffExtremes.min, finalDelta);
                diffExtremes.max = Math.max(diffExtremes.max, finalDelta);

                if (rawStream) {
                  await writeRawRow(rawStream, [
                    rating,
                    currentTier,
                    scoreCase.band,
                    speedCase.band,
                    scoreCase.sessionScore,
                    speedCase.avgRtMs,
                    hits,
                    misses,
                    penalties,
                    accuracy,
                    difficultyLevel,
                    multiplier.toFixed(2),
                    baseDelta,
                    finalDelta,
                    nextRating,
                    nextTier,
                    ratingUpdate.expectedBand,
                    ratingUpdate.band,
                  ]);
                }

                totalEvaluatedRows += 1;
              }
            }
          }
        }
      }
    }
  }

  if (rawStream) {
    rawStream.end();
    await once(rawStream, "finish");
  }

  const ratingSummaryRows = Array.from(ratingStats.values())
    .sort((a, b) => {
      if (a.rating !== b.rating) return a.rating - b.rating;
      return a.difficultyLevel - b.difficultyLevel;
    })
    .map((item) => {
      const avg = item.count > 0 ? item.sum / item.count : 0;
      return [
        item.rating,
        item.tier,
        item.difficultyLevel,
        item.min,
        item.max,
        avg.toFixed(4),
        ((item.pos * 100) / item.count).toFixed(2),
        ((item.neg * 100) / item.count).toFixed(2),
        ((item.zero * 100) / item.count).toFixed(2),
      ];
    });

  const extremesRows = Array.from(ratingStats.values())
    .sort((a, b) => {
      if (a.rating !== b.rating) return a.rating - b.rating;
      return a.difficultyLevel - b.difficultyLevel;
    })
    .map((item) => [
      item.rating,
      item.difficultyLevel,
      item.min,
      item.worstSignature,
      item.max,
      item.bestSignature,
    ]);

  const tierSummaryRows = Array.from(tierStats.values())
    .sort((a, b) => {
      const ta = TIER_ORDER[a.tier] ?? 999;
      const tb = TIER_ORDER[b.tier] ?? 999;
      if (ta !== tb) return ta - tb;
      return a.difficultyLevel - b.difficultyLevel;
    })
    .map((item) => {
      const avg = item.count > 0 ? item.sum / item.count : 0;
      const p10 = percentileFromHist(item.hist, item.count, 10);
      const p50 = percentileFromHist(item.hist, item.count, 50);
      const p90 = percentileFromHist(item.hist, item.count, 90);
      return [
        item.tier,
        item.difficultyLevel,
        item.min,
        item.max,
        avg.toFixed(4),
        p10,
        p50,
        p90,
      ];
    });

  await writeCsv(
    path.join(outDir, "solo-summary-by-rating.csv"),
    [
      "rating",
      "tier",
      "difficulty_level",
      "min_final_delta",
      "max_final_delta",
      "avg_final_delta",
      "positive_pct",
      "negative_pct",
      "zero_pct",
    ],
    ratingSummaryRows,
  );

  await writeCsv(
    path.join(outDir, "solo-summary-by-tier.csv"),
    [
      "tier",
      "difficulty_level",
      "min_final_delta",
      "max_final_delta",
      "avg_final_delta",
      "p10_final_delta",
      "p50_final_delta",
      "p90_final_delta",
    ],
    tierSummaryRows,
  );

  await writeCsv(
    path.join(outDir, "solo-extremes-by-rating.csv"),
    [
      "rating",
      "difficulty_level",
      "worst_final_delta",
      "worst_case_signature",
      "best_final_delta",
      "best_case_signature",
    ],
    extremesRows,
  );

  const diff1Rows = Array.from(ratingStats.values())
    .filter((item) => item.difficultyLevel === 1)
    .map((item) => ({
      rating: item.rating,
      tier: item.tier,
      avgFinalDelta: item.count ? item.sum / item.count : 0,
      min: item.min,
      max: item.max,
    }))
    .sort((a, b) => {
      if (a.avgFinalDelta !== b.avgFinalDelta) return a.avgFinalDelta - b.avgFinalDelta;
      return a.rating - b.rating;
    })
    .slice(0, 10);

  console.log("");
  console.log("Solo RP simulation complete.");
  console.log(`Ratings scanned: ${opts.minRating}..${opts.maxRating} (step ${opts.step})`);
  console.log(`Base evaluations: ${totalBaseEvaluations.toLocaleString()}`);
  console.log(`Total evaluated rows (difficulty-expanded): ${totalEvaluatedRows.toLocaleString()}`);
  console.log(`Reference rows per rating: ${RAW_ROWS_PER_RATING.toLocaleString()}`);
  console.log("");
  console.log("RP delta extremes by difficulty:");
  for (const level of DIFFICULTY_LEVELS) {
    const row = difficultyExtremes.get(level);
    if (!row) continue;
    console.log(`  Lv${level}: min ${row.min}, max ${row.max}`);
  }
  console.log("");
  console.log("Top 10 hardest ratings (lowest avg delta at Lv1):");
  if (opts.pretty && typeof console.table === "function") {
    console.table(
      diff1Rows.map((row) => ({
        rating: row.rating,
        tier: row.tier,
        avg_delta: Number(row.avgFinalDelta.toFixed(4)),
        min: row.min,
        max: row.max,
      })),
    );
  } else {
    for (const row of diff1Rows) {
      console.log(
        `  rating ${row.rating} (${row.tier}): avg ${row.avgFinalDelta.toFixed(4)}, min ${row.min}, max ${row.max}`,
      );
    }
  }
  console.log("");
  console.log(`Output directory: ${outDir}`);
  console.log(`- ${path.join(outDir, "solo-summary-by-rating.csv")}`);
  console.log(`- ${path.join(outDir, "solo-summary-by-tier.csv")}`);
  console.log(`- ${path.join(outDir, "solo-extremes-by-rating.csv")}`);
  if (opts.raw) {
    console.log(`- ${path.join(outDir, "solo-raw-combos.csv")}`);
  }
}

main().catch((error) => {
  console.error("Simulation failed.");
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});

