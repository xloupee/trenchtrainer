create table if not exists public.duel_games (
  code text primary key,
  host_id text,
  host_name text,
  guest_id text,
  guest_name text,
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'countdown', 'playing', 'finished')),
  seed bigint,
  best_of integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.duel_game_stats (
  game_code text not null references public.duel_games(code) on delete cascade,
  player_role text not null check (player_role in ('host', 'guest')),
  score integer not null default 0,
  streak integer not null default 0,
  best_time integer,
  hits integer not null default 0,
  misses integer not null default 0,
  last_time integer,
  round_num integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (game_code, player_role)
);

create index if not exists duel_games_status_idx on public.duel_games (status);
create index if not exists duel_game_stats_game_code_idx on public.duel_game_stats (game_code);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_duel_games_updated_at on public.duel_games;
create trigger set_duel_games_updated_at
before update on public.duel_games
for each row execute function public.set_updated_at();

drop trigger if exists set_duel_game_stats_updated_at on public.duel_game_stats;
create trigger set_duel_game_stats_updated_at
before update on public.duel_game_stats
for each row execute function public.set_updated_at();

alter table public.duel_games enable row level security;
alter table public.duel_game_stats enable row level security;

drop policy if exists "duel_games_open_access" on public.duel_games;
create policy "duel_games_open_access"
on public.duel_games
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "duel_game_stats_open_access" on public.duel_game_stats;
create policy "duel_game_stats_open_access"
on public.duel_game_stats
for all
to anon, authenticated
using (true)
with check (true);

grant select, insert, update, delete on table public.duel_games to anon, authenticated;
grant select, insert, update, delete on table public.duel_game_stats to anon, authenticated;
