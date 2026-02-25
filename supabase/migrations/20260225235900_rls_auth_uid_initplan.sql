-- RLS performance remediation:
-- Use `(select auth.uid())` in policies so Postgres can initialize once per
-- statement instead of re-evaluating `auth.uid()` per row.

drop policy if exists "player_profiles_owner_access" on public.player_profiles;
create policy "player_profiles_owner_access"
on public.player_profiles
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "player_match_history_owner_access" on public.player_match_history;
create policy "player_match_history_owner_access"
on public.player_match_history
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "wager_lobbies_insert_authenticated" on public.wager_lobbies;
create policy "wager_lobbies_insert_authenticated"
on public.wager_lobbies
for insert
to authenticated
with check (host_user_id = (select auth.uid()));

drop policy if exists "wager_lobbies_update_participants" on public.wager_lobbies;
create policy "wager_lobbies_update_participants"
on public.wager_lobbies
for update
to authenticated
using (
  (select auth.uid()) = host_user_id
  or (select auth.uid()) = guest_user_id
)
with check (
  (select auth.uid()) = host_user_id
  or (select auth.uid()) = guest_user_id
);

drop policy if exists "wager_events_insert_authenticated" on public.wager_events;
create policy "wager_events_insert_authenticated"
on public.wager_events
for insert
to authenticated
with check (
  actor_user_id = (select auth.uid())
  or actor_user_id is null
);

drop policy if exists "duel_games_insert_authenticated_host" on public.duel_games;
create policy "duel_games_insert_authenticated_host"
on public.duel_games
for insert
to authenticated
with check (
  host_id = (select auth.uid())::text
  and guest_id is null
);

drop policy if exists "duel_games_update_participants" on public.duel_games;
create policy "duel_games_update_participants"
on public.duel_games
for update
to authenticated
using (
  host_id = (select auth.uid())::text
  or guest_id = (select auth.uid())::text
  or (status = 'waiting' and guest_id is null)
)
with check (
  host_id = (select auth.uid())::text
  or guest_id = (select auth.uid())::text
);

drop policy if exists "duel_games_delete_participants" on public.duel_games;
create policy "duel_games_delete_participants"
on public.duel_games
for delete
to authenticated
using (
  host_id = (select auth.uid())::text
  or guest_id = (select auth.uid())::text
);

drop policy if exists "duel_game_stats_select_participants" on public.duel_game_stats;
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
        g.host_id = (select auth.uid())::text
        or g.guest_id = (select auth.uid())::text
      )
  )
);

drop policy if exists "duel_game_stats_insert_participants" on public.duel_game_stats;
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
        (duel_game_stats.player_role = 'host' and g.host_id = (select auth.uid())::text)
        or (duel_game_stats.player_role = 'guest' and g.guest_id = (select auth.uid())::text)
      )
  )
);

drop policy if exists "duel_game_stats_update_participants" on public.duel_game_stats;
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
        (duel_game_stats.player_role = 'host' and g.host_id = (select auth.uid())::text)
        or (duel_game_stats.player_role = 'guest' and g.guest_id = (select auth.uid())::text)
      )
  )
)
with check (
  exists (
    select 1
    from public.duel_games g
    where g.code = duel_game_stats.game_code
      and (
        (duel_game_stats.player_role = 'host' and g.host_id = (select auth.uid())::text)
        or (duel_game_stats.player_role = 'guest' and g.guest_id = (select auth.uid())::text)
      )
  )
);

drop policy if exists "duel_game_stats_delete_participants" on public.duel_game_stats;
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
        (duel_game_stats.player_role = 'host' and g.host_id = (select auth.uid())::text)
        or (duel_game_stats.player_role = 'guest' and g.guest_id = (select auth.uid())::text)
      )
  )
);
