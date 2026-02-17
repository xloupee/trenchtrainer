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

## Notes

- Current 1v1 tables are intentionally open to `anon` and `authenticated` roles so no-auth room sharing works immediately.
- If you add auth later, tighten RLS policies in `supabase/migrations/20260216214509_duel_tables.sql`.
- The app now includes login/signup UI using Supabase Auth (`email + password`).
