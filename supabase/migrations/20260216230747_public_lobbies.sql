alter table public.duel_games
add column if not exists is_public boolean not null default false;

create index if not exists duel_games_public_waiting_idx
on public.duel_games (is_public, status, created_at desc);
