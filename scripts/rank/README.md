# Solo RP Simulator Guide

This document explains how the Solo RP simulator works, what it outputs, and how to use it.

## File + Command

- Script: `scripts/rank/simulate-solo-rp.mjs`
- NPM command: `npm run rank:sim:solo -- [flags]`

Example:

```bash
npm run rank:sim:solo -- --min-rating 0 --max-rating 1200 --step 1
```

## What This Simulator Solves

The Solo rating system depends on multiple inputs (score band, speed, misses, accuracy, hits, difficulty multiplier, tier penalty multiplier).
Instead of testing manually in-game, this script sweeps combinations and gives you:

- min/max RP change at each rating
- average RP change per rating and per tier
- positive vs negative outcome ratios
- worst/best-case signatures for each rating

## “All Outcomes” Meaning in This Script

Solo has continuous inputs in theory, so truly infinite outcomes are impossible to enumerate directly.
This simulator defines **all outcomes** as **all important discrete branch combinations** that hit rating logic branches.

It iterates:

- Score band targets: `UNDER, BRONZE, SILVER, GOLD, PLAT, DIAMOND, CHALLENGER`
- Speed band targets: `CHALLENGER, PLAT, GOLD, SILVER, BRONZE, UNDER`
- Miss buckets: `0..5`
- Accuracy cases: `0, 10, 20, 30, 40, 50, 60, 80, 81, 85, 90, 95, 100`
- Hits cases: `3` and `8`
- Difficulty levels: `1, 3, 5, 7, 10`

## How RP Is Calculated (Script Mirrors App)

For each rating + branch case:

1. Calls `computePracticeRating(...)` from `src/components/trenches/lib/practiceRank.js` to get `baseDelta`.
2. Applies Solo difficulty multiplier from `getPracticeDifficultyMultiplier(level)`.
3. Applies tier-aware Solo anti-farming penalty from `getSoloTierDifficultyPenaltyMultiplier({ currentRating, difficultyLevel })`.
4. Computes final delta exactly like app flow:
   - `effectiveMultiplier = difficultyMultiplier * tierPenaltyMultiplier`
   - `finalDelta = clamp(round(baseDelta * effectiveMultiplier), -35, 55)`
5. Computes:
   - `nextRating = max(0, currentRating + finalDelta)`
   - `nextTier = getPracticeTier(nextRating).tier`

This keeps script behavior aligned with production RP logic.

## CLI Flags

- `--min-rating <int>` default: `0`
- `--max-rating <int>` default: `1200`
- `--step <int>` default: `1`
- `--out-dir <path>` default: `out/rank-sim/solo`
- `--raw` include exhaustive branch rows in `solo-raw-combos.csv`
- `--pretty` print the “hardest ratings” table using `console.table` when available

Validation rules:

- `--step >= 1`
- `--min-rating >= 0`
- `--max-rating >= --min-rating`

## Output Files

By default:

1. `solo-summary-by-rating.csv`
2. `solo-summary-by-tier.csv`
3. `solo-extremes-by-rating.csv`

With `--raw`:

4. `solo-raw-combos.csv`

### 1) `solo-summary-by-rating.csv`

Columns:

- `rating`
- `tier`
- `difficulty_level`
- `min_final_delta`
- `max_final_delta`
- `avg_final_delta`
- `positive_pct`
- `negative_pct`
- `zero_pct`

Use this to inspect how a specific rating behaves.

### 2) `solo-summary-by-tier.csv`

Columns:

- `tier`
- `difficulty_level`
- `min_final_delta`
- `max_final_delta`
- `avg_final_delta`
- `p10_final_delta`
- `p50_final_delta`
- `p90_final_delta`

Use this to compare tiers at a glance.

### 3) `solo-extremes-by-rating.csv`

Columns:

- `rating`
- `difficulty_level`
- `worst_final_delta`
- `worst_case_signature`
- `best_final_delta`
- `best_case_signature`

`*_case_signature` shows the branch combination that created that extreme:

```text
score=GOLD|speed=CHALLENGER|miss=0|acc=90|hits=8|base=39|dMult=0.50|tierPen=0.65|eff=0.33|final=13
```

### 4) `solo-raw-combos.csv` (optional)

Columns:

- `current_rating`
- `current_tier`
- `score_band_target`
- `speed_band_target`
- `session_score_input`
- `avg_rt_ms_input`
- `hits_input`
- `misses_input`
- `penalties_input`
- `accuracy_input`
- `difficulty_level`
- `difficulty_multiplier`
- `tier_penalty_multiplier`
- `effective_multiplier`
- `base_delta`
- `final_delta`
- `next_rating`
- `next_tier`
- `expected_band`
- `computed_band`

Use this for full branch-level debugging.

## Row Count + Runtime Expectations

Per rating, raw branch rows =:

```text
7 score bands
x 6 speed bands
x 6 miss buckets
x 13 accuracy points
x 2 hit states
x 5 difficulty levels
= 32,760 rows per rating
```

So full `0..1200` with step `1` can be large with `--raw`.

Tip:

- Use defaults without `--raw` for fast analysis.
- Use `--raw` only when investigating specific anomalies.

## Practical Examples

### Quick smoke run

```bash
npm run rank:sim:solo -- --max-rating 25
```

### Full range summary (no raw)

```bash
npm run rank:sim:solo -- --min-rating 0 --max-rating 1200 --step 1
```

### Focus on mid ladder only

```bash
npm run rank:sim:solo -- --min-rating 350 --max-rating 900 --step 1
```

### Coarser pass for speed

```bash
npm run rank:sim:solo -- --min-rating 0 --max-rating 1200 --step 5
```

### Full forensic dump

```bash
npm run rank:sim:solo -- --min-rating 0 --max-rating 200 --step 1 --raw --out-dir out/rank-sim/solo-deep
```

### Pretty terminal table

```bash
npm run rank:sim:solo -- --max-rating 100 --pretty
```

## Reading Console Summary

At run end, the script prints:

- scanned rating range
- base evaluations count
- difficulty-expanded row count
- per-difficulty min/max RP deltas
- top 10 hardest ratings (lowest average delta at difficulty 1)
- output file paths

## Troubleshooting

### Unknown argument

You passed a flag the script does not support.
Use only documented flags above.

### `--max-rating must be >= --min-rating`

Swap values or adjust range.

### Very slow or huge output

- remove `--raw`
- reduce range
- increase `--step` (e.g. `5`)

## Notes for Future Extensions

If you later add Duel/Endless simulation:

- keep this script as Solo-only for clarity, or
- add mode switch flags and mode-specific output files.

Either way, continue importing rating logic from source modules directly so simulation stays in sync with app logic.
