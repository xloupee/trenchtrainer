alter table public.player_profiles
drop constraint if exists player_profiles_preferred_mode_check;

alter table public.player_profiles
add constraint player_profiles_preferred_mode_check
check (preferred_mode in ('solo', 'practice', '1v1', 'profile'));

alter table public.player_profiles
alter column preferred_mode set default 'solo';

update public.player_profiles
set preferred_mode = 'solo'
where preferred_mode = 'practice';

alter table public.player_match_history
drop constraint if exists player_match_history_mode_check;

alter table public.player_match_history
add constraint player_match_history_mode_check
check (mode in ('solo', 'practice', '1v1'));

alter table public.player_match_history
alter column mode set default 'solo';

update public.player_match_history
set mode = 'solo'
where mode = 'practice';
