# Trenches Trainer

Next.js reaction trainer with 1v1 rooms backed by Supabase.

## Run locally

1. Install deps:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env.local
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

## Supabase setup

Supabase CLI is used for schema migrations in `supabase/migrations`.

1. Initialize/login/link (hosted project):
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   ```
2. Apply migrations to your linked project:
   ```bash
   npx supabase db push
   ```
3. Add keys to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (required for server-side API routes)

### Email verification (production)

If signup shows `Error sending confirmation email`, Supabase Auth SMTP is not configured correctly.

Configure in `Supabase Dashboard -> Authentication -> Settings -> SMTP`:

- Host: `smtp.gmail.com`
- Port: `587`
- Username: `firsttxio@gmail.com`
- Password: Gmail App Password (16 chars, requires 2FA)
- Minimum interval per user: `60` seconds

Then ensure `Authentication -> Providers -> Email -> Confirm email` is enabled.

## Notes

- Current 1v1 tables are intentionally open to `anon` and `authenticated` roles so no-auth room sharing works immediately.
- If you add auth later, tighten RLS policies in `supabase/migrations/20260216214509_duel_tables.sql`.
- The app now includes login/signup UI using Supabase Auth.

## Ranking system (detailed)

This project has two separate ranked tracks:

1. Practice rank (solo mode)
2. Duel rank (1v1 mode)

Both are persisted in `public.player_profiles`.

### High-level behavior

- Practice and Duel do **not** share one rating.
- Each completed Practice session updates Practice RP.
- Each completed Duel match updates Duel RP.
- Profile and top ticker show both:
  - tier name
  - numeric RP

Current implementation files:

- Practice rating logic: `src/components/trenches/lib/practiceRank.js`
- Duel rating logic: `src/components/trenches/lib/duelRank.js`
- Profile update hooks: `src/components/trenches/index.jsx`
- Profile display: `src/components/trenches/screens/ProfileTab.jsx`

### Data model

Added profile fields:

- `practice_rating` (int, default `0`)
- `practice_peak_rating` (int, default `0`)
- `practice_tier` (text, default `UNRANKED`)
- `duel_rating` (int, default `1000`)
- `duel_peak_rating` (int, default `1000`)
- `duel_tier` (text, default `BRONZE`)

Migration:

- `supabase/migrations/20260220213000_player_profile_ratings.sql`

If your database is missing these columns, profile fetch/write now falls back to legacy columns so existing stats still work. However, full rank persistence requires running migrations.

### Practice rank (solo)

Practice uses a weighted session-performance score, then smooths into persistent RP.

#### Inputs per completed session

- `avgRtMs`: average reaction time from that run
- `accuracyPct`: hit accuracy for that run
- `bestRtMs`: best reaction in that run

#### Session score formula

In `computePracticeSessionScore(...)`:

- `speedScore = clamp(1400 - avgRtMs, 0, 1000)`
- `accuracyScore = clamp(accuracyPct * 8, 0, 800)`
- `consistencyBase = 100 - (avgRtMs - bestRtMs) / 10`
- `consistencyBonus = clamp(consistencyBase * 2, 0, 200)`
- `sessionScore = round(0.55*speedScore + 0.35*accuracyScore + 0.10*consistencyBonus)`

Interpretation:

- Speed has the highest influence.
- Accuracy is second most important.
- Consistency is a smaller bonus.

#### Persistent RP update

In `computePracticeRating(...)`:

- If current RP is `0`, new RP = `sessionScore` (first placement behavior)
- Otherwise:
  - `newRP = round(currentRP * 0.85 + sessionScore * 0.15)`

This makes Practice rank stable and less swingy from one outlier run.

#### Practice tiers

In `getPracticeTier(...)`:

- `UNRANKED`: `0`
- `BRONZE`: `1–399`
- `SILVER`: `400–549`
- `GOLD`: `550–699`
- `PLATINUM`: `700–849`
- `DIAMOND`: `850+`

`practice_peak_rating` stores all-time peak RP.

#### Rank-up progress bar

The post-session summary shows:

- RP before/after
- RP delta
- tier change
- points to next tier
- progress percentage within current tier band

Progress percentage is computed from current tier min to next tier min in `getPracticeNextTier(...)`.

### Duel rank (1v1)

Duel uses Elo-style updates with expected-score adjustment.

#### Starting values

- New players start at `1000` RP.
- Minimum duel RP clamp is `100`.

#### K-factor

In `getDuelKFactor(...)`:

- `< 30` matches: `K = 32`
- `>= 30` matches: `K = 20`

This gives faster movement for new players and more stable movement for established players.

#### Elo formula

In `computeDuelRating(...)`:

- Expected score:
  - `E = 1 / (1 + 10^((opp - me)/400))`
- Outcome score:
  - win = `1`
  - draw = `0.5`
  - loss = `0`
- Update:
  - `newRP = round(currentRP + K * (score - E))`
- Clamp final result to minimum `100`.

#### Opponent rating source

Current flow uses `result.oppEstimatedRating` if provided by duel result payload.
If not provided, fallback is a conservative baseline derived from current context (at least `1000`).

#### Duel tiers

In `getDuelTier(...)`:

- `BRONZE`: `< 900`
- `SILVER`: `900–1099`
- `GOLD`: `1100–1299`
- `PLATINUM`: `1300–1499`
- `DIAMOND`: `1500+`

`duel_peak_rating` stores all-time peak RP.

### Where updates happen in app flow

Practice session completion:

- `recordPracticeSession(...)` in `src/components/trenches/index.jsx`
- Updates aggregate practice stats + practice RP fields
- Writes a `player_match_history` row (`mode = practice`, `outcome = session`)

Duel match completion:

- `recordDuelMatch(...)` in `src/components/trenches/index.jsx`
- Updates aggregate duel stats + duel RP fields
- Writes a `player_match_history` row (`mode = 1v1`, outcome win/loss/draw)

### UI surfaces

Top ticker (`src/components/trenches/index.jsx`):

- `PRACTICE: {tier} {rp}`
- `DUEL: {tier} {rp}`

Profile page (`src/components/trenches/screens/ProfileTab.jsx`):

- identity block shows both track tiers + RP
- rank progress text for each track
- KPI cards include Practice RP and Duel RP
- stats sections include rating + peak RP

Practice session summary (`src/components/trenches/ui/shared.jsx`):

- Rank Impact card with delta and progress bar after session sync returns

### Operational notes

1. Apply migrations in each environment:
   ```bash
   npx supabase db push
   ```
2. If ranks are not changing, first verify new columns exist in `player_profiles`.
3. If you intentionally run without new columns temporarily, legacy fallback keeps core stats readable, but full rank persistence is not guaranteed until migration is applied.

### Tuning guide

If ranks feel too hard or too easy:

- Practice progression speed:
  - adjust smoothing `0.85/0.15` in `computePracticeRating(...)`
  - adjust weights in `computePracticeSessionScore(...)`
  - adjust tier thresholds in `PRACTICE_TIERS`

- Duel volatility:
  - adjust K-factor values in `getDuelKFactor(...)`
  - adjust tier thresholds in `DUEL_TIERS`

Keep threshold and formula changes versioned so historical RP behavior is explainable over time.
