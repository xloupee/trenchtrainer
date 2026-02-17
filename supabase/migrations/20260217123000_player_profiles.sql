create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  practice_sessions integer not null default 0,
  practice_rounds integer not null default 0,
  practice_hits integer not null default 0,
  practice_misses integer not null default 0,
  practice_penalties integer not null default 0,
  practice_best_time integer,
  practice_best_streak integer not null default 0,
  duel_matches integer not null default 0,
  duel_wins integer not null default 0,
  duel_losses integer not null default 0,
  duel_draws integer not null default 0,
  duel_score_for integer not null default 0,
  duel_score_against integer not null default 0,
  duel_best_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_player_profiles_updated_at on public.player_profiles;
create trigger set_player_profiles_updated_at
before update on public.player_profiles
for each row execute function public.set_updated_at();

alter table public.player_profiles enable row level security;

drop policy if exists "player_profiles_owner_access" on public.player_profiles;
create policy "player_profiles_owner_access"
on public.player_profiles
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on table public.player_profiles to authenticated;
