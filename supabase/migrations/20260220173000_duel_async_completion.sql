alter table public.duel_game_stats
add column if not exists is_done boolean not null default false,
add column if not exists done_at timestamptz;

alter table public.duel_games
add column if not exists started_at timestamptz,
add column if not exists timeout_at timestamptz,
add column if not exists finished_at timestamptz;

create index if not exists duel_game_stats_done_idx
on public.duel_game_stats (game_code, is_done, done_at desc);

create index if not exists duel_games_timeout_idx
on public.duel_games (status, timeout_at);
