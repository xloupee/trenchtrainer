alter function public.set_updated_at() set search_path = pg_catalog;
alter function public.set_wager_updated_at() set search_path = pg_catalog;

drop policy if exists "duel_games_open_access" on public.duel_games;
drop policy if exists "duel_games_select_authenticated" on public.duel_games;
drop policy if exists "duel_games_insert_authenticated_host" on public.duel_games;
drop policy if exists "duel_games_update_participants" on public.duel_games;
drop policy if exists "duel_games_delete_participants" on public.duel_games;

create policy "duel_games_select_authenticated"
on public.duel_games
for select
to authenticated
using (true);

create policy "duel_games_insert_authenticated_host"
on public.duel_games
for insert
to authenticated
with check (
  host_id = auth.uid()::text
  and guest_id is null
);

create policy "duel_games_update_participants"
on public.duel_games
for update
to authenticated
using (
  host_id = auth.uid()::text
  or guest_id = auth.uid()::text
  or (status = 'waiting' and guest_id is null)
)
with check (
  host_id = auth.uid()::text
  or guest_id = auth.uid()::text
);

create policy "duel_games_delete_participants"
on public.duel_games
for delete
to authenticated
using (
  host_id = auth.uid()::text
  or guest_id = auth.uid()::text
);

drop policy if exists "duel_game_stats_open_access" on public.duel_game_stats;
drop policy if exists "duel_game_stats_select_participants" on public.duel_game_stats;
drop policy if exists "duel_game_stats_insert_participants" on public.duel_game_stats;
drop policy if exists "duel_game_stats_update_participants" on public.duel_game_stats;
drop policy if exists "duel_game_stats_delete_participants" on public.duel_game_stats;

create policy "duel_game_stats_select_participants"
on public.duel_game_stats
for select
to authenticated
using (
  exists (
    select 1
    from public.duel_games g
    where g.code = duel_game_stats.game_code
      and (
        g.host_id = auth.uid()::text
        or g.guest_id = auth.uid()::text
      )
  )
);

create policy "duel_game_stats_insert_participants"
on public.duel_game_stats
for insert
to authenticated
with check (
  exists (
    select 1
    from public.duel_games g
    where g.code = duel_game_stats.game_code
      and (
        (duel_game_stats.player_role = 'host' and g.host_id = auth.uid()::text)
        or (duel_game_stats.player_role = 'guest' and g.guest_id = auth.uid()::text)
      )
  )
);

create policy "duel_game_stats_update_participants"
on public.duel_game_stats
for update
to authenticated
using (
  exists (
    select 1
    from public.duel_games g
    where g.code = duel_game_stats.game_code
      and (
        (duel_game_stats.player_role = 'host' and g.host_id = auth.uid()::text)
        or (duel_game_stats.player_role = 'guest' and g.guest_id = auth.uid()::text)
      )
  )
)
with check (
  exists (
    select 1
    from public.duel_games g
    where g.code = duel_game_stats.game_code
      and (
        (duel_game_stats.player_role = 'host' and g.host_id = auth.uid()::text)
        or (duel_game_stats.player_role = 'guest' and g.guest_id = auth.uid()::text)
      )
  )
);

create policy "duel_game_stats_delete_participants"
on public.duel_game_stats
for delete
to authenticated
using (
  exists (
    select 1
    from public.duel_games g
    where g.code = duel_game_stats.game_code
      and (
        (duel_game_stats.player_role = 'host' and g.host_id = auth.uid()::text)
        or (duel_game_stats.player_role = 'guest' and g.guest_id = auth.uid()::text)
      )
  )
);

revoke all on table public.duel_games from anon;
revoke all on table public.duel_game_stats from anon;
grant select, insert, update, delete on table public.duel_games to authenticated;
grant select, insert, update, delete on table public.duel_game_stats to authenticated;
