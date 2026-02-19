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
   - `SUPABASE_SERVICE_ROLE_KEY` (required for admin code API route)
   - `DASHBOARD_KEY` (shared secret for `/dashboard`)

## Notes

- Current 1v1 tables are intentionally open to `anon` and `authenticated` roles so no-auth room sharing works immediately.
- If you add auth later, tighten RLS policies in `supabase/migrations/20260216214509_duel_tables.sql`.
- The app now includes login/signup UI using Supabase Auth (`email + password`).

## Invite-only signup codes

Signup now requires a one-time access code and enforcement happens in Supabase (not just frontend).
Login also requires an access code that matches the code consumed by that account.

After running migrations, create codes in Supabase SQL editor:

```sql
insert into public.signup_access_codes (code, note)
values
  ('ALPHA001', 'founder batch'),
  ('ALPHA002', 'founder batch');
```

Inspect unused codes:

```sql
select code, note, created_at
from public.signup_access_codes
where consumed_at is null
order by created_at desc;
```

Inspect consumed codes:

```sql
select code, note, consumed_at, consumed_by
from public.signup_access_codes
where consumed_at is not null
order by consumed_at desc;
```

### Dashboard for code management

You can create/revoke codes from the app at `/dashboard`.

Requirements:
- Be logged in to the app.
- Provide `DASHBOARD_KEY` in the page input.

The page supports:
- Listing current codes
- Creating new unused one-time codes
- Revoking unused codes
