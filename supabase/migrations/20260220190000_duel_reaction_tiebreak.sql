alter table public.duel_game_stats
add column if not exists reaction_sum_ms bigint not null default 0,
add column if not exists reaction_count integer not null default 0;

create index if not exists duel_game_stats_reaction_idx
on public.duel_game_stats (game_code, reaction_count, reaction_sum_ms);
