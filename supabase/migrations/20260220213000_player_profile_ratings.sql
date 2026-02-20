alter table public.player_profiles
add column if not exists practice_rating integer not null default 0,
add column if not exists practice_peak_rating integer not null default 0,
add column if not exists practice_tier text not null default 'UNRANKED',
add column if not exists duel_rating integer not null default 1000,
add column if not exists duel_peak_rating integer not null default 1000,
add column if not exists duel_tier text not null default 'BRONZE';

update public.player_profiles
set practice_tier = case
  when practice_rating >= 850 then 'DIAMOND'
  when practice_rating >= 700 then 'PLATINUM'
  when practice_rating >= 550 then 'GOLD'
  when practice_rating >= 400 then 'SILVER'
  when practice_rating >= 1 then 'BRONZE'
  else 'UNRANKED'
end
where practice_tier is null
   or practice_tier = ''
   or practice_tier not in ('UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

update public.player_profiles
set duel_tier = case
  when duel_rating >= 1500 then 'DIAMOND'
  when duel_rating >= 1300 then 'PLATINUM'
  when duel_rating >= 1100 then 'GOLD'
  when duel_rating >= 900 then 'SILVER'
  else 'BRONZE'
end
where duel_tier is null
   or duel_tier = ''
   or duel_tier not in ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');
