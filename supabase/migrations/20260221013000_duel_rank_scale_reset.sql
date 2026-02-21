-- Reset duel ranking onto the same RP scale as solo.
-- Duel remains outcome-based (win/loss), but starts from 0 RP with shared tiers.

do $$
declare
  rec record;
  has_history_duel_tier boolean;
begin
  -- Ensure profile duel tier check includes UNRANKED.
  for rec in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.player_profiles'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%duel_tier%'
  loop
    execute format('alter table public.player_profiles drop constraint %I', rec.conname);
  end loop;

  alter table public.player_profiles
    add constraint player_profiles_duel_tier_check
    check (duel_tier in ('UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'CHALLENGER'));

  -- If a duel_tier exists on history rows, align it too.
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'player_match_history'
      and column_name = 'duel_tier'
  ) into has_history_duel_tier;

  if has_history_duel_tier then
    for rec in
      select c.conname
      from pg_constraint c
      where c.conrelid = 'public.player_match_history'::regclass
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ilike '%duel_tier%'
    loop
      execute format('alter table public.player_match_history drop constraint %I', rec.conname);
    end loop;

    alter table public.player_match_history
      add constraint player_match_history_duel_tier_check
      check (duel_tier in ('UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'CHALLENGER'));

    update public.player_match_history
    set duel_tier = 'UNRANKED'
    where mode = '1v1';
  end if;
end $$;

update public.player_profiles
set
  duel_rating = 0,
  duel_peak_rating = 0,
  duel_tier = 'UNRANKED';

alter table public.player_profiles
  alter column duel_rating set default 0;

alter table public.player_profiles
  alter column duel_peak_rating set default 0;

alter table public.player_profiles
  alter column duel_tier set default 'UNRANKED';

-- Prevent legacy 1000-scale duel rating history from being used for recovery.
update public.player_match_history
set
  rating_before = null,
  rating_after = null,
  rating_delta = null
where mode = '1v1';
