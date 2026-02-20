-- Promote CHALLENGER to a real top tier for both Solo and Duel.
-- Solo CHALLENGER starts at 1000 RP.
-- Duel CHALLENGER starts at 1700 RP.

update public.player_profiles
set practice_tier = case
  when practice_rating >= 1000 then 'CHALLENGER'
  when practice_rating >= 850 then 'DIAMOND'
  when practice_rating >= 700 then 'PLATINUM'
  when practice_rating >= 550 then 'GOLD'
  when practice_rating >= 400 then 'SILVER'
  when practice_rating >= 1 then 'BRONZE'
  else 'UNRANKED'
end;

update public.player_profiles
set duel_tier = case
  when duel_rating >= 1700 then 'CHALLENGER'
  when duel_rating >= 1500 then 'DIAMOND'
  when duel_rating >= 1300 then 'PLATINUM'
  when duel_rating >= 1100 then 'GOLD'
  when duel_rating >= 900 then 'SILVER'
  else 'BRONZE'
end;

do $$
declare
  rec record;
  has_history_practice_tier boolean;
  has_history_duel_tier boolean;
begin
  -- Replace any existing profile tier checks so CHALLENGER is accepted.
  for rec in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.player_profiles'::regclass
      and c.contype = 'c'
      and (
        pg_get_constraintdef(c.oid) ilike '%practice_tier%'
        or pg_get_constraintdef(c.oid) ilike '%duel_tier%'
      )
  loop
    execute format('alter table public.player_profiles drop constraint %I', rec.conname);
  end loop;

  alter table public.player_profiles
    add constraint player_profiles_practice_tier_check
    check (practice_tier in ('UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'CHALLENGER'));

  alter table public.player_profiles
    add constraint player_profiles_duel_tier_check
    check (duel_tier in ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'CHALLENGER'));

  -- If history tier columns exist, backfill and update checks there too.
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'player_match_history'
      and column_name = 'practice_tier'
  ) into has_history_practice_tier;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'player_match_history'
      and column_name = 'duel_tier'
  ) into has_history_duel_tier;

  if has_history_practice_tier then
    execute $sql$
      update public.player_match_history
      set practice_tier = case
        when coalesce(rating_after, rating_before, 0) >= 1000 then 'CHALLENGER'
        when coalesce(rating_after, rating_before, 0) >= 850 then 'DIAMOND'
        when coalesce(rating_after, rating_before, 0) >= 700 then 'PLATINUM'
        when coalesce(rating_after, rating_before, 0) >= 550 then 'GOLD'
        when coalesce(rating_after, rating_before, 0) >= 400 then 'SILVER'
        when coalesce(rating_after, rating_before, 0) >= 1 then 'BRONZE'
        else 'UNRANKED'
      end
      where mode in ('solo', 'practice');
    $sql$;
  end if;

  if has_history_duel_tier then
    execute $sql$
      update public.player_match_history
      set duel_tier = case
        when coalesce(rating_after, rating_before, 1000) >= 1700 then 'CHALLENGER'
        when coalesce(rating_after, rating_before, 1000) >= 1500 then 'DIAMOND'
        when coalesce(rating_after, rating_before, 1000) >= 1300 then 'PLATINUM'
        when coalesce(rating_after, rating_before, 1000) >= 1100 then 'GOLD'
        when coalesce(rating_after, rating_before, 1000) >= 900 then 'SILVER'
        else 'BRONZE'
      end
      where mode = '1v1';
    $sql$;
  end if;

  if has_history_practice_tier or has_history_duel_tier then
    for rec in
      select c.conname
      from pg_constraint c
      where c.conrelid = 'public.player_match_history'::regclass
        and c.contype = 'c'
        and (
          pg_get_constraintdef(c.oid) ilike '%practice_tier%'
          or pg_get_constraintdef(c.oid) ilike '%duel_tier%'
        )
    loop
      execute format('alter table public.player_match_history drop constraint %I', rec.conname);
    end loop;
  end if;

  if has_history_practice_tier then
    alter table public.player_match_history
      add constraint player_match_history_practice_tier_check
      check (practice_tier in ('UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'CHALLENGER'));
  end if;

  if has_history_duel_tier then
    alter table public.player_match_history
      add constraint player_match_history_duel_tier_check
      check (duel_tier in ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'CHALLENGER'));
  end if;
end $$;
