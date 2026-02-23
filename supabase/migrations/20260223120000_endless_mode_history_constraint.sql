alter table public.player_match_history
drop constraint if exists player_match_history_mode_check;

alter table public.player_match_history
add constraint player_match_history_mode_check
check (mode in ('solo', 'practice', '1v1', 'endless'));
