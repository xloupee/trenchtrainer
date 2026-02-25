-- Ensure player profile rank fields and tier checks match current app logic.

alter table public.player_profiles
add column if not exists practice_rating integer not null default 0,
add column if not exists practice_peak_rating integer not null default 0,
add column if not exists practice_tier text not null default 'UNRANKED',
add column if not exists duel_rating integer not null default 0,
add column if not exists duel_peak_rating integer not null default 0,
add column if not exists duel_tier text not null default 'UNRANKED';

alter table public.player_profiles
  alter column duel_rating set default 0;

alter table public.player_profiles
  alter column duel_peak_rating set default 0;

alter table public.player_profiles
  alter column duel_tier set default 'UNRANKED';

update public.player_profiles
set practice_tier = case
  when coalesce(practice_rating, 0) >= 1000 then 'CHALLENGER'
  when coalesce(practice_rating, 0) >= 850 then 'DIAMOND'
  when coalesce(practice_rating, 0) >= 700 then 'PLATINUM'
  when coalesce(practice_rating, 0) >= 550 then 'GOLD'
  when coalesce(practice_rating, 0) >= 400 then 'SILVER'
  when coalesce(practice_rating, 0) >= 1 then 'BRONZE'
  else 'UNRANKED'
end,
duel_tier = case
  when coalesce(duel_rating, 0) >= 1000 then 'CHALLENGER'
  when coalesce(duel_rating, 0) >= 850 then 'DIAMOND'
  when coalesce(duel_rating, 0) >= 700 then 'PLATINUM'
  when coalesce(duel_rating, 0) >= 550 then 'GOLD'
  when coalesce(duel_rating, 0) >= 400 then 'SILVER'
  when coalesce(duel_rating, 0) >= 1 then 'BRONZE'
  else 'UNRANKED'
end;

do $$
declare
  rec record;
begin
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
    check (duel_tier in ('UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'CHALLENGER'));
end $$;
